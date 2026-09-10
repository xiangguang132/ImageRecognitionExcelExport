'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Modal from '@/components/ui/Modal'

interface ImageUploaderProps {
  onImageUpload: (file: File) => void
  onClear?: () => void
  isLoading: boolean
  shouldClear: boolean
}

export default function ImageUploader({ onImageUpload, onClear, isLoading, shouldClear }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // 当 shouldClear 变为 true 时，清除预览
  useEffect(() => {
    if (shouldClear) {
      setPreview(null)
    }
  }, [shouldClear])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      onImageUpload(file)
    }
  }, [onImageUpload])

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteModal(true)
  }

  const confirmRemoveImage = () => {
    setPreview(null)
    onClear?.()
    setShowDeleteModal(false)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.gif']
    },
    multiple: false,
    disabled: isLoading
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-300
          ${isDragActive
            ? 'border-indigo-500 bg-indigo-50/50 shadow-inner shadow-indigo-100 scale-[1.01]'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-lg hover:shadow-slate-100/50'}
          ${isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />

        {/* 右上角删除按钮 */}
        {preview && !isLoading && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 transition-all hover:scale-110 z-10"
            title="删除图片"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {preview ? (
          <div className="space-y-6">
            <div className="relative group w-full max-w-lg mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <img
                src={preview}
                alt="预览"
                className="relative w-full max-h-80 object-contain rounded-2xl shadow-xl ring-1 ring-slate-900/5"
              />
            </div>
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-indigo-600 font-bold tracking-wide">AI 正在识别中，请稍候...</p>
              </div>
            ) : (
              <p className="text-slate-500 font-medium bg-white/50 inline-block px-4 py-2 rounded-full border border-slate-100">
                点击或拖拽图片到此处更换
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 mx-auto rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-4xl shadow-inner border border-indigo-100/50 group-hover:scale-110 transition-transform duration-300">
              {isDragActive ? '📥' : '📄'}
            </div>
            <div className="space-y-2">
              {isDragActive ? (
                <p className="text-indigo-600 font-bold text-lg">松开鼠标上传图片</p>
              ) : (
                <>
                  <p className="text-slate-700 font-bold text-lg">点击或拖拽学生证图片到此处</p>
                  <p className="text-sm text-slate-400 font-medium">
                    支持 JPG, PNG, BMP 格式，建议分辨率不低于 800px
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmRemoveImage}
        title="确认删除图片"
        confirmText="确认删除"
        cancelText="取消"
      >
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">
            确定要删除当前预览的图片吗？
          </p>
          <p className="text-sm text-slate-400 mt-2">
            删除图片后，已识别的文本信息并不会被清除。
          </p>
        </div>
      </Modal>
    </div>
  )
}
