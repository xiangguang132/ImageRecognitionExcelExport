import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { withAuth } from '@/lib/auth-middleware'

// POST - 修改密码（已登录用户）
// 学生首次登录（mustChangePassword = 1）必须经此接口改密后才能正常使用。
// 虚拟管理员（id = 0）密码由 .env 管理，此处拒绝并提示改 .env。
export const POST = withAuth(async (request, user) => {
  try {
    if (user.id === 0) {
      return NextResponse.json(
        { error: '管理员密码由 .env 文件管理，请修改 ADMIN_PASSWORD 后重启服务' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { oldPassword, newPassword } = body as { oldPassword?: string; newPassword?: string }

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: '请输入原密码和新密码' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '新密码长度至少 6 位' },
        { status: 400 }
      )
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: '新密码不能与原密码相同' },
        { status: 400 }
      )
    }

    const record = await prisma.user.findFirst({
      where: { id: user.id, isDel: 0 },
      select: { id: true, password: true }
    })

    if (!record) {
      return NextResponse.json(
        { error: '账号不存在或已被删除' },
        { status: 404 }
      )
    }

    const valid = await verifyPassword(oldPassword, record.password)
    if (!valid) {
      return NextResponse.json(
        { error: '原密码错误' },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword), mustChangePassword: 0 }
    })

    return NextResponse.json({ message: '密码修改成功' })
  } catch (error) {
    console.error('修改密码失败:', error)
    return NextResponse.json(
      { error: '修改密码失败，请重试' },
      { status: 500 }
    )
  }
})
