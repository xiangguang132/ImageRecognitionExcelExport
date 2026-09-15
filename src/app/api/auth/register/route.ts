import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'

// POST - 注册新用户（仅管理员可操作）
export async function POST(request: NextRequest) {
  try {
    // 验证当前用户是否为管理员
    const currentUser = await getCurrentUser(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足，仅管理员可创建用户' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, password, role } = body

    // 参数校验
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

    // 检查邮箱是否已存在
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existing) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      )
    }

    // 创建用户
    const hashedPassword = await hashPassword(password)
    const userRole = role === 'admin' ? 'admin' : 'user'

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: hashedPassword,
        role: userRole
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('注册用户失败:', error)
    return NextResponse.json(
      { error: '注册用户失败' },
      { status: 500 }
    )
  }
}
