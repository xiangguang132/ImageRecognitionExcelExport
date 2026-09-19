import { NextRequest, NextResponse } from 'next/server'
import { generateToken, getEnvAdmin, getEnvAdminEmail, isSecureRequest } from '@/lib/auth'

// POST - 管理员登录（邮箱 + 密码 → JWT）
// 管理员为 .env 配置的虚拟账号（id = 0），不在 users 表中落盘。
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

    const normalizedEmail = String(email).toLowerCase().trim()

    // 非管理员邮箱一律拒绝（与密码错误同提示，避免枚举账号）
    if (normalizedEmail !== getEnvAdminEmail()) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    const admin = getEnvAdmin()!
    const token = generateToken({ id: admin.id, email: admin.email, role: admin.role })

    const response = NextResponse.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        mustChangePassword: 0
      }
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
      secure: isSecureRequest(request)
    })

    return response
  } catch (error) {
    console.error('管理员登录失败:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}
