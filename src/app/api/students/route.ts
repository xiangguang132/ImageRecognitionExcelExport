import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStudentInput, normalizeStudentId } from '@/lib/validation'
import { hashPassword } from '@/lib/auth'
import { withAdmin } from '@/lib/auth-middleware'

// 单表说明：学生档案 + 登录账号一体存于 users 表。
// 本接口的 `role` 字段指在校身份（student/teacher），对应 DB 列 `identity`；
// 权限角色恒为 user，管理员为 .env 虚拟账号，不经过本接口。

// 默认初始密码（bcrypt 入库，学生首次登录强制改密）
const DEFAULT_PASSWORD = '123456'

const RANDOM_LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/**
 * 邮箱碰撞时在 @ 前追加随机字母（如 ac20130@ → ac20130x@），
 * 最多重试 50 次；返回可用的新邮箱，分配失败返回 null。
 */
async function resolveEmailWithRandomSuffix(email: string): Promise<string | null> {
  const at = email.lastIndexOf('@')
  if (at <= 0) return null
  const prefix = email.slice(0, at)
  const domain = email.slice(at)
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}${RANDOM_LETTERS[Math.floor(Math.random() * RANDOM_LETTERS.length)]}${domain}`
    const taken = await prisma.user.findUnique({ where: { email: candidate } })
    if (!taken) return candidate
  }
  return null
}

// 行映射：把 DB 列 identity 以旧契约名 role 返回，前端零改动
function toStudentRow(u: {
  id: number; studentId: string | null; name: string | null; email: string | null;
  major: string | null; identity: string | null; interestDirection: string | null;
  interestTopic: string | null; mustChangePassword: number; createdAt: Date; updatedAt: Date
}) {
  return {
    id: u.id,
    studentId: u.studentId,
    name: u.name,
    email: u.email,
    major: u.major,
    role: u.identity,
    identity: u.identity,
    interestDirection: u.interestDirection,
    interestTopic: u.interestTopic,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }
}

// GET - 获取学生信息（分页，仅管理员）
export const GET = withAdmin(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const rawPageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.min(Math.max(rawPageSize, 1), 100)
      : 10
    const skip = (page - 1) * pageSize

    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where: { isDel: 0, role: 'user' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.user.count({ where: { isDel: 0, role: 'user' } })
    ])

    return NextResponse.json({ data: users.map(toStudentRow), totalCount, page, pageSize })
  } catch (error) {
    console.error('获取学生信息失败:', error)
    return NextResponse.json(
      { error: '获取学生信息失败' },
      { status: 500 }
    )
  }
})

// POST - 新增学生信息并开通账号（仅管理员）
// 学生本人更新兴趣信息请走 PUT /api/students/mine（白名单仅两个兴趣字段）。
// 邮箱沿甲方规则「学号去尾」自动生成；为空或碰撞时：
// - emailConflict === 'skip'：不存邮箱直接入库
// - emailConflict === 'suffix'：在 @ 前追加随机字母后入库（最多重试 50 次）
// - 否则碰撞返回 409 + conflict: true，由前端弹窗让用户二选一
export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json()

    // 必填字段：学号 + 姓名（空对象 / 全空不再入库）
    // 本分支规则：学号不登记末位数字，归一化（去尾）后再判重入库
    const rawStudentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!rawStudentId || !name) {
      return NextResponse.json(
        { error: '请填写学号和姓名' },
        { status: 400 }
      )
    }
    const studentId = normalizeStudentId(rawStudentId)
    if (!studentId) {
      return NextResponse.json(
        { error: '学号格式不正确' },
        { status: 400 }
      )
    }

    const emailStrategy = body.emailConflict === 'skip' ? 'skip'
      : body.emailConflict === 'suffix' ? 'suffix' : null
    let email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    if (emailStrategy === 'skip') email = ''

    // 在校身份：兼容新旧字段名（identity / role）
    const identity = typeof body.identity === 'string' && body.identity
      ? body.identity
      : (typeof body.role === 'string' ? body.role : null)

    // 写入层统一校验（格式 + 敏感内容），拦截后不入库
    const validation = validateStudentInput({ ...body, role: identity ?? body.role })
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors, fieldErrors: validation.fieldErrors },
        { status: 400 }
      )
    }

    // 邮箱冲突处理（排除自己后依然被占用的情况）
    // 返回：resolvedEmail（可入库的邮箱，'' 表示不存）或直接返回 Response（409）
    const resolveEmail = async (selfId: number | null): Promise<string | Response> => {
      if (!email) return ''
      const existingEmail = await prisma.user.findUnique({ where: { email } })
      if (existingEmail && existingEmail.id !== selfId) {
        if (emailStrategy === 'suffix') {
          const resolved = await resolveEmailWithRandomSuffix(email)
          if (!resolved) {
            return NextResponse.json(
              { error: '邮箱随机后缀分配失败，请手工修改邮箱后重试', conflict: true },
              { status: 409 }
            )
          }
          return resolved
        }
        return NextResponse.json(
          {
            error: '该邮箱已被使用（可能是学号去尾后相同），请选择不填邮箱、追加随机字母，或手工修改邮箱',
            conflict: true
          },
          { status: 409 }
        )
      }
      return email
    }

    // ---- 管理员：新建 ----
    // 学号去重（未删除记录中已存在则拒绝，避免重复录入）
    const existingSid = await prisma.user.findFirst({
      where: { studentId, isDel: 0 }
    })
    if (existingSid) {
      return NextResponse.json(
        { error: '该学号已存在，请勿重复录入' },
        { status: 409 }
      )
    }

    const resolved = await resolveEmail(null)
    if (resolved instanceof Response) return resolved
    email = resolved

    const student = await prisma.user.create({
      data: {
        studentId, // 存去空格后的值，与判重字段一致
        name: body.name || null,
        email: email || null,
        password: await hashPassword(DEFAULT_PASSWORD),
        role: 'user',
        major: body.major || null,
        identity: identity || null,
        interestDirection: body.interestDirection || null,
        interestTopic: body.interestTopic || null,
        mustChangePassword: 1
      }
    })

    return NextResponse.json(toStudentRow(student), { status: 201 })
  } catch (error) {
    console.error('保存学生信息失败:', error)
    return NextResponse.json(
      { error: '保存学生信息失败' },
      { status: 500 }
    )
  }
})
