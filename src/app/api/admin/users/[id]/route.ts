import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminParams } from '@/lib/auth-middleware'
import { hashPassword } from '@/lib/auth'

// PUT - 更新用户信息（仅管理员）
export const PUT = withAdminParams(async (request, context) => {
  try {
    const { id } = await context.params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json({ error: '无效的用户 ID' }, { status: 400 })
    }

    const body = await request.json()
    const { email, name, password, role } = body

    // 检查用户是否存在
    const existing = await prisma.user.findFirst({
      where: { id: userId, isDel: 0 }
    })

    if (!existing) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 如果修改了邮箱，检查是否与其他用户冲突
    if (email && email.toLowerCase().trim() !== existing.email) {
      const conflict = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      })
      if (conflict) {
        return NextResponse.json({ error: '该邮箱已被其他用户使用' }, { status: 409 })
      }
    }

    const updateData: Record<string, any> = {}

    if (email) updateData.email = email.toLowerCase().trim()
    if (name) updateData.name = name.trim()
    if (role) updateData.role = role === 'admin' ? 'admin' : 'user'
    if (password && password.length >= 6) {
      updateData.password = await hashPassword(password)
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('更新用户失败:', error)
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
})

// DELETE - 删除用户（软删除，仅管理员）
export const DELETE = withAdminParams(async (request, context, user) => {
  try {
    const { id } = await context.params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json({ error: '无效的用户 ID' }, { status: 400 })
    }

    // 不能删除自己
    if (userId === user.id) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 })
    }

    // 检查用户是否存在（且未被删除）
    const target = await prisma.user.findFirst({
      where: { id: userId, isDel: 0 }
    })

    if (!target) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 软删除
    await prisma.user.update({
      where: { id: userId },
      data: { isDel: 1 }
    })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除用户失败:', error)
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 })
  }
})
