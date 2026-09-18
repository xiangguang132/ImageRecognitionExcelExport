import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'
import { normalizeStudentId } from '@/lib/validation'

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

    // 学号归一化：去空格 + 大写 + 去末位（本分支不登记末位数字）；
    // 学生输完整学号也能登录；未迁移的旧数据用原文回退查一次
    const normalizedId = normalizeStudentId(studentId)
    const fallbackId = String(studentId).trim().toUpperCase().replace(/[^0-9A-Z]/g, '')

    // 查找学生账号（排除已删除的；DB 中只有 role = user 的学生）
    let user = normalizedId
      ? await prisma.user.findFirst({
          where: { studentId: normalizedId, isDel: 0, role: 'user' }
        })
      : null
    if (!user && fallbackId) {
      user = await prisma.user.findFirst({
        where: { studentId: fallbackId, isDel: 0, role: 'user' }
      })
    }

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
