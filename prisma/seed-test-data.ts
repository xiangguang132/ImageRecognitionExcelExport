import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const firstNames = ['陳偉', '黃麗', '張志', '李雅', '王浩', '劉敏', '趙磊', '何靜', '郭峰', '羅娜', '梁超', '宋佳', '鄭凱', '謝琳', '韓梅', '馮剛', '董欣', '蕭雲', '程亮', '傅雪', '伍強', '余文', '譚潔', '陸遠', '鄧麗']
const majors = ['計算機科學', '工商管理', '土木工程', '葡萄牙語研究', '會計學', '心理學', '金融學', '法律']
const topics = ['基於大模型的代碼助手研究', '智慧校園考勤系統', '澳門文旅推薦算法', '低功耗物聯網節點設計', '粵語語音識別優化']

async function main() {
  // ---- 测试用户 ----
  const users = [
    { email: 'admin@test.local', name: '測試管理員', password: 'admin123', role: 'admin' },
    { email: 'user1@test.local', name: '測試用戶一', password: 'user1234', role: 'user' },
    { email: 'user2@test.local', name: '測試用戶二', password: 'user1234', role: 'user' }
  ]
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      console.log(`[test-data] 用户已存在: ${u.email}`)
      continue
    }
    await prisma.user.create({
      data: { ...u, password: await bcrypt.hash(u.password, 10) }
    })
    console.log(`[test-data] 用户创建成功: ${u.email} / ${u.password}`)
  }

  // ---- 测试学生（25 条，覆盖分页 5/10/15）----
  let created = 0
  for (let i = 0; i < 25; i++) {
    const studentId = `TC2024${String(i + 1).padStart(3, '0')}`
    const existing = await prisma.student.findFirst({ where: { studentId, isDel: 0 } })
    if (existing) continue
    await prisma.student.create({
      data: {
        studentId,
        name: `${firstNames[i]}${i >= firstNames.length ? i : ''}`,
        email: `${studentId.toLowerCase()}@connect.um.edu.mo`,
        major: majors[i % majors.length],
        role: i % 5 === 4 ? 'teacher' : 'student',
        interestDirection: i % 3 === 0 ? '項目,研究' : i % 3 === 1 ? '項目' : '研究',
        interestTopic: topics[i % topics.length]
      }
    })
    created++
  }
  console.log(`[test-data] 学生创建 ${created} 条`)

  const [userCount, studentCount] = await Promise.all([
    prisma.user.count({ where: { isDel: 0 } }),
    prisma.student.count({ where: { isDel: 0 } })
  ])
  console.log(`[test-data] 当前总数: 用户 ${userCount}, 学生 ${studentCount}`)
}

main()
  .catch((e) => {
    console.error('[test-data] 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
