/**
 * 语音识别模块
 * 使用千问音频 API 通过后端 /api/voice-recognize 进行识别
 */

import { StudentInfo, cleanStudentId, generateEmail, mapRole } from './recognize'

/**
 * 调用后端 API 进行 AI 语音识别
 */
export async function recognizeVoiceWithAI(audioBlob: Blob): Promise<StudentInfo> {
  console.log('[前端] ===== 开始 AI 语音识别 =====')
  console.log('[前端] 音频大小:', (audioBlob.size / 1024).toFixed(1) + 'KB', '| 类型:', audioBlob.type)

  // 检查音频大小（限制 10MB）
  if (audioBlob.size > 10 * 1024 * 1024) {
    throw new Error('录音文件过大，请缩短录音时间后重试')
  }

  const formData = new FormData()
  // 根据浏览器 MIME 类型设置扩展名
  const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm'
  formData.append('audio', audioBlob, `recording.${ext}`)

  console.log('[前端] 发送请求到 /api/voice-recognize ...')
  const startTime = Date.now()

  const response = await fetch('/api/voice-recognize', {
    method: 'POST',
    body: formData
  })

  const elapsed = Date.now() - startTime
  console.log('[前端] 语音识别 API 响应耗时:', elapsed, 'ms')

  if (!response.ok) {
    const err = await response.json()
    console.error('[前端] ❌ 语音识别 API 返回错误:', err)
    throw new Error(err.error || '语音识别失败')
  }

  const data = await response.json()
  console.log('[前端] AI 语音识别原始结果:', data)

  // 处理学号和邮箱（复用 recognize.ts 的函数）
  const cleanId = data.studentId ? cleanStudentId(data.studentId) : ''
  const email = cleanId ? generateEmail(cleanId) : ''

  const info: StudentInfo = {
    studentId: cleanId,
    name: data.name || '',
    email: email,
    major: '',
    role: data.role ? mapRole(data.role) : '',
    interestDirection: '',
    interestTopic: ''
  }

  console.log('[前端] ===== 语音识别提取结果 =====')
  console.table({
    学号: info.studentId || '(空)',
    姓名: info.name || '(空)',
    邮箱: info.email || '(空)',
    专业: info.major || '(空，需手动填写)',
    角色: info.role || '(空)',
    兴趣方向: info.interestDirection || '(空，需手动选择)',
    意向主题: info.interestTopic || '(空，需手动填写)'
  })

  return info
}
