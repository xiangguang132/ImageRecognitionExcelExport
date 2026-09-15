'use client'

/**
 * useConfirm — 通用确认弹窗 Hook
 *
 * 封装「弹出确认 → 用户点确认/取消 → 执行后续逻辑」的完整流程，
 * 消除每个页面重复的 showXxxModal / pendingXxx / confirmXxx 样板代码。
 *
 * 用法：
 *   const { confirm, Dialog } = useConfirm()
 *
 *   // 在事件处理中（支持带自定义内容的确认）：
 *   const ok = await confirm({ title: '确认删除？', message: '此操作不可恢复' })
 *   const ok = await confirm({ title: '确认', children: <MyCustomContent /> })
 *
 *   // 在 JSX 中渲染：
 *   <Dialog />
 */

import { useState, useCallback, useRef, ReactNode } from 'react'
import Modal from './Modal'

interface ConfirmOptions {
  title?: string
  message?: string
  /** 自定义内容，优先于 message */
  children?: ReactNode
  confirmText?: string
  cancelText?: string
}

interface ConfirmState {
  open: boolean
  title: string
  message: string
  children: ReactNode
  confirmText: string
  cancelText: string
}

export function useConfirm(defaults?: Partial<ConfirmOptions>) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: defaults?.title ?? '确认操作',
    message: defaults?.message ?? '',
    children: defaults?.children ?? null,
    confirmText: defaults?.confirmText ?? '确认',
    cancelText: defaults?.cancelText ?? '取消',
  })

  const resolveRef = useRef<(value: boolean) => void>(null)

  const confirm = useCallback((options?: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setState({
        open: true,
        title: options?.title ?? defaults?.title ?? '确认操作',
        message: options?.message ?? defaults?.message ?? '',
        children: options?.children ?? defaults?.children ?? null,
        confirmText: options?.confirmText ?? defaults?.confirmText ?? '确认',
        cancelText: options?.cancelText ?? defaults?.cancelText ?? '取消',
      })
    })
  }, [defaults])

  const handleConfirm = useCallback(() => {
    setState(prev => ({ ...prev, open: false }))
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const handleClose = useCallback(() => {
    setState(prev => ({ ...prev, open: false }))
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  const Dialog = useCallback(() => (
    <Modal
      isOpen={state.open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
    >
      {state.children ?? (
        <p className="text-slate-700 font-medium text-sm text-center">
          {state.message}
        </p>
      )}
    </Modal>
  ), [state, handleConfirm, handleClose])

  return { confirm, Dialog }
}
