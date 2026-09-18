'use client'

/**
 * AuthContext — 前端认证状态管理
 *
 * 提供 user/token 状态、login/logout 方法，
 * 以及自动注入 Authorization header 的 authFetch。
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

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
  mustChangePassword?: number
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  /** 学生登录：学号 + 密码 → POST /api/auth/login */
  loginStudent: (studentId: string, password: string) => Promise<LoginResult>
  /** 管理员登录：邮箱 + 密码 → POST /api/auth/admin-login */
  loginAdmin: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化：靠 httpOnly Cookie 恢复会话（不再读 localStorage，防 XSS 盗用）
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          setToken(null)
          setUser(null)
        }
      })
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const doLogin = useCallback(async (url: string, body: Record<string, string>) => {
    try {
      const res = await fetch(url, {
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
      setToken(data.token ?? null)
      setUser(data.user)
      return { mustChangePassword: data.user?.mustChangePassword ?? 0 }
    } catch {
      return { error: '网络错误，请重试' }
    }
  }, [])

  const loginStudent = useCallback(
    (studentId: string, password: string) => doLogin('/api/auth/login', { studentId, password }),
    [doLogin]
  )

  const loginAdmin = useCallback(
    (email: string, password: string) => doLogin('/api/auth/admin-login', { email, password }),
    [doLogin]
  )

  const logout = useCallback(() => {
    // 通知服务端清除 httpOnly Cookie（失败也继续清理本地状态）
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setToken(null)
    setUser(null)
  }, [])

  // 带认证的 fetch 封装（Cookie 自动随 same-origin 请求发送，内存 token 做 header 兜底）
  // 服务端强制改密（403 + mustChangePassword）时直接跳改密页
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    const response = await fetch(url, { ...options, headers, credentials: 'include' })
    if (response.status === 403 && !url.includes('/api/auth/')) {
      try {
        const body = await response.clone().json()
        if (body?.mustChangePassword === 1 && typeof window !== 'undefined') {
          window.location.replace('/change-password')
        }
      } catch { /* 非 JSON 直接忽略 */ }
    }
    return response
  }, [token])

  // 刷新当前用户信息
  const refreshUser = useCallback(async () => {
    try {
      const headers = new Headers()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      const res = await fetch('/api/auth/me', { headers, credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch {
      // ignore
    }
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginStudent, loginAdmin, logout, authFetch, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
