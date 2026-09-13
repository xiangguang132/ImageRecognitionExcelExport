'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface VoiceRecorderProps {
  isOpen: boolean
  onClose: () => void
  onRecordingComplete: (audioBlob: Blob) => void
}

type RecordingState = 'idle' | 'recording' | 'recorded'

// 检测浏览器是否支持录音
function isRecordingSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    window.MediaRecorder
  )
}

// 选择最佳 MIME 类型
function getPreferredMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export default function VoiceRecorder({ isOpen, onClose, onRecordingComplete }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)

  // 延迟检测录音支持，避免 SSR/CSR 不一致导致 hydration mismatch
  useEffect(() => {
    setSupported(isRecordingSupported())
  }, [])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 清理资源
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
  }, [audioUrl])

  // 弹窗关闭时清理
  useEffect(() => {
    if (!isOpen) {
      cleanup()
      setState('idle')
      setAudioBlob(null)
      setAudioUrl(null)
      setError(null)
      setElapsedSeconds(0)
    }
  }, [isOpen, cleanup])

  // 组件卸载时清理
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // 格式化时间 MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // 开始录音
  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      streamRef.current = stream
      audioChunksRef.current = []

      const mimeType = getPreferredMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setState('recorded')

        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      recorder.onerror = () => {
        setError('录音出错，请重试')
        setState('idle')
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      recorder.start(100) // 每 100ms 触发一次 ondataavailable
      setState('recording')
      setElapsedSeconds(0)

      // 启动计时器
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          if (prev >= 59) {
            // 60 秒自动停止
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err: any) {
      console.error('[语音录制] 获取麦克风失败:', err)
      if (err.name === 'NotAllowedError') {
        setError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
      } else if (err.name === 'NotFoundError') {
        setError('未检测到麦克风设备')
      } else {
        setError('无法访问麦克风: ' + (err.message || '请检查浏览器设置'))
      }
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  // 重新录音
  const retryRecording = () => {
    cleanup()
    setState('idle')
    setAudioBlob(null)
    setAudioUrl(null)
    setElapsedSeconds(0)
    setError(null)
  }

  // 发送识别
  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob)
      onClose()
    }
  }

  // 不支持录音
  if (!supported) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* 弹窗内容 */}
      <div
        className="relative bg-white rounded-[1.5rem] shadow-2xl w-full max-w-[380px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 pt-5 pb-2 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">语音识别</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 录音区域 */}
        <div className="px-6 py-8 flex flex-col items-center gap-5">
          {/* 录音按钮 */}
          <div className="relative">
            {/* 录音中的脉冲环 */}
            {state === 'recording' && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-400 animate-recording-ring" />
                <div className="absolute inset-0 rounded-full bg-red-400 animate-recording-ring" style={{ animationDelay: '0.4s' }} />
              </>
            )}

            <button
              type="button"
              onClick={state === 'recording' ? stopRecording : state === 'recorded' ? undefined : startRecording}
              disabled={state === 'recorded'}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                ${state === 'idle'
                  ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 hover:from-rose-600 hover:to-pink-600 hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer'
                  : state === 'recording'
                    ? 'bg-red-500 text-white shadow-xl shadow-red-500/40 animate-recording-pulse cursor-pointer'
                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 cursor-default'
                }`}
            >
              {state === 'idle' && (
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {state === 'recording' && (
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              )}
              {state === 'recorded' && (
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>

          {/* 状态文本和计时器 */}
          <div className="text-center space-y-1">
            {state === 'recording' && (
              <>
                <p className="text-2xl font-mono font-bold text-red-500 tracking-wider">
                  {formatTime(elapsedSeconds)}
                </p>
                <p className="text-sm text-slate-500 font-medium">正在录音，点击停止</p>
                <p className="text-xs text-slate-400">录音仅供身份核验，请勿泄露密码等隐私</p>
                <p className="text-xs text-slate-400">请遵守法律法规，文明发言，禁止侮辱及涉政敏感言论</p>
              </>
            )}
            {state === 'idle' && (
              <>
                <p className="text-sm font-bold text-slate-700">点击开始录音</p>
                <p className="text-xs text-slate-400">请说出学号、姓名等学生证信息</p>
                <p className="text-xs text-slate-400">录音仅供身份核验，请勿泄露密码等隐私</p>
                <p className="text-xs text-slate-400">请遵守法律法规，文明发言，禁止侮辱及涉政敏感言论</p>
              </>
            )}
            {state === 'recorded' && (
            <>
                <p className="text-sm font-bold text-emerald-600">录音完成 ({formatTime(elapsedSeconds)})</p>
                {audioUrl && (
                  <audio ref={audioRef} src={audioUrl} controls className="mt-2 h-8 w-64" />
                )}
              </>
            )}
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
              {error}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-5 flex gap-2 justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-sm"
          >
            取消
          </button>

          {state === 'recorded' && (
            <>
              <button
                type="button"
                onClick={retryRecording}
                className="px-4 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-sm"
              >
                重新录音
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="px-5 py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/20 hover:shadow-xl transition-all text-sm"
              >
                发送识别
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
