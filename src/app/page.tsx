'use client'

import { useState } from 'react'
import Link from 'next/link'
import ImageUploader from '@/components/ImageUploader'
import StudentInfoForm from '@/components/StudentInfoForm'
import VoiceRecorder, { useVoiceRecordingSupport } from '@/components/VoiceRecorder'
import { recognizeWithAI, StudentInfo } from '@/lib/recognize'
import { recognizeVoiceWithAI } from '@/lib/voice'
import { api } from '@/lib/api-path'
import { toast } from '@/components/ui/Toast'

/**
 * 学生端（免登录公开）：
 * 拍照/选图上传 + 语音录入 + 全字段可编辑表单，提交即新建入库。
 */
export default function Home() {
  const [recognizeData, setRecognizeData] = useState<StudentInfo | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clearImage, setClearImage] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [isVoiceRecognizing, setIsVoiceRecognizing] = useState(false)
  const voiceSupported = useVoiceRecordingSupport()

  const plainFetch = (url: string, options?: RequestInit) => fetch(api(url), options ?? {})

  const handleImageUpload = async (file: File) => {
    if (isRecognizing) return
    setIsRecognizing(true)
    setRecognizeData(null)
    try {
      const info = await recognizeWithAI(file, plainFetch)
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

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    setIsVoiceRecognizing(true)
    try {
      const info = await recognizeVoiceWithAI(audioBlob, plainFetch)
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

  // 提交学生信息；邮箱已被使用等问题由服务端直接报错，手工修改后重试
  const submitStudent = async (data: StudentInfo) => {
    const response = await plainFetch('/api/students', {
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
    toast.success(row?.revived ? '曾删除的记录已恢复并更新' : '提交成功，感谢填写')
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

  const handleFormReset = () => {
    setClearImage(true)
    setRecognizeData(null)
    setTimeout(() => setClearImage(false), 100)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-50/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">学生证识别系统</h1>
              <p className="text-[11px] font-medium text-slate-500 tracking-wide uppercase hidden sm:block">Student ID Recognition System</p>
            </div>
          </div>
          <Link href="/manager/login" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            管理员登录 →
          </Link>
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
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">信息填报</h2>
                <p className="text-xs text-slate-500 mt-0.5">拍照或语音录入，核对后直接提交，无需登录</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={isRecognizing || isVoiceRecognizing || !voiceSupported}
              title={voiceSupported ? '语音录入' : '当前浏览器不支持语音录入'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-pink-600 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="hidden sm:inline">语音录入</span>
            </button>
          </div>

          <ImageUploader onImageUpload={handleImageUpload} isLoading={isRecognizing} shouldClear={clearImage} />

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
      </main>

      <footer className="border-t border-slate-200/50 bg-white/30 backdrop-blur-md mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            系统运行正常
          </div>
          <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} Student ID Recognition System. Powered by AI.</p>
        </div>
      </footer>
    </div>
  )
}
