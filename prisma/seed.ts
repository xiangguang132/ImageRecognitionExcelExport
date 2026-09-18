import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 单表后管理员为 .env 虚拟账号，不在 users 表中落盘。
// seed 只做环境自检 + 兜底清理：若库中残留旧 admin 行则软删除，保证 DB 中只有学生。
async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@system.local').toLowerCase().trim()
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || '系统管理员'

  if (!process.env.ADMIN_EMAIL || !adminPassword) {
    console.log('[seed] 警告: 未配置 ADMIN_EMAIL / ADMIN_PASSWORD，虚拟管理员不可用')
  } else {
    console.log(`[seed] 虚拟管理员就绪: ${adminEmail} (${adminName})`)
  }

  const leftover = await prisma.user.findMany({
    where: { email: adminEmail, isDel: 0 },
    select: { id: true, email: true, role: true }
  })
  for (const u of leftover) {
    await prisma.user.update({ where: { id: u.id }, data: { isDel: 1 } })
    console.log(`[seed] 已软删除库中残留的管理员行: ${u.email} (id=${u.id})`)
  }

  if (leftover.length === 0) {
    console.log('[seed] 自检通过：库中无管理员行，管理员仅来自 .env')
  }
}

main()
  .catch((e) => {
    console.error('[seed] 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
