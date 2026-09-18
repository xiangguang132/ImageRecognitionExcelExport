'use client'

import { useState } from 'react'
import { StudentInfo, cleanStudentId, generateEmail } from '@/lib/recognize'
import Modal from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

interface StudentInfoFormProps {
  initialData: StudentInfo | null
  onSubmit: (data: StudentInfo) => void
  onReset: () => void
  isSubmitting: boolean
  isRecognizing?: boolean
  /** 学生模式：锁定硬性信息（学号/姓名/角色/邮箱/专业），只能改兴趣字段 */
  lockIdentity?: boolean
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

export default function StudentInfoForm({ initialData, onSubmit, onReset, isSubmitting, isRecognizing = false, lockIdentity = false }: StudentInfoFormProps) {
  const [formData, setFormData] = useState<StudentInfo>(emptyForm)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  // 学生模式：提交前先弹说明弹窗（硬性信息不入库），确认后再弹原确认弹窗
  const [showNoticeModal, setShowNoticeModal] = useState(false)

  // 识别结果变化时同步表单（渲染期调整，避免 effect 内 setState）
  const [prevInitialData, setPrevInitialData] = useState<StudentInfo | null>(initialData)
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData)
    setFormData(initialData ?? emptyForm)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value }
      // 学号变化时自动派生邮箱
      if (name === 'studentId') {
        const cleanId = cleanStudentId(value)
        if (cleanId) next.email = generateEmail(cleanId)
      }
      return next
    })
  }

  // 邮箱失焦时确保后缀存在
  const handleEmailBlur = () => {
    const suffix = '@connect.um.edu.mo'
    const val = formData.email.trim()
    if (!val) {
      // 空值则从学号重新生成
      const cleanId = cleanStudentId(formData.studentId)
      if (cleanId) {
        setFormData(prev => ({ ...prev, email: generateEmail(cleanId) }))
      }
    } else if (!val.includes('@')) {
      // 用户只输了前缀，补上后缀
      setFormData(prev => ({ ...prev, email: val + suffix }))
    }
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

    // 代码级拦截所有必填字段，统一使用应用内提示，不依赖浏览器原生校验
    // 学生模式只校验兴趣字段（硬性信息被锁定，来自本人档案预填）
    if (!lockIdentity) {
      if (!formData.studentId.trim()) {
        toast.error('请输入学号')
        return
      }
      if (!formData.name.trim()) {
        toast.error('请输入姓名')
        return
      }
      if (!formData.role) {
        toast.error('请选择角色')
        return
      }
      if (!formData.major.trim()) {
        toast.error('请输入专业')
        return
      }
    }
    if (!formData.interestDirection) {
      toast.error('请至少选择一个未来兴趣方向')
      return
    }
    if (!formData.interestTopic.trim()) {
      toast.error('请输入意向主题')
      return
    }

    // 学生模式：先弹说明弹窗，确认后再弹原确认弹窗；管理员直进确认弹窗
    if (lockIdentity) {
      setShowNoticeModal(true)
    } else {
      setShowConfirmModal(true)
    }
  }

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false)
    onSubmit(formData)
  }

  const handleReset = () => {
    setFormData(emptyForm)
    onReset()
    toast.success('重置成功')
  }

  const summaryItems = [
    { label: '学号', value: formData.studentId },
    { label: '姓名', value: formData.name },
    { label: '邮箱', value: formData.email },
    { label: '专业', value: formData.major },
    { label: '角色', value: formData.role },
    { label: '兴趣方向', value: formData.interestDirection },
    { label: '意向主题', value: formData.interestTopic },
  ]
  // 学生模式确认弹窗只列实际入库的两项，避免误导
  const visibleSummaryItems = lockIdentity
    ? summaryItems.filter((item) => item.label === '兴趣方向' || item.label === '意向主题')
    : summaryItems

  return (
    <>
      <form onSubmit={handleSubmit} className={`space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative ${isRecognizing ? 'pointer-events-none' : ''}`}>
        {/* AI 识别中遮罩 */}
        {isRecognizing && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 border border-indigo-100/50">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-indigo-700">AI 正在识别中...</p>
              <p className="text-xs text-slate-500 mt-0.5">请稍候，表单已暂时锁定</p>
            </div>
          </div>
        )}
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
              <p className="text-xs text-slate-500 font-medium">
                {lockIdentity
                  ? '灰色字段由管理员维护，你只能更新下方兴趣信息'
                  : '请确保所有信息准确无误后再提交'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
            {/* 学号 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">01</span> 学号
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
              </label>
              <div className="relative group">
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  disabled={lockIdentity}
                  title={lockIdentity ? '学号由管理员维护' : undefined}
                  className="w-full pl-2.5 pr-16 py-2.5 text-sm bg-white border-2 border-rose-200/50 rounded-lg focus:outline-none focus:ring-3 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm group-hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  placeholder="AC201301"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  自动提取
                </span>
              </div>
            </div>

            {/* 姓名 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">02</span> 姓名
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={lockIdentity}
                title={lockIdentity ? '姓名由管理员维护' : undefined}
                className="w-full px-2.5 py-2.5 text-sm bg-white border-2 border-rose-200/50 rounded-lg focus:outline-none focus:ring-3 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                placeholder="请输入姓名"
              />
            </div>

            {/* 身份角色 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">03</span> 身份角色
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
              </label>
              <div className="relative group">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={lockIdentity}
                  title={lockIdentity ? '身份角色由管理员维护' : undefined}
                  className="w-full px-2.5 py-2.5 text-sm bg-white border-2 border-rose-200/50 rounded-lg focus:outline-none focus:ring-3 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm appearance-none group-hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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

            {/* 邮箱 - 根据学号自动生成，不可手动编辑 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">04</span> 邮箱地址
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
              </label>
              <div className="relative group">
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  disabled={lockIdentity}
                  title={lockIdentity ? '邮箱由管理员维护' : undefined}
                  className="w-full pl-2.5 pr-10 py-2.5 text-sm bg-white border-2 border-rose-200/50 rounded-lg focus:outline-none focus:ring-3 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  placeholder="输入学号后自动生成"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-serif italic font-bold text-[10px]">
                  @
                </div>
              </div>
            </div>

            {/* 专业 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">05</span> 专业
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
              </label>
              <input
                type="text"
                name="major"
                value={formData.major}
                onChange={handleChange}
                disabled={lockIdentity}
                title={lockIdentity ? '专业由管理员维护' : undefined}
                className="w-full px-2.5 py-2.5 text-sm bg-white border-2 border-rose-200/50 rounded-lg focus:outline-none focus:ring-3 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                placeholder="请输入专业名称"
              />
            </div>

            {/* 意向参与主题 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">06</span> 意向参与主题
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
              </label>
              <input
                type="text"
                name="interestTopic"
                value={formData.interestTopic}
                onChange={handleChange}
                className="w-full px-2.5 py-2.5 text-sm bg-white border-2 border-rose-200/50 rounded-lg focus:outline-none focus:ring-3 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm hover:shadow-md"
                placeholder="例如：基于大模型的代码助手研究"
              />
            </div>

            {/* 未来兴趣方向 - 多选 */}
            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="text-slate-400">07</span> 未来兴趣方向
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-widest border border-rose-100">
                  必填
                </span>
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
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border cursor-pointer transition-all duration-300 font-bold shadow-sm text-sm
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
            disabled={isSubmitting || isRecognizing}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 text-sm tracking-wide
              ${isSubmitting || isRecognizing
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
            disabled={isSubmitting || isRecognizing}
            className="px-4 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm"
          >
            重新上传
          </button>
        </div>
      </form>

      <Modal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        onConfirm={() => { setShowNoticeModal(false); setShowConfirmModal(true); }}
        title="提交说明"
        confirmText="我知道了，继续提交"
        cancelText="返回修改"
      >
        <div className="space-y-3">
          <p className="text-slate-600 font-medium text-sm leading-relaxed">
            本次提交<span className="font-bold text-indigo-700">仅更新「未来兴趣方向」和「意向参与主题」</span>。
          </p>
          <p className="text-slate-600 font-medium text-sm leading-relaxed">
            学号、姓名、身份角色、邮箱、专业等硬性信息由管理员维护，
            表单中显示的识别结果<span className="font-bold text-slate-900">仅供核对，不会入库</span>；
            如有误请联系管理员更正。
          </p>
        </div>
      </Modal>

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
            <div className="w-20 h-20 sm:w-28 sm:h-28">
              <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Product Hunt Illustration" className="w-full h-full object-contain drop-shadow-md" />
            </div>
          </div>
          <p className="text-slate-600 font-medium text-center text-sm">
            {lockIdentity
              ? '请核对以下兴趣信息，提交后将更新本人档案：'
              : '请最后核对一次以下信息，提交后将存入数据库：'}
          </p>
          <div className="grid gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100/50 shadow-inner">
            {visibleSummaryItems.map((item) => (
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
