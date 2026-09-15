'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Modal from '@/components/ui/Modal'
import Toast, { toast } from '@/components/ui/Toast'

interface UserItem {
  id: number
  email: string
  name: string
  role: string
  createdAt: string
}

export default function AdminUsersPage() {
  const { user, isLoading: authLoading, authFetch, logout } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 查看详情
  const [viewingUser, setViewingUser] = useState<UserItem | null>(null)

  // 编辑用户
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({ email: '', name: '', role: 'user', password: '' })
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 新增用户表单
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newRole, setNewRole] = useState('user')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // 权限检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
    if (!authLoading && user && user.role !== 'admin') {
      router.replace('/')
    }
  }, [authLoading, user, router])

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/users')
      if (response.ok) {
        const result = await response.json()
        setUsers(result.data)
        setTotalCount(result.totalCount)
      } else if (response.status === 401) {
        logout()
        router.replace('/login')
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [authFetch, logout, router])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user, fetchUsers])

  // 新增用户
  const handleAddUser = async () => {
    if (!newEmail.trim() || !newName.trim() || !newPassword) {
      toast.error('请填写完整信息')
      return
    }
    if (newPassword.length < 6) {
      toast.error('密码长度至少 6 位')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim(),
          password: newPassword,
          role: newRole
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '创建失败')
      }

      toast.success('用户创建成功')
      setShowAddModal(false)
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      setShowNewPassword(false)
      setNewRole('user')
      await fetchUsers()
    } catch (error: any) {
      toast.error(error?.message || '创建用户失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除用户
  const handleDeleteClick = (id: number) => {
    setPendingDeleteId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return

    setShowDeleteModal(false)
    setDeletingId(pendingDeleteId)
    try {
      const response = await authFetch(`/api/admin/users/${pendingDeleteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '删除失败')
      }

      toast.success('删除成功')
      await fetchUsers()
    } catch (error: any) {
      toast.error(error?.message || '删除用户失败')
    } finally {
      setDeletingId(null)
      setPendingDeleteId(null)
    }
  }

  // 编辑用户
  const handleEditClick = (u: UserItem) => {
    setEditingUser(u)
    setEditForm({ email: u.email, name: u.name, role: u.role, password: '' })
    setShowEditPassword(false)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    if (!editForm.email.trim() || !editForm.name.trim()) {
      toast.error('邮箱和姓名不能为空')
      return
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('密码长度至少 6 位')
      return
    }

    setIsSaving(true)
    try {
      const body: Record<string, any> = {
        email: editForm.email.trim(),
        name: editForm.name.trim(),
        role: editForm.role
      }
      if (editForm.password) {
        body.password = editForm.password
      }

      const response = await authFetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '更新失败')
      }

      toast.success('用户信息更新成功')
      setEditingUser(null)
      await fetchUsers()
    } catch (error: any) {
      toast.error(error?.message || '更新用户失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 加载中
  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 背景装饰 */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-50/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
      </div>

      {/* 头部 */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">用户管理</h1>
              <p className="text-[11px] font-medium text-slate-500">管理系统用户账号和权限</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="退出登录"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-black text-slate-800 tracking-tighter">
              {users.length}
            </div>
            <div className="text-xs font-medium text-slate-500 border-l border-slate-200 pl-2">
              用户总数
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-0.5 hover:shadow-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增用户
          </button>
        </div>

        {/* 用户列表 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="font-medium">暂无用户数据</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-bold tracking-wider">姓名</th>
                  <th className="px-5 py-3 font-bold tracking-wider">邮箱</th>
                  <th className="px-5 py-3 font-bold tracking-wider">角色</th>
                  <th className="px-5 py-3 font-bold tracking-wider">创建时间</th>
                  <th className="px-5 py-3 font-bold tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {(u.name || '?')[0]}
                        </div>
                        <span className="font-semibold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${u.role === 'admin'
                          ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200/50'
                          : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/50'}`}>
                        {u.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 font-medium text-xs whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 查看详情 */}
                        <button
                          onClick={() => setViewingUser(u)}
                          className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-all"
                          title="查看详情"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* 编辑 */}
                        <button
                          onClick={() => handleEditClick(u)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                          title="编辑用户"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* 删除 */}
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteClick(u.id)}
                            disabled={deletingId === u.id}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all disabled:opacity-50"
                            title="删除用户"
                          >
                            {deletingId === u.id ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ========== 查看详情弹窗 ========== */}
      <Modal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        title="用户详情"
        cancelText="关闭"
      >
        {viewingUser && (
          <div className="space-y-4">
            {/* 头部：头像 + 姓名 */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20 flex-shrink-0">
                {(viewingUser.name || '?')[0]}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900 tracking-tight truncate">
                  {viewingUser.name}
                </p>
                <p className="text-xs font-mono text-indigo-600 font-bold truncate">
                  {viewingUser.email}
                </p>
              </div>
              <span className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex-shrink-0
                ${viewingUser.role === 'admin'
                  ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200/50'
                  : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/50'}`}>
                {viewingUser.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>

            {/* 信息字段 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">👤 姓名</p>
                <p className="text-xs font-semibold text-slate-800">{viewingUser.name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">✉️ 邮箱</p>
                <p className="text-xs font-semibold text-slate-800 font-mono">{viewingUser.email}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">🛡️ 角色</p>
                <p className="text-xs font-semibold text-slate-800">
                  {viewingUser.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">🕐 创建时间</p>
                <p className="text-xs font-semibold text-slate-800">
                  {new Date(viewingUser.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========== 编辑用户弹窗 ========== */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onConfirm={handleSaveEdit}
        title="编辑用户"
        confirmText={isSaving ? '保存中...' : '保存修改'}
        cancelText="取消"
      >
        {editingUser && (
          <div className="space-y-4">
            {/* 姓名 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">姓名</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                placeholder="请输入姓名"
              />
            </div>
            {/* 邮箱 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">邮箱</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                placeholder="user@example.com"
              />
            </div>
            {/* 角色 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">角色</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            {/* 新密码（可选） */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                新密码
                <span className="text-[10px] font-normal text-slate-400 normal-case tracking-normal">（留空则不修改）</span>
              </label>
              <div className="relative group">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editForm.password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 pr-10 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="输入新密码"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
                  tabIndex={-1}
                >
                  {showEditPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========== 新增用户弹窗 ========== */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAddUser}
        title="新增用户"
        confirmText={isSubmitting ? '创建中...' : '确认创建'}
        cancelText="取消"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">邮箱</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">姓名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              placeholder="请输入姓名"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">密码</label>
            <div className="relative group">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 pr-10 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                placeholder="至少 6 位"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">角色</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ========== 删除确认弹窗 ========== */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="确认删除用户"
        confirmText="确认删除"
        cancelText="取消"
      >
        <div className="flex flex-col items-center text-center py-2">
          <p className="text-slate-700 font-bold text-sm">
            确定要删除这个用户吗？
          </p>
          <p className="text-xs text-slate-500 mt-1">
            删除后该用户将无法登录系统。
          </p>
        </div>
      </Modal>

      {/* 退出登录确认弹窗 */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false)
          toast.success('已退出登录')
          logout()
        }}
        title="确认退出登录"
        confirmText="确认退出"
        cancelText="取消"
      >
        <div className="flex flex-col items-center text-center py-2">
          <p className="text-slate-700 font-bold text-sm">
            确定要退出当前账号吗？
          </p>
        </div>
      </Modal>

      <Toast />
    </div>
  )
}
