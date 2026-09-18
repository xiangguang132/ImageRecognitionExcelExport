import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/auth-middleware'
import { hashPassword } from '@/lib/auth'

// GET - 获取用户列表（分页，仅管理员）
export const GET = withAdmin(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const rawPageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.min(Math.max(rawPageSize, 1), 100)
      : 20
    const skip = (page - 1) * pageSize

    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where: { isDel: 0 },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.user.count({ where: { isDel: 0 } })
    ])

    return NextResponse.json({ data: users, totalCount })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    )
  }
})

// POST - 创建新用户（仅管理员）
export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json()
    const { email, name, password, studentId } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: '请填写邮箱、姓名和密码' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少 6 位' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existing) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      )
    }

    // 学号可选；填写后即作为该账号的学生登录凭证，需唯一
    const normalizedSid = typeof studentId === 'string' && studentId.trim()
      ? studentId.trim().toUpperCase()
      : null
    if (normalizedSid) {
      if (!/^[A-Za-z0-9]{4,20}$/.test(normalizedSid)) {
        return NextResponse.json(
          { error: '学号格式不正确（仅允许字母和数字，长度为 4~20 位）' },
          { status: 400 }
        )
      }
      const sidConflict = await prisma.user.findFirst({
        where: { studentId: normalizedSid, isDel: 0 }
      })
      if (sidConflict) {
        return NextResponse.json(
          { error: '该学号已存在' },
          { status: 409 }
        )
      }
    }

    const hashedPassword = await hashPassword(password)
    // 单表后：此处创建的即学生账号；首登强制改密（mustChangePassword = 1）
    // 未填学号的账号无法通过学生登录入口登录，需后续在学生管理中补录
    const userRole = 'user'

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: hashedPassword,
        role: userRole,
        studentId: normalizedSid,
        mustChangePassword: 1
      },
      select: { id: true, email: true, name: true, role: true, mustChangePassword: true, createdAt: true }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('创建用户失败:', error)
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    )
  }
})
