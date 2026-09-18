import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStudentInput } from '@/lib/validation'
import { hashPassword } from '@/lib/auth'
import { withAdmin } from '@/lib/auth-middleware'

// 单表说明：学生档案 + 登录账号一体存于 users 表。
// 本接口的 `role` 字段指在校身份（student/teacher），对应 DB 列 `identity`；
// 权限角色恒为 user，管理员为 .env 虚拟账号，不经过本接口。

// 默认初始密码（bcrypt 入库，学生首次登录强制改密）
const DEFAULT_PASSWORD = '123456'

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
// 邮箱为登录键必填；密码默认 123456，mustChangePassword = 1 强制学生首次改密
export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json()

    // 必填字段：学号 + 姓名（空对象 / 全空不再入库）
    const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!studentId || !name) {
      return NextResponse.json(
        { error: '请填写学号和姓名' },
        { status: 400 }
      )
    }

    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    if (!email) {
      return NextResponse.json(
        { error: '请填写邮箱（邮箱为学生登录账号）' },
        { status: 400 }
      )
    }

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

    // 邮箱去重（邮箱为登录键）
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json(
        { error: '该邮箱已存在，请勿重复录入' },
        { status: 409 }
      )
    }

    const student = await prisma.user.create({
      data: {
        studentId, // 存去空格后的值，与判重字段一致
        name: body.name || null,
        email,
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
