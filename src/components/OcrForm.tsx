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
  const [showResetModal, setShowResetModal] = useState(false)

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
      <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-100/50 shadow-inner">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                核对识别结果
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                请确保所有信息准确无误后再提交
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
            {/* 学号 */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">01</span> 学号
              </label>
              <div className="relative group">
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="w-full pl-2.5 pr-16 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md"
                  placeholder="AC201301"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  自动提取
                </span>
              </div>
            </div>

            {/* 姓名 */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">02</span> 姓名
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm hover:shadow-md"
                placeholder="请输入姓名"
              />
            </div>

            {/* 身份角色 */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">03</span> 身份角色
              </label>
              <div className="relative group">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange as any}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm appearance-none group-hover:shadow-md"
                >
                  <option value="">请选择角色</option>
                  <option value="student">Student (学生)</option>
                  <option value="teacher">Teacher (教师)</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 邮箱 */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">04</span> 邮箱地址
              </label>
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-2.5 pr-10 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md"
                  placeholder="xxx@connect.um.edu.mo"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-serif italic font-bold text-[8px]">
                  @
                </div>
              </div>
            </div>

            {/* 专业 */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">05</span> 专业
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
              </label>
              <input
                type="text"
                name="major"
                value={formData.major}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-xs bg-white border-2 border-rose-200/50 rounded-lg focus:outline-none focus:ring-3 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm hover:shadow-md"
                placeholder="请输入专业名称"
                required
              />
            </div>

            {/* 意向参与主题 */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">06</span> 意向参与主题
              </label>
              <input
                type="text"
                name="interestTopic"
                value={formData.interestTopic}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm hover:shadow-md"
                placeholder="例如：基于大模型的代码助手研究"
              />
            </div>

            {/* 未来兴趣方向 - 多选 */}
            <div className="space-y-1 md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">07</span> 未来兴趣方向
              </label>
              <div className="flex flex-wrap gap-2">
                {(['项目', '研究'] as const).map(option => {
                  const selected = formData.interestDirection
                    .split(',')
                    .filter(Boolean)
                    .includes(option)
                  return (
                    <label
                      key={option}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border cursor-pointer transition-all duration-300 font-bold shadow-sm text-xs
                        ${selected
                          ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-500 text-indigo-700 shadow-md shadow-indigo-500/10 -translate-y-0.5'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border-2 transition-all duration-300
                        ${selected ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" checked={selected} onChange={() => handleInterestToggle(option)} className="hidden" />
                      <span>{option === '项目' ? '🚀' : '🔬'}</span> {option}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 text-xs tracking-wide
              ${isSubmitting
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-700 hover:via-blue-700 hover:to-indigo-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0 active:shadow-md bg-[length:200%_auto] hover:bg-right'}`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>正在处理...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>确认并保存信息</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-xs"
          >
            重新上传
          </button>
        </div>
      </form>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="确认提交信息"
        confirmText={isSubmitting ? '提交中...' : '确认无误，提交'}
        cancelText="返回修改"
      >
        <div className="space-y-5">
          <div className="flex justify-center -mt-2 mb-2">
            <div className="w-32 h-32">
              <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Product Hunt Illustration" className="w-full h-full object-contain drop-shadow-md" />
            </div>
          </div>
          <p className="text-slate-600 font-medium text-center text-sm">
            请最后核对一次以下信息，提交后将存入数据库：
          </p>
          <div className="grid gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100/50 shadow-inner">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 last:pb-0 first:pt-0">
                <span className="text-xs text-slate-500 font-bold tracking-wide uppercase">{item.label}</span>
                <span className="text-xs text-slate-900 font-semibold bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-100">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => { setShowResetModal(false); handleReset(); }}
        title="确认重新上传"
        confirmText="确认重新上传"
        cancelText="取消"
      >
        <div className="space-y-3">
          <div className="flex justify-center -mt-1 mb-1">
            <div className="w-24 h-24">
              <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Warning" className="w-full h-full object-contain drop-shadow-md" />
            </div>
          </div>
          <p className="text-slate-600 font-medium text-center text-sm">
            重新上传将<span className="font-bold text-rose-600">清空当前所有已识别的信息</span>，确定要继续吗？
          </p>
        </div>
      </Modal>
    </>
  )
}
