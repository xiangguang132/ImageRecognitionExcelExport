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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          已录入数据 ({students.length} 条)
        </h2>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            刷新
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || students.length === 0}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md
              ${isExporting || students.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isExporting ? '导出中...' : '📥 导出 Excel'}
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">专业</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">兴趣方向</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">意向主题</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">录入时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  暂无数据，请上传学生证图片录入信息
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">{student.studentId || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{student.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{student.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{student.major || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {student.role || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.interestDirection
                      ? student.interestDirection.split(',').map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-1">
                            {tag}
                          </span>
                        ))
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{student.interestTopic || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(student.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleDelete(student.id)}
                      disabled={deletingId === student.id}
                      className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                    >
                      {deletingId === student.id ? '删除中...' : '删除'}
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
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            共 {totalCount} 条记录，当前第 {currentPage} / {Math.ceil(totalCount / pageSize)} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
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
        <p>确定要删除这条记录吗？此操作不可撤销。</p>
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
          <p>{alertModal.message}</p>
        </Modal>
      )}
    </div>
  )
}
