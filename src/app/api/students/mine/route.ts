import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStudentInput } from '@/lib/validation'
import { withAuth } from '@/lib/auth-middleware'

// GET - 获取本人档案（已登录学生）
// 返回 users 表中自己的行，前端用于预填表单；管理员（虚拟账号，无行）返回 404。
export const GET = withAuth(async (_request, user) => {
  try {
    if (user.id === 0) {
      return NextResponse.json({ error: '管理员没有个人档案' }, { status: 404 })
    }
    const me = await prisma.user.findFirst({
      where: { id: user.id, isDel: 0 }
    })
    if (!me) {
      return NextResponse.json({ error: '档案不存在' }, { status: 404 })
    }
    return NextResponse.json({
      id: me.id,
      studentId: me.studentId,
      name: me.name,
      email: me.email,
      major: me.major,
      role: me.identity,
      identity: me.identity,
      interestDirection: me.interestDirection,
      interestTopic: me.interestTopic,
      mustChangePassword: me.mustChangePassword,
      createdAt: me.createdAt,
      updatedAt: me.updatedAt
    })
  } catch (error) {
    console.error('获取本人档案失败:', error)
    return NextResponse.json(
      { error: '获取本人档案失败' },
      { status: 500 }
    )
  }
})

// PUT - 学生更新自己的兴趣信息（仅本人）
// 白名单：只接受 interestDirection / interestTopic，其余字段（学号、姓名、
// 身份角色、邮箱、专业等硬性信息）一律忽略，学生无权修改，只能由管理员维护。
// 管理员请走 /api/students/[id]。
export const PUT = withAuth(async (request, user) => {
  try {
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: '管理员请使用管理接口维护学生信息' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { interestDirection, interestTopic } = body as {
      interestDirection?: unknown
      interestTopic?: unknown
    }

    // 写入层统一校验（只校验白名单内字段）
    const validation = validateStudentInput({ interestDirection: interestDirection as string, interestTopic: interestTopic as string })
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors, fieldErrors: validation.fieldErrors },
        { status: 400 }
      )
    }

    const me = await prisma.user.findFirst({
      where: { id: user.id, isDel: 0, role: 'user' }
    })
    if (!me) {
      return NextResponse.json(
        { error: '档案不存在，请联系管理员' },
        { status: 404 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: me.id },
      // 注意：此处有意只写两个字段，多传的任何字段都不会入库
      data: {
        interestDirection: typeof interestDirection === 'string' ? interestDirection : undefined,
        interestTopic: typeof interestTopic === 'string' ? interestTopic : undefined
      }
    })

    return NextResponse.json({
      id: updated.id,
      studentId: updated.studentId,
      name: updated.name,
      email: updated.email,
      major: updated.major,
      role: updated.identity,
      identity: updated.identity,
      interestDirection: updated.interestDirection,
      interestTopic: updated.interestTopic,
      updatedAt: updated.updatedAt
    })
  } catch (error) {
    console.error('更新兴趣信息失败:', error)
    return NextResponse.json(
      { error: '更新失败，请重试' },
      { status: 500 }
    )
  }
})
