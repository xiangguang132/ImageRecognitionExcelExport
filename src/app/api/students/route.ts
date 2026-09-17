import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStudentInput } from '@/lib/validation'
import { withAdmin, withAuth } from '@/lib/auth-middleware'

// GET - 获取学生信息（分页，仅管理员）
export const GET = withAdmin(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const rawPageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.min(Math.max(rawPageSize, 1), 100)
      : 10
    const skip = (page - 1) * pageSize

    const [students, totalCount] = await prisma.$transaction([
      prisma.student.findMany({
        where: { isDel: 0 },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.student.count({ where: { isDel: 0 } })
    ])

    return NextResponse.json({ data: students, totalCount, page, pageSize })
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

    // 必填字段：学号 + 姓名（空对象 / 全空不再入库）
    const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!studentId || !name) {
      return NextResponse.json(
        { error: '请填写学号和姓名' },
        { status: 400 }
      )
    }

    // 写入层统一校验（格式 + 敏感内容），拦截后不入库
    const validation = validateStudentInput(body)
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors, fieldErrors: validation.fieldErrors },
        { status: 400 }
      )
    }

    // 学号去重（未删除记录中已存在则拒绝，避免重复录入）
    const existing = await prisma.student.findFirst({
      where: { studentId, isDel: 0 }
    })
    if (existing) {
      return NextResponse.json(
        { error: '该学号已存在，请勿重复录入' },
        { status: 409 }
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
