// Upserts admin user without touching existing data
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = process.env.ADMIN_PASSWORD || 'Admin123!'
  const email = process.env.ADMIN_EMAIL || 'admin@viraworkx.ai'
  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, userType: 'admin', status: 'active' },
    create: {
      id: '00000000-0000-4000-a000-000000000001',
      email,
      passwordHash,
      userType: 'admin',
      status: 'active',
    },
  })

  console.log(`Admin user ready: ${user.email}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
