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
              <div className="flex flex-col items-center gap-6">
                <div className="w-40 h-40 relative">
                  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg animate-pulse">
                    <path fill="#E0E7FF" d="M39.5,-51.2C50.8,-44.3,58.1,-31,62.1,-16C66.1,-1,66.7,15.6,59.5,28.8C52.2,42,37.1,51.7,21.6,57.8C6,63.8,-10,66.1,-24.4,61.1C-38.7,56.1,-51.4,43.7,-58.5,29C-65.6,14.3,-67.1,-2.6,-62.4,-17.2C-57.7,-31.8,-46.8,-44.1,-34.6,-51C-22.4,-57.9,-9,-59.3,3.4,-63.7C15.8,-68.1,28.1,-58.1,39.5,-51.2Z" transform="translate(100 100)" />
                    <g transform="translate(100, 100)">
                      <rect x="-30" y="-35" width="60" height="50" rx="4" fill="#4F46E5" />
                      <circle cx="0" cy="-10" r="10" fill="#fff" opacity="0.8" />
                      <path d="M-10,15 L0,5 L10,15" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                  </svg>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-indigo-600 font-bold text-lg tracking-wide">AI 正在识别中</p>
                  <p className="text-sm text-slate-500">请稍候，正在提取图片中的文本信息...</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 font-medium bg-white/50 inline-block px-4 py-2 rounded-full border border-slate-100">
                点击或拖拽图片到此处更换
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {isDragActive ? (
              <div className="w-64 h-48 mx-auto animate-bounce">
                <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Upload Warning Illustration" className="w-full h-full object-contain drop-shadow-xl opacity-90" />
              </div>
            ) : (
              <div className="w-64 h-48 mx-auto">
                <img src="/illustrations/undraw_upload-warning_aqma.svg" alt="Upload Illustration" className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-500" />
              </div>
            )}
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
          <div className="w-40 h-40 mb-2">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
              <path fill="#FEE2E2" d="M48.6,-62.3C59.9,-55.4,64.8,-37.3,68.3,-19.1C71.9,-0.8,74.1,17.6,67.5,31.8C60.9,46.1,45.5,56.2,30.1,62.5C14.6,68.8,-1.1,71.3,-17.4,68.8C-33.7,66.3,-50.7,58.8,-60.8,46C-71,33.2,-74.4,15.1,-73.1,-2.7C-71.9,-20.5,-66,-38,-54.7,-46.6C-43.5,-55.3,-26.9,-55.1,-9.8,-59.5C7.3,-63.9,37.3,-69.1,48.6,-62.3Z" transform="translate(100 100)" />
              <g transform="translate(100, 100)">
                <rect x="-30" y="-35" width="60" height="50" rx="4" fill="#EF4444" />
                <circle cx="-15" cy="-15" r="6" fill="#fff" opacity="0.8" />
                <path d="M-20,5 L-5,-10 L10,5 L25,-15" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M-5,25 L5,15" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
              </g>
            </svg>
          </div>
          <p className="text-slate-700 font-bold text-lg">
            确定要删除当前预览的图片吗？
          </p>
          <p className="text-sm text-slate-500 mt-2">
            删除图片后，已识别的文本信息并不会被清除。
          </p>
        </div>
      </Modal>
    </div>
  )
}
