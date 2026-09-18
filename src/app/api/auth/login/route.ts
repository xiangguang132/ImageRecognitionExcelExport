import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken, isSecureRequest } from '@/lib/auth'

// POST - 学生登录（学号 + 密码 → JWT）
// 管理员请走 POST /api/auth/admin-login（邮箱 + 密码），两条链路分离。
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, password } = body

    if (!studentId || !password) {
      return NextResponse.json(
        { error: '请输入学号和密码' },
        { status: 400 }
      )
    }

    // 学号归一化：去空格 + 大写（与录入时的 cleanStudentId 一致）
    const normalizedId = String(studentId).trim().toUpperCase()

    // 查找学生账号（排除已删除的；DB 中只有 role = user 的学生）
    const user = await prisma.user.findFirst({
      where: { studentId: normalizedId, isDel: 0, role: 'user' }
    })

    if (!user) {
      return NextResponse.json(
        { error: '学号或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: '学号或密码错误' },
        { status: 401 }
      )
    }

    // 签发 JWT（邮箱可空，对外统一为空字符串）
    const token = generateToken({
      id: user.id,
      email: user.email ?? '',
      role: user.role
    })

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        mustChangePassword: user.mustChangePassword
      }
    })

    // Token 同时写入 httpOnly Cookie（防 XSS，前端不再依赖 localStorage）
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
      secure: isSecureRequest(request)
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
