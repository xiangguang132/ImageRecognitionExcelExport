import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

// POST - 登录（邮箱 + 密码 → JWT）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: '请输入邮箱和密码' },
        { status: 400 }
      )
    }

    // 查找用户（排除已删除的）
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isDel: 0 }
    })

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 签发 JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    })

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

    // Token 同时写入 httpOnly Cookie（防 XSS，前端不再依赖 localStorage）
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
      secure: process.env.NODE_ENV === 'production'
    })

    return response
  } catch (error) {
    console.error('登录失败:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}
