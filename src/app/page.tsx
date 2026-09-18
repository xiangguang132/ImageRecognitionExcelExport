'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ImageUploader from '@/components/ImageUploader'
import StudentInfoForm from '@/components/StudentInfoForm'
import VoiceRecorder, { useVoiceRecordingSupport } from '@/components/VoiceRecorder'
import StudentTable, { Student } from '@/components/StudentTable'
import { useConfirm } from '@/components/ui/useConfirm'
import { recognizeWithAI, StudentInfo } from '@/lib/recognize'
import { recognizeVoiceWithAI } from '@/lib/voice'
import { toast } from '@/components/ui/Toast'

export default function Home() {
  const { user, isLoading: authLoading, logout, authFetch } = useAuth()
  const router = useRouter()

  const [students, setStudents] = useState<Student[]>([])
  const [recognizeData, setRecognizeData] = useState<StudentInfo | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clearImage, setClearImage] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [isVoiceRecognizing, setIsVoiceRecognizing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const logoutConfirm = useConfirm({ title: '确认退出登录', message: '确定要退出当前账号吗？', confirmText: '确认退出' })
  const voiceSupported = useVoiceRecordingSupport()

  const isAdmin = user?.role === 'admin'

  // 未登录跳转登录页；初始密码未改的学生强制去改密页
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    } else if (!authLoading && user && user.mustChangePassword === 1) {
      router.replace('/change-password')
    }
  }, [authLoading, user, router])

  // 获取学生列表（仅管理员）
  const fetchStudents = useCallback(async (page: number = currentPage, size: number = pageSize) => {
    if (!isAdmin) return
    try {
      const response = await authFetch(`/api/students?page=${page}&pageSize=${size}`)
      if (response.ok) {
        const result = await response.json()
        setStudents(result.data)
        setTotalCount(result.totalCount)
      } else if (response.status === 401) {
        logout()
        router.replace('/login')
      }
    } catch (error) {
      console.error('获取学生列表失败:', error)
    }
  }, [isAdmin, authFetch, currentPage, pageSize, logout, router])

  // 页面加载时获取数据（仅管理员；setState 只在 promise 回调中执行）
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    authFetch(`/api/students?page=1&pageSize=${pageSize}`)
      .then(async (response) => {
        if (cancelled) return
        if (response.ok) {
          const result = await response.json()
          if (cancelled) return
          setStudents(result.data)
          setTotalCount(result.totalCount)
        } else if (response.status === 401) {
          logout()
          router.replace('/login')
        }
      })
      .catch((error) => console.error('获取学生列表失败:', error))
    return () => { cancelled = true }
  }, [isAdmin, authFetch, pageSize, logout, router])

  // 图片上传并识别（统一走 lib，携带登录态）
  const handleImageUpload = async (file: File) => {
    setIsRecognizing(true)
    setRecognizeData(null)

    try {
      const info = await recognizeWithAI(file, authFetch)
      toast.success('AI 识别完成，请核对以下信息')
      setRecognizeData(info)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '请重试'
      console.error('[页面] ❌ 识别失败:', error)
      toast.error(`识别失败: ${message}`)
    } finally {
      setIsRecognizing(false)
    }
  }

  // 语音录制完成并识别（统一走 lib，携带登录态）
  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    setIsVoiceRecognizing(true)

    try {
      const info = await recognizeVoiceWithAI(audioBlob, authFetch)
      toast.success('语音识别完成，请核对以下信息')
      setRecognizeData(info)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '请重试'
      console.error('[页面] 语音识别失败:', error)
      toast.error(`语音识别失败: ${message}`)
    } finally {
      setIsVoiceRecognizing(false)
    }
  }

  // 提交学生信息
  const handleSubmit = async (data: StudentInfo) => {
    setIsSubmitting(true)

    try {
      const response = await authFetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        let serverError = '提交失败，请重试'
        try {
          const err = await response.json()
          if (err?.error) serverError = err.error
        } catch { /* 忽略解析失败 */ }
        throw new Error(serverError)
      }

      toast.success('提交信息成功')
      setRecognizeData(null)

      // 提交成功后回到第一页并刷新（仅管理员）
      if (isAdmin) {
        setCurrentPage(1)
        await fetchStudents(1)
      }

      // 重置表单和图片
      setClearImage(true)
      setTimeout(() => setClearImage(false), 100)
    } catch (error: unknown) {
      console.error('提交失败:', error)
      toast.error(error instanceof Error ? error.message : '提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重置表单 + 清除图片
  const handleFormReset = () => {
    setClearImage(true)
    setRecognizeData(null)
    setTimeout(() => setClearImage(false), 100)
  }

  const handleDelete = (id: number) => {
    if (students.length === 1 && currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      fetchStudents(currentPage - 1)
    } else {
      fetchStudents(currentPage)
    }
  }

  const handleEdit = (id: number, updated: Partial<Student>) => {
    setStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updated } : s))
    )
  }

  // 加载中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  // 未登录（会被 useEffect 重定向，但作为安全兜底）
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 背景装饰 */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-50/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] rounded-full bg-purple-50/50 blur-[100px]" />
      </div>

      {/* 头部 */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                学生证识别系统
              </h1>
              <p className="text-[11px] font-medium text-slate-500 tracking-wide uppercase hidden sm:block">
                Student ID Recognition System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 管理员入口 */}
            {isAdmin && (
              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden sm:inline">用户管理</span>
              </button>
            )}
            {/* 用户信息 + 退出 */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-700 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight">
                  {isAdmin ? '管理员' : '普通用户'}
                </p>
              </div>
              <button
                onClick={async () => {
                  const ok = await logoutConfirm.confirm()
                  if (ok) {
                    toast.success('已退出登录')
                    logout()
                  }
                }}
                className="ml-1 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="退出登录"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 上传区域 + 表单 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-5 sm:p-6 space-y-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  信息录入
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">上传图片或语音录入，系统将自动提取关键信息</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={isRecognizing || isVoiceRecognizing || !voiceSupported}
              title={voiceSupported ? '语音录入' : '当前浏览器不支持语音录入'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-pink-600 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="hidden sm:inline">语音录入</span>
            </button>
          </div>

          <ImageUploader
            onImageUpload={handleImageUpload}
            isLoading={isRecognizing}
            shouldClear={clearImage}
          />

          {/* 识别结果表单 */}
          <StudentInfoForm
            initialData={recognizeData}
            onSubmit={handleSubmit}
            onReset={handleFormReset}
            isSubmitting={isSubmitting}
            isRecognizing={isRecognizing || isVoiceRecognizing}
          />

          {/* 语音录制弹窗 */}
          <VoiceRecorder
            isOpen={showVoiceRecorder}
            onClose={() => setShowVoiceRecorder(false)}
            onRecordingComplete={handleVoiceRecordingComplete}
          />
        </div>

        {/* 数据表格 - 仅管理员可见 */}
        {isAdmin && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-5 sm:p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    查看与管理
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">核对学生信息并导出数据</p>
                </div>
              </div>
            </div>

            <StudentTable
              students={students}
              onDelete={handleDelete}
              onEdit={handleEdit}
              isLoading={isRefreshing}
              onRefresh={async () => {
                setIsRefreshing(true)
                await fetchStudents(currentPage)
                setIsRefreshing(false)
                toast.success('刷新数据成功')
              }}
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page)
                fetchStudents(page)
              }}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
                fetchStudents(1, size)
              }}
              authFetch={authFetch}
            />
          </div>
        )}
      </main>

      {/* 底部 */}
      <footer className="border-t border-slate-200/50 bg-white/30 backdrop-blur-md mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            系统运行正常
          </div>
          <p className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} Student ID Recognition System. Powered by AI.
          </p>
        </div>
      </footer>

      <logoutConfirm.Dialog />

    </div>
  )
}
