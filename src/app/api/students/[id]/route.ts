import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    await prisma.student.delete({
      where: {
        id: studentId
      }
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
