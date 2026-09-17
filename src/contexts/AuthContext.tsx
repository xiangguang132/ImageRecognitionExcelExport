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
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        return { error: data.error || '登录失败' }
      }

      // Token 已由服务端写入 httpOnly Cookie；内存中保留一份用于 Authorization header 兜底，
      // 不再写入 localStorage。刷新页面后靠 Cookie 会话恢复。
      setToken(data.token ?? null)
      setUser(data.user)
      return {}
    } catch {
      return { error: '网络错误，请重试' }
    }
  }, [])

  const logout = useCallback(() => {
    // 通知服务端清除 httpOnly Cookie（失败也继续清理本地状态）
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setToken(null)
    setUser(null)
  }, [])

  // 带认证的 fetch 封装（Cookie 自动随 same-origin 请求发送，内存 token 做 header 兜底）
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(url, { ...options, headers, credentials: 'include' })
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
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, authFetch, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
