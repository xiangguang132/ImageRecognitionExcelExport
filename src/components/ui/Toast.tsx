'use client'

import { useState, useEffect, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

// 全局 toast 触发函数
let globalAddToast: ((type: ToastType, message: string) => void) | null = null

export const toast = {
  success: (message: string) => globalAddToast?.('success', message),
  error: (message: string) => globalAddToast?.('error', message),
  info: (message: string) => globalAddToast?.('info', message),
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
}

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-emerald-500/10',
  error: 'bg-rose-50 text-rose-700 border-rose-200/60 shadow-rose-500/10',
  info: 'bg-blue-50 text-blue-700 border-blue-200/60 shadow-blue-500/10',
}

const iconBg: Record<ToastType, string> = {
  success: 'bg-emerald-100 text-emerald-600',
  error: 'bg-rose-100 text-rose-600',
  info: 'bg-blue-100 text-blue-600',
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  useEffect(() => {
    globalAddToast = addToast
    return () => { globalAddToast = null }
  }, [addToast])

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} item={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 下一帧触发入场动画
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(item.id), 300)
    }, 3000)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [item.id, onRemove])

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-lg shadow-slate-200/50 transition-all duration-300 max-w-xs
        ${styles[item.type]}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${iconBg[item.type]}`}>
        {icons[item.type]}
      </span>
      <span className="text-sm font-semibold">{item.message}</span>
    </div>
  )
}
