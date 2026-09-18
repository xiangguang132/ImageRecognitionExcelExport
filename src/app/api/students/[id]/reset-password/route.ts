import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { withAdminParams } from '@/lib/auth-middleware'

// POST - 重置学生密码为 123456（仅管理员）
// 与导入新建一致：mustChangePassword = 1，学生下次登录强制改密。
export const POST = withAdminParams(async (request, context) => {
  try {
    const { id } = await context.params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json({ error: '无效的 ID' }, { status: 400 })
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, isDel: 0, role: 'user' }
    })

    if (!target) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword('123456'), mustChangePassword: 1 }
    })

    return NextResponse.json({ message: '密码已重置为 123456，学生下次登录需强制改密' })
  } catch (error) {
    console.error('重置密码失败:', error)
    return NextResponse.json({ error: '重置密码失败' }, { status: 500 })
  }
})
