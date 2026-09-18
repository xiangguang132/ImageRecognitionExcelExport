/**
 * 学生信息写入校验模块（服务端 · L1）
 *
 * 功能：
 *   1. 字段格式校验 —— 姓名 / 学号 / 邮箱 / 专业 / 角色 / 未来兴趣方向 / 意向参与主题
 *   2. 敏感内容拦截 —— 对自由文本字段做敏感词过滤（独立于千问模型自身的护栏）
 *
 * 接入点：POST /api/students 与 PUT /api/students/[id]，统一在写入层拦截，
 * 覆盖「语音识别」「OCR 识别」「手工录入」所有入口，一条记录只校验一次。
 *
 * 局限说明：
 *   - 静态敏感词表适合拦截「辱骂 / 暴力 / 露骨色情」等直白、低频变化的违规内容；
 *   - 「政治敏感」属语境相关、随时态变化的类目，静态词表既会漏报（谐音 / 拆字 /
 *     借代）也会误伤（正常词含敏感子串），不建议用本词表覆盖。若确需对涉政内容
 *     做检测，请接入阿里云内容安全（Green）等语义审核服务。
 *   - 词表可按校方本地语境（含澳门粤语口语习惯）在下方 SENSITIVE_WORDS 中增删调整。
 */

type StudentField = 'studentId' | 'name' | 'email' | 'major' | 'role' | 'interestDirection' | 'interestTopic'
export type StudentInput = Partial<Record<StudentField, string | null | undefined>>

export interface ValidationResult {
  ok: boolean
  /** 字段 -> 面向用户的校验错误提示 */
  fieldErrors: Partial<Record<StudentField, string>>
  /** fieldErrors 的值（方便直接取第一条提示） */
  errors: string[]
}

// ============ 敏感词库 ============

/**
 * 敏感词库（简体 / 繁体及港澳粤语常用口语均已考虑）。
 *
 * 匹配前会对文本做小写归一化并去掉空白（含全角空格），可拦截「傻 逼」「你 妈 的」
 * 一类拆词绕过；但不去除标点，避免把正常内容误拼成敏感词导致误报。
 *
 * 加入新词时请注意避开正常姓名 / 学术词汇的子串：
 * 例如不要加「尼玛」（藏区同胞常见人名）、「杀人」（"杀人鲸"等学术词）、
 * 单字「七/柒」，以及英文单词内部出现的字母组合（如 "sb"）。
 */
export const SENSITIVE_WORDS: readonly string[] = [
  // ---- 侮辱 / 詈语（简 / 繁）----
  '傻逼', '傻屄', '傻屌',
  '你妈的', '你媽的',
  '你妈逼', '你媽逼',
  '操你妈', '操你媽', '操尼玛', '草泥马', '草泥馬',
  '他妈的', '他媽的', '妈的', '媽的',
  '狗日的', '狗娘养的', '狗娘養的',
  '王八蛋', '王八羔子',
  '婊子', '贱人', '賤人', '龟孙', '龜孫',
  '你麻痹', '傻狗', '脑残', '腦殘',

  // ---- 港澳粤语常用詈语（澳门本地语境）----
  '仆街', '屌你老母', '傻閪', '閪', 'on9',

  // ---- 暴力 / 威胁 ----
  '去死吧', '弄死你', '打死你', '杀了你', '殺了你', '砍死你', '剁了你',
  '炸死你', '灭了你', '滅了你', '干死你', '死全家', '全家死光', '杀你全家',

  // ---- 网络缩写詈语 ----
  'nmsl', 'cnm', 'wcnm', 'mdzz',

  // ---- 露骨色情（犯罪 / 骚扰性质）----
  '强奸', '強姦', '肏'
]

// ============ 格式校验 ============

// 姓名：仅允许各类字母（含简繁体汉字、拉丁字母）、·、空格、单引号、连字符
const NAME_RE = /^[\p{L}\s·'’.\-]+$/u
// 学号：仅允许字母和数字（前端 cleanStudentId 已统一为大写并去除连字符）
const STUDENT_ID_RE = /^[A-Za-z0-9]{4,20}$/
// 邮箱：标准邮箱格式
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 专业：允许中英文字母、数字、空格及常见分隔符
const MAJOR_RE = /^[\p{L}\p{N}\s·.()（）、&'’\-]+$/u
// 意向主题：禁止尖括号/花括号，避免被当作模板语句或脚本内容
const ANGLE_RE = /[<>{}]/

/** 检测是否包含 C0 控制字符（0x00-0x08、0x0B、0x0C、0x0E-0x1F） */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) return true
  }
  return false
}

/** 将任意输入规整为 trim 后的字符串（null/undefined/非字符串一律视为空串） */
function toStr(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 学号归一化（本分支规则：不登记末位数字）。
 * 清洗（只保留字母数字、大写）后无条件去掉最后一位再入库/判重/登录，
 * 例如 "A-C2-0130-1" → "AC201301" → 登记为 "AC20130"。
 * 注意：该规则假设去尾后依然唯一，若出现末位不同的重复学号，入库时按重复拒绝。
 */
export function normalizeStudentId(raw: unknown): string {
  const cleaned = toStr(raw).replace(/[^0-9A-Z]/gi, '').toUpperCase()
  if (cleaned.length <= 1) return ''
  return cleaned.slice(0, -1)
}

/**
 * 查找文本命中的第一个敏感词，未命中返回 null。
 * 归一化：小写 + 去空白（含全角空格），两次都匹配，防止拆词绕过。
 */
function findSensitiveWord(text: string): string | null {
  const lower = text.toLowerCase()
  const collapsed = lower.replace(/\s+/g, '')
  for (const word of SENSITIVE_WORDS) {
    if (lower.includes(word) || collapsed.includes(word)) return word
  }
  return null
}

/** 对单个自由文本字段做敏感词检查；命中时输出审计日志并返回用户提示 */
function sensitiveCheck(field: StudentField, label: string, text: string): string | null {
  const word = findSensitiveWord(text)
  if (word) {
    console.warn(`[校验] ${label} 命中敏感词`, { field, word, text })
    return `${label}包含敏感或违规内容，请修改后再提交`
  }
  return null
}

/**
 * 对一次学生信息写入做统一校验。
 * 规则为「有值才校验」：字段留空 / 为 null 时跳过，避免误伤可选字段，
 * 必填性由前端表单负责，后端兜底数据格式与内容安全。
 */
export function validateStudentInput(input: StudentInput = {}): ValidationResult {
  const fieldErrors: Partial<Record<StudentField, string>> = {}

  // 姓名
  const name = toStr(input.name)
  if (name) {
    if (name.length < 2 || name.length > 50) {
      fieldErrors.name = '姓名长度需为 2~50 个字符'
    } else if (!NAME_RE.test(name)) {
      fieldErrors.name = '姓名仅支持中英文及 ·、空格、单引号、连字符，不能包含数字或其他符号'
    } else {
      const sensitive = sensitiveCheck('name', '姓名', name)
      if (sensitive) fieldErrors.name = sensitive
    }
  }

  // 学号
  const studentId = toStr(input.studentId)
  if (studentId && !STUDENT_ID_RE.test(studentId)) {
    fieldErrors.studentId = '学号格式不正确（仅允许字母和数字，长度为 4~20 位）'
  }

  // 邮箱
  const email = toStr(input.email)
  if (email && !EMAIL_RE.test(email)) {
    fieldErrors.email = '邮箱格式不正确'
  }

  // 专业
  const major = toStr(input.major)
  if (major) {
    if (major.length < 2 || major.length > 60) {
      fieldErrors.major = '专业名称长度需为 2~60 个字符'
    } else if (!MAJOR_RE.test(major)) {
      fieldErrors.major = '专业名称包含不支持的字符'
    } else {
      const sensitive = sensitiveCheck('major', '专业', major)
      if (sensitive) fieldErrors.major = sensitive
    }
  }

  // 身份角色：配合前端下拉，只允许标准枚举值
  const role = toStr(input.role)
  if (role && role !== 'student' && role !== 'teacher') {
    fieldErrors.role = '身份角色只能是 student（学生）或 teacher（教师）'
  }

  // 未来兴趣方向：项目 / 研究的逗号组合
  const interestDirection = toStr(input.interestDirection)
  if (interestDirection) {
    const parts = interestDirection.split(',').map(s => s.trim()).filter(Boolean)
    const isValidDirection = parts.length > 0 && parts.length <= 2 && parts.every(p => p === '项目' || p === '研究')
    if (!isValidDirection) {
      fieldErrors.interestDirection = '未来兴趣方向只能是「项目」「研究」的组合'
    }
  }

  // 意向参与主题（自由文本，最需要敏感词拦截的字段）
  const interestTopic = toStr(input.interestTopic)
  if (interestTopic) {
    if (interestTopic.length < 2 || interestTopic.length > 100) {
      fieldErrors.interestTopic = '意向参与主题长度需为 2~100 个字符'
    } else if (hasControlChar(interestTopic) || ANGLE_RE.test(interestTopic)) {
      fieldErrors.interestTopic = '意向参与主题包含非法字符'
    } else {
      const sensitive = sensitiveCheck('interestTopic', '意向参与主题', interestTopic)
      if (sensitive) fieldErrors.interestTopic = sensitive
    }
  }

  const errors = Object.values(fieldErrors)
  return { ok: errors.length === 0, fieldErrors, errors }
}