'use client'

import { useState, useRef, DragEvent } from 'react'
import { page } from '@/lib/api-path'
import { compressImage } from '@/lib/image'
import Modal from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

interface ImageUploaderProps {
  onImageUpload: (file: File) => void
  onClear?: () => void
  isLoading: boolean
  shouldClear: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB，与后端 /api/recognize 上限一致（压缩后判定）
const MAX_RAW_SIZE = 30 * 1024 * 1024 // 原图超过 30MB 直接拒收，防 canvas 爆内存

export default function ImageUploader({ onImageUpload, onClear, isLoading, shouldClear }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // shouldClear 变化时重置预览（渲染期调整，避免 effect 内 setState）
  const [prevShouldClear, setPrevShouldClear] = useState(shouldClear)
  if (shouldClear !== prevShouldClear) {
    setPrevShouldClear(shouldClear)
    if (shouldClear) setPreview(null)
  }

  const processFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('不支持的图片格式，请上传 JPG / PNG / WebP / GIF / BMP')
      return
    }
    if (file.size > MAX_RAW_SIZE) {
      toast.error('图片过大，请上传 30MB 以内的图片')
      return
    }
    try {
      // 手机原图先压缩（长边 1600px / JPEG 0.85），再预览再上传：
      // 8MB 原图通常压到 300KB 左右，上传和 AI 推理都快一个数量级
      const beforeKB = file.size / 1024
      const compressed = await compressImage(file)
      if (compressed.size > MAX_FILE_SIZE) {
        toast.error('图片过大，请上传 10MB 以内的图片')
        return
      }
      if (compressed !== file) {
        console.log(`[上传] 图片已压缩: ${beforeKB.toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`)
      }
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(compressed)
      onImageUpload(compressed)
    } catch {
      toast.error('图片处理失败，请重试')
    }
  }

  // --- 拖拽 ---
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragActive(true)
  }
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragActive(false)
  }
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current = 0; setIsDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // --- 弹窗按钮回调 ---
  const handleChooseFileUpload = () => {
    setShowUploadModal(false)
    setTimeout(() => fileInputRef.current?.click(), 200)
  }

  const handleChooseCamera = () => {
    setShowUploadModal(false)
    setTimeout(() => cameraInputRef.current?.click(), 200)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteModal(true)
  }

  const confirmRemoveImage = () => {
    setPreview(null); onClear?.(); setShowDeleteModal(false)
  }

  return (
    <div className="w-full">
      {/* ===== 上传区域（只管拖拽 + 点击弹窗） ===== */}
      <div
        onClick={() => { if (!isLoading && !preview) setShowUploadModal(true) }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-[1.5rem] p-8 text-center transition-all duration-300
          ${!preview ? 'cursor-pointer' : ''}
          ${isDragActive
            ? 'border-indigo-500 bg-indigo-50/50 shadow-inner shadow-indigo-100 scale-[1.01]'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-lg hover:shadow-slate-100/50'}
          ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {/* 右上角删除按钮 */}
        {preview && !isLoading && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 transition-all hover:scale-110 z-10"
            title="删除图片"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {preview ? (
          <div className="space-y-4">
            <div className="relative group w-full max-w-sm mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <img src={preview} alt="预览" className="relative w-full max-h-48 object-contain rounded-2xl shadow-xl ring-1 ring-slate-900/5" />
            </div>
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-32 relative">
                  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg animate-pulse">
                    <path fill="#E0E7FF" d="M39.5,-51.2C50.8,-44.3,58.1,-31,62.1,-16C66.1,-1,66.7,15.6,59.5,28.8C52.2,42,37.1,51.7,21.6,57.8C6,63.8,-10,66.1,-24.4,61.1C-38.7,56.1,-51.4,43.7,-58.5,29C-65.6,14.3,-67.1,-2.6,-62.4,-17.2C-57.7,-31.8,-46.8,-44.1,-34.6,-51C-22.4,-57.9,-9,-59.3,3.4,-63.7C15.8,-68.1,28.1,-58.1,39.5,-51.2Z" transform="translate(100 100)" />
                    <g transform="translate(100, 100)">
                      <rect x="-30" y="-35" width="60" height="50" rx="4" fill="#4F46E5" />
                      <circle cx="0" cy="-10" r="10" fill="#fff" opacity="0.8" />
                      <path d="M-10,15 L0,5 L10,15" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                  </svg>
                </div>
                <p className="text-indigo-600 font-bold text-sm tracking-wide">AI 正在识别中</p>
              </div>
            ) : (
              <p className="text-slate-500 font-medium text-xs bg-white/50 inline-block px-3 py-1.5 rounded-full border border-slate-100">
                点击更换图片，或拖拽新图片到此处
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {isDragActive ? (
              <>
                <div className="w-48 h-36 mx-auto animate-bounce">
                  <img src={page('/illustrations/undraw_upload-warning_aqma.svg')} alt="" className="w-full h-full object-contain drop-shadow-xl opacity-90" />
                </div>
                <p className="text-indigo-600 font-bold text-base">松开鼠标上传图片</p>
              </>
            ) : (
              <>
                <div className="w-48 h-36 mx-auto">
                  <img src={page('/illustrations/undraw_upload-warning_aqma.svg')} alt="" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-700 font-bold text-base">点击上传学生证图片</p>
                  <p className="text-xs text-slate-400 font-medium">支持 JPG、PNG、WebP、GIF、BMP（10MB 以内），或直接拖拽图片到此处</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== 隐藏 input（在上传区域外部，避免事件冒泡干扰） ===== */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInputChange} />

      {/* ===== 上传方式选择弹窗（在上传区域外部，点击不会冒泡到上传区） ===== */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-[1.5rem] shadow-2xl w-full max-w-[360px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">选择上传方式</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-5 space-y-2">
              <button
                type="button"
                onClick={handleChooseFileUpload}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">选择图片</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">从手机相册或电脑文件夹中选取</p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleChooseCamera}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition-colors shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">拍照上传</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">直接打开相机拍摄学生证</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 删除确认弹窗 ===== */}
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
          <p className="text-slate-700 font-bold text-lg">确定要删除当前预览的图片吗？</p>
          <p className="text-sm text-slate-500 mt-2">删除图片后，已识别的文本信息并不会被清除。</p>
        </div>
      </Modal>
    </div>
  )
}
