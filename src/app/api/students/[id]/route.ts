import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStudentInput } from '@/lib/validation'
import { withAdminParams } from '@/lib/auth-middleware'

// 单表说明：见 ../route.ts。密码只能经 /api/auth/change-password 修改，
// 本接口不接受 password / 权限 role 字段。

function toStudentRow(u: {
  id: number; studentId: string | null; name: string | null; email: string | null;
  major: string | null; identity: string | null; interestDirection: string | null;
  interestTopic: string | null; mustChangePassword: number; createdAt: Date; updatedAt: Date
}) {
  return {
    id: u.id,
    studentId: u.studentId,
    name: u.name,
    email: u.email,
    major: u.major,
    role: u.identity,
    identity: u.identity,
    interestDirection: u.interestDirection,
    interestTopic: u.interestTopic,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }
}

// PUT - 更新学生信息（仅管理员）
export const PUT = withAdminParams(async (request, context) => {
  try {
    const { id } = await context.params
    const studentId = parseInt(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '无效的 ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { studentId: newStudentId, name, email, major, interestDirection, interestTopic } = body
    // 在校身份：兼容新旧字段名（identity / role）；权限 role 与 password 不在此修改
    const identity = typeof body.identity === 'string' && body.identity
      ? body.identity
      : (typeof body.role === 'string' ? body.role : undefined)

    // 写入层统一校验（格式 + 敏感内容），拦截后不更新
    const validation = validateStudentInput({ ...body, role: identity ?? body.role })
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors, fieldErrors: validation.fieldErrors },
        { status: 400 }
      )
    }

    const updated = await prisma.user.findFirst({
      where: { id: studentId, isDel: 0, role: 'user' }
    })

    if (!updated) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    // 学号改动时判重（与 POST 同一规则；含已删除记录，避免撞唯一约束 500）
    const normalizedNewId = typeof newStudentId === 'string' ? newStudentId.trim() : ''
    if (normalizedNewId && normalizedNewId !== updated.studentId) {
      const conflict = await prisma.user.findFirst({
        where: { studentId: normalizedNewId }
      })
      if (conflict) {
        return NextResponse.json(
          { error: conflict.isDel === 1 ? '该学号曾被使用（原记录已删除），请先恢复原记录' : '该学号已存在，请勿重复录入' },
          { status: 409 }
        )
      }
    }

    // 邮箱改动时判重（含已删除记录，避免撞唯一约束 500）
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : ''
    if (normalizedEmail && normalizedEmail !== updated.email) {
      const conflict = await prisma.user.findFirst({ where: { email: normalizedEmail } })
      if (conflict) {
        return NextResponse.json(
          { error: conflict.isDel === 1 ? '该邮箱曾被使用（原记录已删除），请更换邮箱或先恢复原记录' : '该邮箱已存在' },
          { status: 409 }
        )
      }
    }

    const result = await prisma.user.update({
      where: { id: studentId },
      data: {
        studentId: normalizedNewId || undefined,
        name: name ?? undefined,
        // 空字符串表示清空邮箱（存 NULL）；非空则更新
        email: email === '' ? null : normalizedEmail || undefined,
        major: major ?? undefined,
        identity: identity ?? undefined,
        interestDirection: interestDirection ?? undefined,
        interestTopic: interestTopic ?? undefined,
      }
    })

    return NextResponse.json(toStudentRow(result))
  } catch (error: unknown) {
    console.error('更新学生信息失败:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: '更新学生信息失败' },
      { status: 500 }
    )
  }
})

// DELETE - 删除学生信息（仅管理员，软删除；其登录账号同步失效）
export const DELETE = withAdminParams(async (request, context) => {
  try {
    const { id } = await context.params
    const studentId = parseInt(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '无效的 ID' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findFirst({
      where: { id: studentId, isDel: 0, role: 'user' }
    })

    if (!existing) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    await prisma.user.update({
      where: { id: studentId },
      data: { isDel: 1 }
    })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除学生信息失败:', error)
    return NextResponse.json(
      { error: '删除学生信息失败' },
      { status: 500 }
    )
  }
})
