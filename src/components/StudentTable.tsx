'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'

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
  onRefresh: () => void
  currentPage: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function StudentTable({
  students,
  onDelete,
  onRefresh,
  currentPage,
  totalCount,
  pageSize,
  onPageChange
}: StudentTableProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null)

  const totalPages = Math.ceil(totalCount / pageSize)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export')
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
    } catch (error) {
      setAlertModal({ title: '导出错误', message: '导出失败，请重试' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setPendingDeleteId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return

    setShowDeleteModal(false)
    setDeletingId(pendingDeleteId)
    try {
      const response = await fetch(`/api/students/${pendingDeleteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      onDelete(pendingDeleteId)
    } catch (error) {
      setAlertModal({ title: '删除错误', message: '删除失败，请重试' })
    } finally {
      setDeletingId(null)
      setPendingDeleteId(null)
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
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5"
          >
            <svg className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新数据
          </button>

          <button
            onClick={handleExport}
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
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
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
                      <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Empty Illustration" className="w-full h-full object-contain drop-shadow-sm opacity-90" />
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
                <tr key={student.id} className={`group hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
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
                  <td className="px-4 py-3 text-slate-400 font-medium text-[10px] whitespace-nowrap">
                    {new Date(student.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页控制 */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-500 mb-3 sm:mb-0 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            共 <span className="font-bold text-slate-700">{totalCount}</span> 条记录
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一页
            </button>

            <div className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
              {currentPage} / {totalPages}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-1"
            >
              下一页
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="确认删除记录"
        confirmText="确认删除"
        cancelText="取消"
      >
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-32 h-28 mb-1">
            <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Confirm Illustration" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <p className="text-slate-700 font-bold text-sm">
            确定要删除这条记录吗？
          </p>
          <p className="text-xs text-slate-500 mt-1">
            此操作不可撤销，数据将永久移除。
          </p>
        </div>
      </Modal>

      {alertModal && (
        <Modal
          isOpen={!!alertModal}
          onClose={() => setAlertModal(null)}
          onConfirm={() => setAlertModal(null)}
          title={alertModal.title}
          confirmText="我知道了"
          cancelText=""
        >
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-32 h-28 mb-1">
              <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Alert Illustration" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <p className="text-slate-700 font-bold text-sm">{alertModal.message}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
