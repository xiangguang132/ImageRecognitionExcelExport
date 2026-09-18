'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { useConfirm } from '@/components/ui/useConfirm'
import { toast } from '@/components/ui/Toast'
import { normalizeEmailInput, EMAIL_SUFFIX } from '@/lib/recognize'
import { api, page } from '@/lib/api-path'

export interface Student {
  id: number
  studentId: string | null
  name: string | null
  email: string | null
  major: string | null
  role: string | null
  interestDirection: string | null
  interestTopic: string | null
  createdAt: string
}

interface StudentTableProps {
  students: Student[]
  onDelete: (id: number) => void
  onEdit: (id: number, data: Partial<Student>) => void
  onRefresh: () => void
  isLoading: boolean
  currentPage: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  authFetch?: (url: string, options?: RequestInit) => Promise<Response>
}

export default function StudentTable({
  students,
  onDelete,
  onEdit,
  onRefresh,
  isLoading,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  authFetch
}: StudentTableProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const deleteConfirm = useConfirm({
    title: '确认删除记录',
    confirmText: '确认删除',
    children: (
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-32 h-28 mb-1">
          <img src={page('/illustrations/undraw_upload-warning_aqma.svg')} alt="Confirm Illustration" className="w-full h-full object-contain drop-shadow-md" />
        </div>
        <p className="text-slate-700 font-bold text-sm">确定要删除这条记录吗？</p>
        <p className="text-xs text-slate-500 mt-1">记录将从列表中隐藏，数据保留在数据库中，导出时不会包含此记录。</p>
      </div>
    )
  })
  const exportConfirm = useConfirm({
    title: '确认导出',
    confirmText: '确认导出',
    children: (
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-28 h-24 mb-1">
          <img src={page('/illustrations/undraw_upload-warning_aqma.svg')} alt="Export Illustration" className="w-full h-full object-contain drop-shadow-md" />
        </div>
        <p className="text-slate-700 font-bold text-sm">确定要导出当前数据为 Excel 文件吗？</p>
        <p className="text-xs text-slate-500 mt-1">将导出所有未删除的学生记录。</p>
      </div>
    )
  })
  const [resettingId, setResettingId] = useState<number | null>(null)
  const resetConfirm = useConfirm({
    title: '确认重置密码',
    confirmText: '确认重置',
    children: (
      <div className="flex flex-col items-center text-center py-2">
        <p className="text-slate-700 font-bold text-sm">将该学生密码重置为 123456？</p>
        <p className="text-xs text-slate-500 mt-1">学生下次登录需强制改密。</p>
      </div>
    )
  })

  // 编辑状态
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState<Partial<Student>>({})
  const [isSaving, setIsSaving] = useState(false)

  // 详情查看状态
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)

  // 行动画 key，刷新后递增触发重新挂载
  const [rowAnimKey, setRowAnimKey] = useState(0)

  // 刷新完成时触发行动画
  const prevLoadingRef = useRef(isLoading)
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      setRowAnimKey(k => k + 1)
    }
    prevLoadingRef.current = isLoading
  }, [isLoading])

  const handleExportClick = async () => {
    const ok = await exportConfirm.confirm()
    if (!ok) return

    setIsExporting(true)
    try {
      const fetchFn = authFetch || ((url: string, init?: RequestInit) => fetch(api(url), init))
      const response = await fetchFn('/api/export')
      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `学生账号导入_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async (id: number) => {
    const ok = await deleteConfirm.confirm()
    if (!ok) return
    setDeletingId(id)
    try {
      const fetchFn = authFetch || ((url: string, init?: RequestInit) => fetch(api(url), init))
      const response = await fetchFn(`/api/students/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      toast.success('删除成功')
      onDelete(id)
    } catch (error) {
      toast.error('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  const handleResetPassword = async (id: number) => {
    const ok = await resetConfirm.confirm()
    if (!ok) return

    setResettingId(id)
    try {
      const fetchFn = authFetch || ((url: string, init?: RequestInit) => fetch(api(url), init))
      const response = await fetchFn(`/api/students/${id}/reset-password`, {
        method: 'POST'
      })

      if (!response.ok) {
        let serverError = '重置失败'
        try {
          const err = await response.json()
          if (err?.error) serverError = err.error
        } catch { /* 忽略解析失败 */ }
        throw new Error(serverError)
      }

      toast.success('已重置为 123456，学生下次登录需改密')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重置失败，请重试')
    } finally {
      setResettingId(null)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setEditForm({
      studentId: student.studentId ?? '',
      name: student.name ?? '',
      email: student.email ?? '',
      major: student.major ?? '',
      role: student.role ?? '',
      interestDirection: student.interestDirection ?? '',
      interestTopic: student.interestTopic ?? '',
    })
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInterestToggle = (option: '项目' | '研究') => {
    setEditForm(prev => {
      const current = prev.interestDirection
        ? prev.interestDirection.split(',').filter(Boolean)
        : []
      const next = current.includes(option)
        ? current.filter(v => v !== option)
        : [...current, option]
      return { ...prev, interestDirection: next.join(',') }
    })
  }

  const handleSaveEdit = async () => {
    if (!editingStudent) return

    if (!editForm.studentId?.trim() || !editForm.name?.trim()) {
      toast.error('学号和姓名不能为空')
      return
    }

    if (!editForm.email?.trim()) {
      toast.error('邮箱不能为空')
      return
    }

    setIsSaving(true)
    try {
      const fetchFn = authFetch || ((url: string, init?: RequestInit) => fetch(api(url), init))
      const response = await fetchFn(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        // 透出服务端校验错误（格式 / 敏感内容），便于用户直接修正
        let serverError = '更新学生信息失败，请重试'
        try {
          const err = await response.json()
          if (err?.error) serverError = err.error
        } catch { /* 忽略解析失败，使用默认提示 */ }
        throw new Error(serverError)
      }

      const updated = await response.json()
      onEdit(editingStudent.id, updated)
      setEditingStudent(null)
      toast.success('编辑成功')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '更新学生信息失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-xl font-black text-slate-800 tracking-tighter">
            {students.length}
          </div>
          <div className="text-xs font-medium text-slate-500 border-l border-slate-200 pl-2">
            当前页显示条数
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? '刷新中...' : '刷新数据'}
          </button>

          <button
            onClick={handleExportClick}
            disabled={isExporting || students.length === 0}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5
              ${isExporting || students.length === 0
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25'}`}
          >
            {isExporting ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {isExporting ? '正在导出...' : '导出 Excel'}
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="relative overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
        {/* 刷新加载遮罩 */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl transition-all duration-200">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-xl shadow-lg border border-slate-100">
              <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs font-bold text-slate-600">正在刷新数据...</span>
            </div>
          </div>
        )}
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-bold tracking-wider">学号</th>
              <th className="px-4 py-3 font-bold tracking-wider">姓名</th>
              <th className="px-4 py-3 font-bold tracking-wider hidden lg:table-cell">邮箱</th>
              <th className="px-4 py-3 font-bold tracking-wider hidden md:table-cell">专业</th>
              <th className="px-4 py-3 font-bold tracking-wider">角色</th>
              <th className="px-4 py-3 font-bold tracking-wider hidden xl:table-cell">兴趣方向</th>
              <th className="px-4 py-3 font-bold tracking-wider hidden xl:table-cell">意向主题</th>
              <th className="px-4 py-3 font-bold tracking-wider">录入时间</th>
              <th className="px-4 py-3 font-bold tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                    <div className="w-48 h-36">
                      <img src={page('/illustrations/undraw_upload-warning_aqma.svg')} alt="Empty Illustration" className="w-full h-full object-contain drop-shadow-sm opacity-90" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-500 text-base">暂无数据</p>
                      <p className="text-xs">请上传学生证图片以录入信息</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              students.map((student, index) => (
                <tr key={`${rowAnimKey}-${student.id}`} className={`animate-row-fade-in group hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                  <td className="px-4 py-3 font-mono text-indigo-600 font-bold">{student.studentId || '-'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{student.name || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell truncate max-w-[150px]">{student.email || '-'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{student.major || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                      ${student.role === 'teacher'
                        ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/50'
                        : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/50'}`}>
                      {student.role === 'teacher' ? '教师' : student.role === 'student' ? '学生' : student.role || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {student.interestDirection
                      ? student.interestDirection.split(',').map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 mr-1 border border-emerald-100/50">
                            {tag}
                          </span>
                        ))
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden xl:table-cell truncate max-w-[120px]">{student.interestTopic || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 font-medium text-xs whitespace-nowrap">
                    {new Date(student.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewingStudent(student)}
                        className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-all"
                        title="查看详情"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                        title="编辑记录"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleResetPassword(student.id)}
                        disabled={resettingId === student.id}
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-all disabled:opacity-50"
                        title="重置密码为 123456"
                      >
                        {resettingId === student.id ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        disabled={deletingId === student.id}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all disabled:opacity-50"
                        title="删除记录"
                      >
                      {deletingId === student.id ? (
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页控制 */}
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      <deleteConfirm.Dialog />
      <exportConfirm.Dialog />
      <resetConfirm.Dialog />

      {/* 编辑弹窗 */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onConfirm={handleSaveEdit}
        title="编辑学生信息"
        confirmText={isSaving ? '保存中...' : '保存修改'}
        cancelText="取消"
      >
        {editingStudent && (
          <div className="space-y-4">
            {/* 学号 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                学号
              </label>
              <input
                type="text"
                name="studentId"
                value={editForm.studentId ?? ''}
                onChange={handleEditChange}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="AC201301"
              />
            </div>

            {/* 姓名 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                姓名
              </label>
              <input
                type="text"
                name="name"
                value={editForm.name ?? ''}
                onChange={handleEditChange}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="请输入姓名"
              />
            </div>

            {/* 邮箱 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                邮箱
              </label>
              <input
                type="text"
                name="email"
                value={editForm.email ?? ''}
                onChange={handleEditChange}
                onBlur={() => {
                  const val = (editForm.email ?? '').trim()
                  if (!val) return
                  const { email, fixed } = normalizeEmailInput(val)
                  if (fixed) {
                    setEditForm(prev => ({ ...prev, email }))
                    toast.info(`邮箱后缀已规范为 ${EMAIL_SUFFIX}`)
                  }
                }}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="邮箱地址"
              />
            </div>

            {/* 专业 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                专业
              </label>
              <input
                type="text"
                name="major"
                value={editForm.major ?? ''}
                onChange={handleEditChange}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="请输入专业"
              />
            </div>

            {/* 角色 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                身份角色
              </label>
              <select
                name="role"
                value={editForm.role ?? ''}
                onChange={handleEditChange}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="student">Student (学生)</option>
                <option value="teacher">Teacher (教师)</option>
              </select>
            </div>

            {/* 意向主题 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                意向主题
              </label>
              <input
                type="text"
                name="interestTopic"
                value={editForm.interestTopic ?? ''}
                onChange={handleEditChange}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="例如：基于大模型的代码助手研究"
              />
            </div>

            {/* 兴趣方向 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                兴趣方向
              </label>
              <div className="flex gap-2">
                {(['项目', '研究'] as const).map(option => {
                  const selected = (editForm.interestDirection ?? '').split(',').filter(Boolean).includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleEditInterestToggle(option)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all
                        ${selected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span>{option === '项目' ? '🚀' : '🔬'}</span> {option}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 详情查看弹窗 */}
      <Modal
        isOpen={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        title="学生详情"
        confirmText=""
        cancelText="关闭"
      >
        {viewingStudent && (
          <div className="space-y-4">
            {/* 头部：头像 + 姓名/学号 */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20 flex-shrink-0">
                {(viewingStudent.name || '?')[0]}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900 tracking-tight truncate">
                  {viewingStudent.name || '未填写'}
                </p>
                <p className="text-xs font-mono text-indigo-600 font-bold">
                  {viewingStudent.studentId || '未填写'}
                </p>
              </div>
              <span className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex-shrink-0
                ${viewingStudent.role === 'teacher'
                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/50'
                  : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/50'}`}>
                {viewingStudent.role === 'teacher' ? '教师' : viewingStudent.role === 'student' ? '学生' : viewingStudent.role || '未知'}
              </span>
            </div>

            {/* 信息字段 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '邮箱', value: viewingStudent.email },
                { label: '专业', value: viewingStudent.major },
                { label: '意向主题', value: viewingStudent.interestTopic },
                { label: '录入时间', value: new Date(viewingStudent.createdAt).toLocaleString('zh-CN') },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-800 truncate">{item.value || '未填写'}</p>
                </div>
              ))}
            </div>

            {/* 兴趣方向 */}
            <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">兴趣方向</p>
              {viewingStudent.interestDirection
                ? (
                  <div className="flex flex-wrap gap-1.5">
                    {viewingStudent.interestDirection.split(',').filter(Boolean).map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200/50">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )
                : <p className="text-xs text-slate-500">未填写</p>
              }
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
