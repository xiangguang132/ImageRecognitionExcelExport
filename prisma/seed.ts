import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@system.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || '系统管理员'

  // 检查是否已存在管理员
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (existing) {
    console.log(`[seed] 管理员账号已存在: ${adminEmail}`)
    return
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: 'admin'
    }
  })

  console.log(`[seed] 管理员账号创建成功: ${adminEmail}`)
}

main()
  .catch((e) => {
    console.error('[seed] 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
