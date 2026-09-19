import { NextRequest, NextResponse } from 'next/server'
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

// POST - 新增学生信息（学生端免登录公开 + 管理端手工录入共用）
// 邮箱沿甲方规则「学号去尾」自动生成；为空或已被使用时直接返回错误，由提交方手工修改后重试。
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 必填字段：学号 + 姓名（空对象 / 全空不再入库）
    // 学号统一大写入库（与登录归一化一致，直调接口传小写也不会错开）
    const studentId = typeof body.studentId === 'string' ? body.studentId.trim().toUpperCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!studentId || !name) {
      return NextResponse.json(
        { error: '请填写学号和姓名' },
        { status: 400 }
      )
    }

    let email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    // 邮箱必填：为空或已被使用时直接报错，由提交方手工修改后重试
    if (!email) {
      return NextResponse.json(
        { error: '请填写邮箱' },
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

    // 邮箱冲突处理（selfId：更新场景下排除自己；新建传 null）
    // 返回：可入库的邮箱，或直接返回 Response（409，由提交方手工修改后重试）
    // 注意：用 findFirst 而不用 findUnique，以便区分占用者是否已被删除
    const resolveEmail = async (selfId: number | null): Promise<string | Response> => {
      if (!email) return ''
      const existingEmail = await prisma.user.findFirst({ where: { email } })
      if (existingEmail && existingEmail.id !== selfId) {
        // 占用者是已删除记录：邮箱不可直接复用（唯一约束），提示更换或恢复
        if (existingEmail.isDel === 1) {
          return NextResponse.json(
            {
              error: '该邮箱曾被使用（原记录已删除），请更换邮箱，或恢复原记录后再修改',
              conflict: true
            },
            { status: 409 }
          )
        }
        return NextResponse.json(
          {
            error: '该邮箱已被使用（可能是学号去尾后相同），请手工修改邮箱后重新提交',
            conflict: true
          },
          { status: 409 }
        )
      }
      return email
    }

    // ---- 管理员：新建（同学号已删除记录 → 复活，避免唯一约束 500） ----
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

    // 入库文本统一去空格（判重用的已是去空格值，此处保持一致）
    const cleanName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null
    const cleanMajor = typeof body.major === 'string' && body.major.trim() ? body.major.trim() : null
    const cleanDirection = typeof body.interestDirection === 'string' && body.interestDirection.trim() ? body.interestDirection.trim() : null
    const cleanTopic = typeof body.interestTopic === 'string' && body.interestTopic.trim() ? body.interestTopic.trim() : null

    // 同学号已删除记录：复活并用新资料覆盖，密码重置为默认（与新建一致），
    // 避免撞唯一约束导致 500。先于邮箱冲突处理：占用者若正是该行则直接复活。
    // 仅当邮箱为空、或邮箱占用者正是该行时才可复活，否则按邮箱冲突处理
    const deletedSid = await prisma.user.findFirst({
      where: { studentId, isDel: 1 }
    })
    if (deletedSid) {
      const emailHolder = email ? await prisma.user.findFirst({ where: { email } }) : null
      if (!emailHolder || emailHolder.id === deletedSid.id) {
        const revived = await prisma.user.update({
          where: { id: deletedSid.id },
          data: {
            name: cleanName,
            email: email || null,
            password: await hashPassword(DEFAULT_PASSWORD),
            major: cleanMajor,
            identity: identity || null,
            interestDirection: cleanDirection,
            interestTopic: cleanTopic,
            mustChangePassword: 1,
            isDel: 0
          }
        })
        return NextResponse.json({ ...toStudentRow(revived), revived: true })
      }
      return NextResponse.json(
        {
          error: '该学号曾被删除，但所填邮箱已被另一条记录占用，请更换邮箱后重试',
          conflict: true
        },
        { status: 409 }
      )
    }

    const resolved = await resolveEmail(null)
    if (resolved instanceof Response) return resolved
    email = resolved

    const student = await prisma.user.create({
      data: {
        studentId, // 去空格大写后的值，与判重字段一致
        name: cleanName,
        email: email || null,
        password: await hashPassword(DEFAULT_PASSWORD),
        role: 'user',
        major: cleanMajor,
        identity: identity || null,
        interestDirection: cleanDirection,
        interestTopic: cleanTopic,
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
}
