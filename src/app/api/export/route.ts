import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/auth-middleware'
import ExcelJS from 'exceljs'

// GET - 导出 Excel（仅管理员）
export const GET = withAdmin(async () => {
  try {
    // 获取所有学生数据（单表 users，role 恒为 user）
    const students = await prisma.user.findMany({
      where: { isDel: 0, role: 'user' },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook()
    workbook.creator = '学生证识别系统'
    workbook.created = new Date()

    // 创建工作表
    const worksheet = workbook.addWorksheet('学生账号导入')

    // 设置列 — 匹配导入模板：学号、姓名、邮箱、专业、角色 + 新字段
    worksheet.columns = [
      { header: '学号', key: 'studentId', width: 20 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '邮箱', key: 'email', width: 35 },
      { header: '专业', key: 'major', width: 25 },
      { header: '角色', key: 'role', width: 15 },
      { header: '未来兴趣方向', key: 'interestDirection', width: 20 },
      { header: '意向参与主题', key: 'interestTopic', width: 30 }
    ]

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
    worksheet.getRow(1).height = 25

    // 添加数据
    students.forEach((student) => {
      worksheet.addRow({
        studentId: student.studentId || '',
        name: student.name || '',
        email: student.email || '',
        major: student.major || '',
        role: student.identity || '',
        interestDirection: student.interestDirection || '',
        interestTopic: student.interestTopic || ''
      })
    })

    // 生成 Excel 文件
    const buffer = await workbook.xlsx.writeBuffer()

    // 返回文件
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="students_import.xlsx"`
      }
    })
  } catch (error) {
    console.error('导出 Excel 失败:', error)
    return NextResponse.json(
      { error: '导出 Excel 失败' },
      { status: 500 }
    )
  }
})
