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
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        {/* 右上角删除按钮 */}
        {preview && !isLoading && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full shadow transition-colors z-10"
            title="删除图片"
          >
            ✕
          </button>
        )}

        {preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="预览"
              className="max-h-64 mx-auto rounded shadow"
            />
            {isLoading ? (
              <p className="text-blue-600">正在识别中，请稍候...</p>
            ) : (
              <p className="text-gray-500">点击或拖拽图片到此处更换</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            {isDragActive ? (
              <p className="text-blue-600">松开鼠标上传图片</p>
            ) : (
              <>
                <p className="text-gray-600">点击或拖拽学生证图片到此处</p>
                <p className="text-sm text-gray-400">支持 JPG, PNG, BMP 格式</p>
              </>
            )}
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
        <p>确定要删除当前预览的图片吗？</p>
        <p className="text-sm text-gray-500 mt-2">删除图片后，已识别的文本信息并不会被清除。</p>
      </Modal>
    </div>
  )
}
