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
      className="backdrop:bg-slate-900/40 backdrop-blur-sm p-0 rounded-[2rem] shadow-2xl w-full max-w-[480px] overflow-hidden m-auto border border-slate-100/50 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="bg-white">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 -mt-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-4 text-slate-600 leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
          {cancelText && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:translate-y-0.5"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  )
}
