import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStudentInput } from '@/lib/validation'
import { withAdminParams } from '@/lib/auth-middleware'

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
    const { studentId: newStudentId, name, email, major, role, interestDirection, interestTopic } = body

    // 写入层统一校验（格式 + 敏感内容），拦截后不更新
    const validation = validateStudentInput(body)
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors, fieldErrors: validation.fieldErrors },
        { status: 400 }
      )
    }

    const updated = await prisma.student.findFirst({
      where: { id: studentId, isDel: 0 }
    })

    if (!updated) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    // 学号改动时判重（与 POST 同一规则：未删除记录中学号已存在则拒绝）
    const normalizedNewId = typeof newStudentId === 'string' ? newStudentId.trim() : ''
    if (normalizedNewId && normalizedNewId !== updated.studentId) {
      const conflict = await prisma.student.findFirst({
        where: { studentId: normalizedNewId, isDel: 0 }
      })
      if (conflict) {
        return NextResponse.json(
          { error: '该学号已存在，请勿重复录入' },
          { status: 409 }
        )
      }
    }

    const result = await prisma.student.update({
      where: { id: studentId },
      data: {
        studentId: normalizedNewId || undefined,
        name: name ?? undefined,
        email: email ?? undefined,
        major: major ?? undefined,
        role: role ?? undefined,
        interestDirection: interestDirection ?? undefined,
        interestTopic: interestTopic ?? undefined,
      }
    })

    return NextResponse.json(result)
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

// DELETE - 删除学生信息（仅管理员）
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

    const existing = await prisma.student.findFirst({
      where: { id: studentId, isDel: 0 }
    })

    if (!existing) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    await prisma.student.update({
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
