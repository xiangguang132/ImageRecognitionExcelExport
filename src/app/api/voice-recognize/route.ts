import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'

// POST - 语音识别（已登录用户均可）
export const POST = withAuth(async (request) => {
  try {
    const formData = await request.formData()
    const file = formData.get('audio') as File

    if (!file) {
      return NextResponse.json({ error: '未找到音频文件' }, { status: 400 })
    }

    // 将音频转为 base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Audio = buffer.toString('base64')
    const mimeType = file.type || 'audio/webm'

    console.log('[API] ===== 收到语音识别请求 =====')
    console.log('[API] 文件:', file.name, '|', (file.size / 1024).toFixed(1) + 'KB', '| 类型:', mimeType)

    const apiKey = process.env.QWEN_API_KEY
    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json(
        { error: '请在 .env 文件中配置 QWEN_API_KEY' },
        { status: 500 }
      )
    }

    // 音频格式映射（format 须与实际音频数据格式一致）
    let audioFormat: string
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      audioFormat = 'mp4'
    } else if (mimeType.includes('wav')) {
      audioFormat = 'wav'
    } else if (mimeType.includes('ogg')) {
      audioFormat = 'ogg'
    } else {
      // 浏览器默认录音格式 webm/opus
      audioFormat = 'webm'
    }

    // 构造 data URI（qwen3.5-omni-flash 要求带 data: 前缀）
    const dataUri = `data:${mimeType};base64,${base64Audio}`

    // 调用千问多模态模型（OpenAI 兼容模式）
    console.log('[API] 正在调用千问语音识别 API (模型: qwen3.5-omni-flash) ...')
    const startTime = Date.now()

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'qwen3.5-omni-flash',
          modalities: ['text'],
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_audio',
                  input_audio: {
                    data: dataUri,
                    format: audioFormat
                  }
                },
                {
                  type: 'text',
                  text: `你是一个学生证信息语音提取助手。用户会用语音自我介绍，包含学号、姓名、专业、角色、兴趣方向、意向主题等信息。
请仔细听语音内容，从中提取学生证相关信息。

要求：
1. 所有识别出的文字必须保持繁体中文原样输出，不要转换为简体
2. 严格按照以下 JSON 格式返回，不要返回其他内容：

{
  "studentId": "学号（如 A-C2-0130-1 或 AC201301）",
  "name": "姓名（繁体中文）",
  "major": "专业名称（繁体中文）",
  "role": "角色（如 STUDENT、TEACHER 等）",
  "interestDirection": "兴趣方向，可能包含"项目"或"研究"，用逗号分隔，如"项目,研究"或"项目"",
  "interestTopic": "意向参与主题（繁体中文）"
}

注意：
- 请准确识别学号，包括字母、数字和连字符
- 如果用户说了"学生"或"student"，role 填 "STUDENT"
- 如果用户说了"教师"或"teacher"，role 填 "TEACHER"
- 如果用户提到"项目"方向，interestDirection 包含"项目"
- 如果用户提到"研究"方向，interestDirection 包含"研究"
- 如果某个字段没有在语音中提到，返回空字符串 ""
- 只返回 JSON，不要返回任何其他文字`
                }
              ]
            }
          ],
          max_tokens: 800
        })
      }
    )

    const elapsed = Date.now() - startTime
    console.log('[API] 千问语音 API 响应耗时:', elapsed, 'ms')

    if (!response.ok) {
      const error = await response.text()
      console.error('[API] ❌ 千问语音 API 错误:', response.status, error)
      return NextResponse.json(
        { error: `千问 API 调用失败: ${response.status}` },
        { status: 500 }
      )
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    console.log('[API] -------- 千问语音返回原文 --------')
    console.log(content)
    console.log('[API] -------- 原文结束 --------')

    // 解析 JSON
    let parsed
    try {
      // 去除可能的 markdown 代码块标记
      const jsonStr = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(jsonStr)
      console.log('[API] JSON 解析成功:', parsed)
    } catch (e) {
      console.error('[API] ❌ JSON 解析失败，原始内容:', content)
      return NextResponse.json(
        { error: 'AI 返回内容解析失败', raw: content },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[API] ❌ 服务器错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
})
