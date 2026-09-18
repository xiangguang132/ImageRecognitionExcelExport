/**
 * 识别模块
 * 共享类型定义 + 工具函数
 * 图片识别：使用千问视觉 API 通过后端 /api/recognize
 * 语音识别：见 voice.ts
 */

export interface StudentInfo {
  studentId: string    // 学号（图片原始格式）
  name: string         // 姓名（繁体中文）
  email: string        // 邮箱（自动生成）
  major: string        // 专业（用户手动填写）
  role: string         // 角色
  interestDirection: string  // 未来兴趣方向（项目/研究）
  interestTopic: string      // 意向参与主题
}

/**
 * 处理学号：只保留数字和大写字母
 * 例如 "A-C2-0130-1" → "AC201301"
 */
export function cleanStudentId(raw: string): string {
  const cleaned = raw.replace(/[^0-9A-Z]/gi, '').toUpperCase()
  console.log('[前端] 学号清洗:', raw, '→', cleaned)
  return cleaned
}

/**
 * 学校邮箱后缀（固定）
 */
export const EMAIL_SUFFIX = '@connect.um.edu.mo'

/**
 * 邮箱输入规范化：无 @ 则补后缀；后缀不对则替换为正确后缀；
 * 空值或无前缀（@开头）不动，交由后端校验。
 * 返回规范后的值与是否发生过修正。
 */
export function normalizeEmailInput(value: string): { email: string; fixed: boolean } {
  const val = (value || '').trim()
  if (!val) return { email: '', fixed: false }
  if (!val.includes('@')) return { email: val + EMAIL_SUFFIX, fixed: true }
  const at = val.indexOf('@')
  const prefix = val.slice(0, at)
  const domain = val.slice(at + 1).toLowerCase()
  if (!prefix) return { email: val, fixed: false }
  if ('@' + domain === EMAIL_SUFFIX) return { email: val, fixed: false }
  return { email: prefix + EMAIL_SUFFIX, fixed: true }
}

/**
 * 根据学号生成默认邮箱
 * 规则（甲方固定要求）：学号去掉最后一位 + @connect.um.edu.mo
 * 例如 AC201301 → ac20130@connect.um.edu.mo
 *
 * 注意：该规则下末位不同的学号（如 AC201301 / AC201302）会生成同一邮箱。
 * 入库时若邮箱已存在，后端返回 409，管理员需核对该学生的真实邮箱后手工修改再提交。
 */
export function generateEmail(studentId: string): string {
  // 按甲方规格：无条件去掉最后一位（学号末位恒为数字校验位）
  const prefix = studentId.length > 1 ? studentId.slice(0, -1) : studentId
  const email = prefix.toLowerCase() + EMAIL_SUFFIX
  console.log('[前端] 邮箱生成:', studentId, '→', email)
  return email
}

/**
 * 角色映射：将 AI 识别的角色文本转为标准值
 * 支持 "STUDENT 学生" / "TEACHER 教师" 等复杂格式
 */
export function mapRole(raw: string): string {
  const lowerRaw = raw.toLowerCase()

  if (lowerRaw.includes('student') || lowerRaw.includes('学生') || lowerRaw.includes('學生')) {
    return 'student'
  }

  if (lowerRaw.includes('teacher') || lowerRaw.includes('教师') || lowerRaw.includes('教師')) {
    return 'teacher'
  }

  console.log('[前端] 角色映射: 未匹配到标准值，原样返回:', raw)
  return raw
}

/**
 * 调用后端 API 进行 AI 视觉识别
 * @param fetcher 可注入的请求函数（页面层传入 authFetch 以携带登录态，默认 fetch）
 */
export async function recognizeWithAI(
  file: File,
  fetcher: (url: string, options?: RequestInit) => Promise<Response> = fetch
): Promise<StudentInfo> {
  console.log('[前端] ===== 开始 AI 识别 =====')
  console.log('[前端] 文件:', file.name, '|', (file.size / 1024).toFixed(1) + 'KB')

  const formData = new FormData()
  formData.append('image', file)

  console.log('[前端] 发送请求到 /api/recognize ...')
  const startTime = Date.now()

  const response = await fetcher('/api/recognize', {
    method: 'POST',
    body: formData
  })

  const elapsed = Date.now() - startTime
  console.log('[前端] API 响应耗时:', elapsed, 'ms')

  if (!response.ok) {
    // 错误体可能不是 JSON（如网关 502 页面），解析失败时给默认提示
    let message = '识别失败'
    try {
      const err = await response.json()
      message = err.error || message
    } catch { /* 忽略解析失败 */ }
    console.error('[前端] ❌ API 返回错误:', message)
    throw new Error(message)
  }

  const data = await response.json()
  console.log('[前端] AI 识别原始结果:', data)

  // 处理学号和邮箱
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

  console.log('[前端] ===== 最终提取结果 =====')
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
