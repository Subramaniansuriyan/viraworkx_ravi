/**
 * Upserts the ViraWorkx admin user in the production database.
 * Run via GitHub Actions workflow: .github/workflows/create-admin.yml
 * Env: ADMIN_EMAIL, ADMIN_PASSWORD
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@viraworkx.ai'
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new Error('ADMIN_PASSWORD env var is required')

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      userType: 'admin',
      status: 'active',
      emailVerified: true,
    },
    create: {
      email,
      passwordHash,
      userType: 'admin',
      status: 'active',
      emailVerified: true,
    },
  })

  console.log(`Admin user ready: ${user.email} (id: ${user.id})`)
}

main()
  .catch(err => { console.error('Failed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
