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

  // 初始化：从 localStorage 恢复 token 并验证
  useEffect(() => {
    const stored = localStorage.getItem('auth_token')
    if (stored) {
      setToken(stored)
      // 验证 token
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${stored}` }
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
          } else {
            // token 无效，清除
            localStorage.removeItem('auth_token')
            setToken(null)
            setUser(null)
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
          setToken(null)
          setUser(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        return { error: data.error || '登录失败' }
      }

      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUser(data.user)
      return {}
    } catch {
      return { error: '网络错误，请重试' }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }, [])

  // 带认证的 fetch 封装
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(url, { ...options, headers })
  }, [token])

  // 刷新当前用户信息
  const refreshUser = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
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
