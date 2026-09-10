'use client'

import { useState, useEffect, useCallback } from 'react'
import ImageUploader from '@/components/ImageUploader'
import OcrForm from '@/components/OcrForm'
import StudentTable, { Student } from '@/components/StudentTable'
import { recognizeWithAI, StudentInfo } from '@/lib/ocr'

export default function Home() {
  const [students, setStudents] = useState<Student[]>([])
  const [ocrData, setOcrData] = useState<StudentInfo | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [clearImage, setClearImage] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  // 获取学生列表
  const fetchStudents = useCallback(async (page: number = currentPage) => {
    try {
      const response = await fetch(`/api/students?page=${page}&pageSize=${pageSize}`)
      if (response.ok) {
        const result = await response.json()
        setStudents(result.data)
        setTotalCount(result.totalCount)
      }
    } catch (error) {
      console.error('获取学生列表失败:', error)
    }
  }, [currentPage, pageSize])

  // 页面加载时获取数据
  useEffect(() => {
    fetchStudents(1)
  }, [fetchStudents])

  // 图片上传并识别
  const handleImageUpload = async (file: File) => {
    setIsRecognizing(true)
    setStatusMessage('正在使用 AI 识别学生证...')
    setOcrData(null)

    try {
      const info = await recognizeWithAI(file)
      setStatusMessage('✅ AI 识别完成，请核对以下信息')
      setOcrData(info)
    } catch (error: any) {
      console.error('[页面] ❌ 识别失败:', error)
      setStatusMessage(`❌ 识别失败: ${error.message || '请重试'}`)
    } finally {
      setIsRecognizing(false)
    }
  }

  // 提交学生信息
  const handleSubmit = async (data: StudentInfo) => {
    setIsSubmitting(true)
    setStatusMessage('')

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('提交失败')
      }

      setStatusMessage('✅ 提交成功！')
      setOcrData(null)

      // 提交成功后回到第一页并刷新
      setCurrentPage(1)
      await fetchStudents(1)
    } catch (error) {
      console.error('提交失败:', error)
      setStatusMessage('❌ 提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重置表单 + 清除图片
  const handleFormReset = () => {
    setClearImage(true)
    setOcrData(null)
    setStatusMessage('')
    // 重置 trigger，以便下次还能触发
    setTimeout(() => setClearImage(false), 100)
  }
  const handleDelete = (id: number) => {
    // 删除后如果当前页没数据了，回到上一页
    if (students.length === 1 && currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      fetchStudents(currentPage - 1)
    } else {
      fetchStudents(currentPage)
    }
    setStatusMessage('✅ 删除成功')
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
                学生证信息管理平台
              </h1>
              <p className="text-[11px] font-medium text-slate-500 tracking-wide uppercase hidden sm:block">
                Student ID Management System
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            v1.0.0
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 状态消息 */}
        {statusMessage && (
          <div className={`p-3 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ${
            statusMessage.includes('✅')
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
              : statusMessage.includes('❌')
                ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                : statusMessage.includes('⚠️')
                  ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                  : 'bg-blue-50 text-blue-700 border-blue-200/60'
          }`}>
            <span className="text-lg">{statusMessage.split(' ')[0]}</span>
            <span className="font-medium text-sm">{statusMessage.substring(statusMessage.indexOf(' ') + 1)}</span>
          </div>
        )}

        {/* 上传区域 + 表单 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white p-5 sm:p-6 space-y-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                第一步：上传与识别
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">上传学生证图片，系统将自动提取关键信息</p>
            </div>
          </div>

          <ImageUploader
            onImageUpload={handleImageUpload}
            isLoading={isRecognizing}
            shouldClear={clearImage}
          />

          {/* OCR 识别结果表单 */}
          <OcrForm
            initialData={ocrData}
            onSubmit={handleSubmit}
            onReset={handleFormReset}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* 数据表格 */}
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
                  第二步：查看与管理
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">核对学生信息并导出数据</p>
              </div>
            </div>
          </div>

          <StudentTable
            students={students}
            onDelete={handleDelete}
            onRefresh={() => fetchStudents(currentPage)}
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={(page) => {
              setCurrentPage(page)
              fetchStudents(page)
            }}
          />
        </div>
      </main>

      {/* 底部 */}
      <footer className="border-t border-slate-200/50 bg-white/30 backdrop-blur-md mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            系统运行正常
          </div>
          <p className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} Student ID Management System. Powered by AI.
          </p>
        </div>
      </footer>
    </div>
  )
}
