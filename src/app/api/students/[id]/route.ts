import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新学生信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = parseInt(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '无效的 ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { studentId: newStudentId, name, email, major, role, interestDirection, interestTopic } = body

    const updated = await prisma.student.update({
      where: { id: studentId, isDel: 0 },
      data: {
        studentId: newStudentId ?? undefined,
        name: name ?? undefined,
        email: email ?? undefined,
        major: major ?? undefined,
        role: role ?? undefined,
        interestDirection: interestDirection ?? undefined,
        interestTopic: interestTopic ?? undefined,
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('更新学生信息失败:', error)
    if (error.code === 'P2025') {
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
}

// DELETE - 删除学生信息
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = parseInt(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '无效的 ID' },
        { status: 400 }
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
}
