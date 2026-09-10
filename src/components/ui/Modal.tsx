'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  children: React.ReactNode
  confirmText?: string
  cancelText?: string
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = '确认',
  cancelText = '取消'
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  const handleClose = () => {
    onClose()
  }

  const handleConfirm = () => {
    onConfirm()
  }

  // 处理原生 dialog 的 cancel 事件 (按 ESC 触发)
  const handleCancel = (e: React.FormEvent<HTMLDialogElement>) => {
    e.preventDefault()
    onClose()
  }

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onCancel={handleCancel}
      className="backdrop:bg-black/50 p-0 rounded-xl shadow-2xl w-full max-w-md overflow-hidden m-auto"
    >
      <div className="bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-gray-700 leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  )
}
