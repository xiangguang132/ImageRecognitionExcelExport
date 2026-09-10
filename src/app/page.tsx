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
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">
            📋 学生证信息管理平台
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            上传学生证图片 → OCR 识别 → 确认提交 → 导出 Excel
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* 状态消息 */}
        {statusMessage && (
          <div className={`p-4 rounded-lg ${
            statusMessage.includes('✅')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : statusMessage.includes('❌')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : statusMessage.includes('⚠️')
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {statusMessage}
          </div>
        )}

        {/* 上传区域 + 表单 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
            📤 第一步：上传学生证图片
          </h2>

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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
            📊 第二步：查看和导出数据
          </h2>

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
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          学生证信息管理平台 - 使用千问视觉 AI 识别
        </div>
      </footer>
    </div>
  )
}
