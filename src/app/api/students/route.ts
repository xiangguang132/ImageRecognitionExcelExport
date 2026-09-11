import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取学生信息（支持分页）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    const skip = (page - 1) * pageSize

    const [students, totalCount] = await prisma.$transaction([
      prisma.student.findMany({
        where: { isDel: 0 },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      }),
      prisma.student.count({ where: { isDel: 0 } })
    ])

    return NextResponse.json({ data: students, totalCount })
  } catch (error) {
    console.error('获取学生信息失败:', error)
    return NextResponse.json(
      { error: '获取学生信息失败' },
      { status: 500 }
    )
  }
}

// POST - 新增学生信息
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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
}
