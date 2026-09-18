import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const firstNames = ['陳偉', '黃麗', '張志', '李雅', '王浩', '劉敏', '趙磊', '何靜', '郭峰', '羅娜', '梁超', '宋佳', '鄭凱', '謝琳', '韓梅', '馮剛', '董欣', '蕭雲', '程亮', '傅雪', '伍強', '余文', '譚潔', '陸遠', '鄧麗']
const majors = ['計算機科學', '工商管理', '土木工程', '葡萄牙語研究', '會計學', '心理學', '金融學', '法律']
const topics = ['基於大模型的代碼助手研究', '智慧校園考勤系統', '澳門文旅推薦算法', '低功耗物聯網節點設計', '粵語語音識別優化']

// 单表后：测试数据即学生账号，默认密码 123456，mustChangePassword = 1。
// 管理员为 .env 虚拟账号，不在此创建。
const DEFAULT_PASSWORD = '123456'

async function main() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  // ---- 测试学生账号（25 条，覆盖分页 5/10/15）----
  let created = 0
  for (let i = 0; i < 25; i++) {
    const studentId = `TC2024${String(i + 1).padStart(3, '0')}`
    const email = `${studentId.toLowerCase()}@connect.um.edu.mo`
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) continue
    await prisma.user.create({
      data: {
        studentId,
        name: `${firstNames[i]}${i >= firstNames.length ? i : ''}`,
        email,
        password: hash,
        role: 'user',
        major: majors[i % majors.length],
        identity: i % 5 === 4 ? 'teacher' : 'student',
        interestDirection: i % 3 === 0 ? '項目,研究' : i % 3 === 1 ? '項目' : '研究',
        interestTopic: topics[i % topics.length],
        mustChangePassword: 1
      }
    })
    created++
  }
  console.log(`[test-data] 学生账号创建 ${created} 条（默认密码 ${DEFAULT_PASSWORD}，首次登录强制改密）`)

  const userCount = await prisma.user.count({ where: { isDel: 0 } })
  console.log(`[test-data] 当前总数: 用户 ${userCount}`)
}

main()
  .catch((e) => {
    console.error('[test-data] 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
