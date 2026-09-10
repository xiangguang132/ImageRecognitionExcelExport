'use client'

import { useState, useEffect } from 'react'
import { StudentInfo } from '@/lib/ocr'
import Modal from '@/components/ui/Modal'

interface OcrFormProps {
  initialData: StudentInfo | null
  onSubmit: (data: StudentInfo) => void
  onReset: () => void
  isSubmitting: boolean
}

const emptyForm: StudentInfo = {
  studentId: '',
  name: '',
  email: '',
  major: '',
  role: '',
  interestDirection: '',
  interestTopic: ''
}

export default function OcrForm({ initialData, onSubmit, onReset, isSubmitting }: OcrFormProps) {
  const [formData, setFormData] = useState<StudentInfo>(emptyForm)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // 当 OCR 结果返回时，更新表单
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleInterestToggle = (option: '项目' | '研究') => {
    setFormData(prev => {
      const current = prev.interestDirection
        ? prev.interestDirection.split(',').filter(Boolean)
        : []
      const next = current.includes(option)
        ? current.filter(v => v !== option)
        : [...current, option]
      return { ...prev, interestDirection: next.join(',') }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmModal(true)
  }

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false)
    onSubmit(formData)
  }

  const handleReset = () => {
    setFormData(emptyForm)
    onReset()
  }

  if (!initialData) {
    return null
  }

  const summaryItems = [
    { label: '学号', value: formData.studentId },
    { label: '姓名', value: formData.name },
    { label: '邮箱', value: formData.email },
    { label: '专业', value: formData.major || '（未填写）' },
    { label: '角色', value: formData.role },
    { label: '兴趣方向', value: formData.interestDirection },
    { label: '意向主题', value: formData.interestTopic },
  ].filter(item => item.value)

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">识别结果（请核对并修改）</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 学号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学号 <span className="text-xs text-gray-400">（自动提取，只保留数字和大写字母）</span>
            </label>
            <input
              type="text"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如 AC201301"
            />
          </div>

          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入姓名"
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span className="text-xs text-gray-400">（自动生成，可修改）</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="xxx@connect.um.edu.mo"
            />
          </div>

          {/* 专业 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              专业 <span className="text-xs text-red-400">*请手动填写</span>
            </label>
            <input
              type="text"
              name="major"
              value={formData.major}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-l-4 border-l-red-400"
              placeholder="请输入专业"
              required
            />
          </div>

          {/* 角色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如 STUDENT"
            />
          </div>

          {/* 未来兴趣方向 - 多选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">未来兴趣方向</label>
            <div className="flex gap-4">
              {(['项目', '研究'] as const).map(option => {
                const selected = formData.interestDirection
                  .split(',')
                  .filter(Boolean)
                  .includes(option)
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors
                      ${selected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleInterestToggle(option)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    {option}
                  </label>
                )
              })}
            </div>
            {formData.interestDirection && (
              <p className="mt-1 text-xs text-gray-400">已选：{formData.interestDirection}</p>
            )}
          </div>

          {/* 意向参与主题 - 填空 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">意向参与主题</label>
            <input
              type="text"
              name="interestTopic"
              value={formData.interestTopic}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入意向参与的主题"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md font-medium text-white
              ${isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isSubmitting ? '提交中...' : '确认提交'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-md font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
          >
            重置表单
          </button>
        </div>
      </form>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="请确认以下信息是否正确"
        confirmText={isSubmitting ? '提交中...' : '确认提交'}
        cancelText="返回修改"
      >
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
          {summaryItems.map((item) => (
            <div key={item.label} className="flex">
              <span className="w-24 text-sm text-gray-500 font-medium">{item.label}：</span>
              <span className="text-sm text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
