'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import ImageUploader from '@/components/ImageUploader'
import StudentInfoForm from '@/components/StudentInfoForm'
import VoiceRecorder, { useVoiceRecordingSupport } from '@/components/VoiceRecorder'
import StudentTable, { Student } from '@/components/StudentTable'
import Modal from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/useConfirm'
import { recognizeWithAI, StudentInfo } from '@/lib/recognize'
import { recognizeVoiceWithAI } from '@/lib/voice'
import { toast } from '@/components/ui/Toast'

/**
 * 管理端（需管理员登录）：
 * 手工录入 + 拍照上传识别 + 语音录入 + 数据管理。
 */
export default function ManagerPage() {
  const { user, isLoading: authLoading, logout, authFetch } = useAuth()
  const router = useRouter()

  const [students, setStudents] = useState<Student[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // 识别相关（与学生端同链路，请求携带管理员登录态）
  const [recognizeData, setRecognizeData] = useState<StudentInfo | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [clearImage, setClearImage] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [isVoiceRecognizing, setIsVoiceRecognizing] = useState(false)
  const voiceSupported = useVoiceRecordingSupport()
  const logoutConfirm = useConfirm({ title: '确认退出登录', message: '确定要退出当前账号吗？', confirmText: '确认退出' })

  const isAdmin = user?.role === 'admin'

  // 未登录去登录页；已登录但非管理员回学生端（不再弹回登录页，避免两页互跳死循环）
  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/manager/login')
    else if (!isAdmin) router.replace('/')
  }, [authLoading, user, isAdmin, router])

  const fetchStudents = useCallback(async (p: number = currentPage, size: number = pageSize) => {
    if (!isAdmin) return
    try {
      const response = await authFetch(`/api/students?page=${p}&pageSize=${size}`)
      if (response.ok) {
        const result = await response.json()
        setStudents(result.data)
        setTotalCount(result.totalCount)
      } else if (response.status === 401) {
        logout()
        router.replace('/manager/login')
      }
    } catch (error) {
      console.error('获取学生列表失败:', error)
    }
  }, [isAdmin, authFetch, currentPage, pageSize, logout, router])

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
          router.replace('/manager/login')
        }
      })
      .catch((error) => console.error('获取学生列表失败:', error))
    return () => { cancelled = true }
  }, [isAdmin, authFetch, pageSize, logout, router])

  // 图片上传并识别（携带管理员登录态）
  const handleImageUpload = async (file: File) => {
    if (isRecognizing) return
    setIsRecognizing(true)
    setRecognizeData(null)
    try {
      const info = await recognizeWithAI(file, authFetch)
      toast.success('AI 识别完成，请核对以下信息')
      setRecognizeData(info)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : '请重试'
      toast.error(`识别失败: ${message}`)
    } finally {
      setIsRecognizing(false)
    }
  }

  // 语音录制完成并识别（携带管理员登录态）
  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    setIsVoiceRecognizing(true)
    try {
      const info = await recognizeVoiceWithAI(audioBlob, authFetch)
      toast.success('语音识别完成，请核对以下信息')
      setRecognizeData(info)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : '请重试'
      toast.error(`语音识别失败: ${message}`)
    } finally {
      setIsVoiceRecognizing(false)
    }
  }

  // 重置表单 + 清除图片
  const handleFormReset = () => {
    setClearImage(true)
    setRecognizeData(null)
    setTimeout(() => setClearImage(false), 100)
  }

  // 提交学生信息；邮箱已被使用等问题由服务端直接报错，手工修改后重试
  const submitStudent = async (data: StudentInfo) => {
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
    const row = await response.json()
    toast.success(row?.revived ? '曾删除的记录已恢复并更新' : '提交信息成功')
    setCurrentPage(1)
    await fetchStudents(1)
    // 提交成功后清空识别结果与图片，表单回到空态
    setRecognizeData(null)
    setClearImage(true)
    setTimeout(() => setClearImage(false), 100)
    return row
  }

  const handleSubmit = async (data: StudentInfo) => {
    setIsSubmitting(true)
    try {
      await submitStudent(data)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
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
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)))
  }

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">管理端 · 学生信息管理</h1>
              <p className="text-[11px] font-medium text-slate-500 tracking-wide uppercase hidden sm:block">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">← 学生端</Link>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-700 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight">管理员</p>
              </div>
              <button
                onClick={async () => {
                  const ok = await logoutConfirm.confirm()
                  if (ok) {
                    toast.success('已退出登录')
                    logout()
                    router.replace('/manager/login')
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
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">信息录入</h2>
                <p className="text-xs text-slate-500 mt-0.5">上传图片或语音录入，系统将自动提取关键信息，也可直接手工填写</p>
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

          <StudentInfoForm
            initialData={recognizeData}
            onSubmit={handleSubmit}
            onReset={handleFormReset}
            isSubmitting={isSubmitting}
            isRecognizing={isRecognizing || isVoiceRecognizing}
          />

          <VoiceRecorder
            isOpen={showVoiceRecorder}
            onClose={() => setShowVoiceRecorder(false)}
            onRecordingComplete={handleVoiceRecordingComplete}
          />
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">查看与管理</h2>
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
            onPageChange={(p) => { setCurrentPage(p); fetchStudents(p) }}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); fetchStudents(1, size) }}
            authFetch={authFetch}
          />
        </div>
      </main>

      <logoutConfirm.Dialog />
    </div>
  )
}
