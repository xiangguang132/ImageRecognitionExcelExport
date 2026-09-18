'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/components/ui/Toast'

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, isLoading, authFetch, refreshUser } = useAuth()
  const router = useRouter()

  // 未登录则回登录页；管理员（虚拟账号）密码由 .env 管理，无需改密
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else if (user.role === 'admin') {
      router.replace('/')
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!oldPassword) {
      setError('请输入原密码（初始密码为 123456）')
      return
    }
    if (newPassword.length < 6) {
      setError('新密码长度至少 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    if (oldPassword === newPassword) {
      setError('新密码不能与原密码相同')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '修改失败')
        toast.error(data.error || '修改失败')
        return
      }
      toast.success('密码修改成功')
      await refreshUser()
      router.replace('/')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !user || user.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            首次登录请修改密码
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            初始密码为 123456，修改后方可使用系统
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                原密码
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                placeholder="初始密码为 123456"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                新密码（至少 6 位）
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                placeholder="请输入新密码"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                确认新密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                placeholder="请再次输入新密码"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-300
                ${isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-700 hover:via-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/25'}`}
            >
              {isSubmitting ? '提交中...' : '确认修改'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
