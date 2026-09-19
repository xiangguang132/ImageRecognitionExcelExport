'use client'

/**
 * AuthContext — 前端认证状态管理
 *
 * 提供 user/token 状态、login/logout 方法，
 * 以及自动注入 Authorization header 的 authFetch。
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from '@/lib/api-path'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: string
  studentId?: string | null
  mustChangePassword?: number
}

interface LoginResult {
  error?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  /** 管理员登录：邮箱 + 密码 → POST /api/auth/admin-login */
  loginAdmin: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 登录代际：初始 /me 请求若在某次登录成功之后才返回，其 401 不能覆盖已登录的用户，
  // 否则会出现「登录成功跳走又被弹回」的竞态
  const loginEpochRef = useState(() => ({ value: 0 }))[0]

  // 初始化：靠 httpOnly Cookie 恢复会话（不再读 localStorage，防 XSS 盗用）
  // 注意：该请求可能在用户手动登录之后才返回，此时其 401/失败不能清空已登录态
  useEffect(() => {
    const epoch = loginEpochRef.value
    let cancelled = false
    fetch(api('/api/auth/me'), { credentials: 'include' })
      .then(async (res) => {
        if (cancelled || loginEpochRef.value !== epoch) return
        if (res.ok) {
          const data = await res.json()
          if (cancelled || loginEpochRef.value !== epoch) return
          setUser(data.user)
        } else {
          setToken(null)
          setUser(null)
        }
      })
      .catch(() => {
        if (cancelled || loginEpochRef.value !== epoch) return
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (!cancelled && loginEpochRef.value === epoch) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [loginEpochRef])

  const doLogin = useCallback(async (url: string, body: Record<string, string>) => {
    try {
      const res = await fetch(api(url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        return { error: data.error || '登录失败' }
      }

      // Token 已由服务端写入 httpOnly Cookie；内存中保留一份用于 Authorization header 兜底，
      // 不再写入 localStorage。刷新页面后靠 Cookie 会话恢复。
      loginEpochRef.value += 1
      setToken(data.token ?? null)
      setUser(data.user)
      return {}
    } catch {
      return { error: '网络错误，请重试' }
    }
  }, [loginEpochRef])

  const loginAdmin = useCallback(
    (email: string, password: string) => doLogin('/api/auth/admin-login', { email, password }),
    [doLogin]
  )

  const logout = useCallback(() => {
    // 通知服务端清除 httpOnly Cookie（失败也继续清理本地状态）
    fetch(api('/api/auth/logout'), { method: 'POST', credentials: 'include' }).catch(() => {})
    setToken(null)
    setUser(null)
  }, [])

  // 带认证的 fetch 封装（Cookie 自动随 same-origin 请求发送，内存 token 做 header 兜底）
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(api(url), { ...options, headers, credentials: 'include' })
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginAdmin, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
