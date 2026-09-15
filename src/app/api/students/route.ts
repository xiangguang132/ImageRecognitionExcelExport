import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStudentInput } from '@/lib/validation'
import { withAdmin, withAuth } from '@/lib/auth-middleware'

// GET - 获取学生信息（支持分页）- 仅管理员
export const GET = withAdmin(async () => {
  try {
    const students = await prisma.student.findMany({
      where: { isDel: 0 },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ data: students, totalCount: students.length })
  } catch (error) {
    console.error('获取学生信息失败:', error)
    return NextResponse.json(
      { error: '获取学生信息失败' },
      { status: 500 }
    )
  }
})

// POST - 新增学生信息 - 已登录用户均可
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json()

    // 写入层统一校验（格式 + 敏感内容），拦截后不入库
    const validation = validateStudentInput(body)
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors, fieldErrors: validation.fieldErrors },
        { status: 400 }
      )
    }

    const student = await prisma.student.create({
      data: {
        studentId: body.studentId || null,
        name: body.name || null,
        email: body.email || null,
        major: body.major || null,
        role: body.role || null,
        interestDirection: body.interestDirection || null,
        interestTopic: body.interestTopic || null
      }
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('保存学生信息失败:', error)
    return NextResponse.json(
      { error: '保存学生信息失败' },
      { status: 500 }
    )
  }
})
