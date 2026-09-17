import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'

// POST - 图片识别（已登录用户均可）
export const POST = withAuth(async (request) => {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: '未找到图片' }, { status: 400 })
    }

    // 服务端校验：只接受图片类型，大小上限 10MB（前端校验可被绕过）
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG / PNG / WebP / GIF / BMP 图片' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '图片过大，请上传 10MB 以内的图片' }, { status: 400 })
    }

    // 将图片转为 base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'

    console.log('[API] ===== 收到识别请求 =====')
    console.log('[API] 文件:', file.name, '|', (file.size / 1024).toFixed(1) + 'KB')

    const apiKey = process.env.QWEN_API_KEY
    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json(
        { error: '请在 .env 文件中配置 QWEN_API_KEY' },
        { status: 500 }
      )
    }

    // 调用千问视觉 API（OpenAI 兼容模式）
    console.log('[API] 正在调用千问视觉 API ...')
    const startTime = Date.now()

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        // AI hanging 时最多等 60 秒，避免 worker 被拖死
        signal: AbortSignal.timeout(60_000),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'qwen-vl-plus',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                },
                {
                  type: 'text',
                  text: `你是一个学生证信息提取助手。请仔细识别这张学生证图片中的所有文字信息。

要求：
1. 所有识别出的文字必须保持繁体中文原样输出，不要转换为简体
2. 严格按照以下 JSON 格式返回，不要返回其他内容：

{
  "studentId": "学号原始内容（保留图片上的原始格式，如 A-C2-0130-1）",
  "name": "姓名（繁体中文）",
  "role": "角色（如 STUDENT、TEACHER 等，保持图片上的原文）"
}

注意：
- 学号请完整识别，包括连字符等符号，不要做任何处理
- 如果某个字段无法识别，返回空字符串 ""
- 只返回 JSON，不要返回任何其他文字`
                }
              ]
            }
          ],
          max_tokens: 500
        })
      }
    )

    const elapsed = Date.now() - startTime
    console.log('[API] 千问 API 响应耗时:', elapsed, 'ms')

    if (!response.ok) {
      const error = await response.text()
      console.error('[API] ❌ 千问 API 错误:', response.status, error)
      return NextResponse.json(
        { error: `千问 API 调用失败: ${response.status}` },
        { status: 500 }
      )
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    console.log('[API] -------- 千问返回原文 --------')
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
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'AI 识别超时，请重试' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
})
