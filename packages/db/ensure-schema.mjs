/**
 * Ensures all schema columns exist in the production database.
 * Uses IF NOT EXISTS so it's safe to run repeatedly.
 * Run before prisma db push to fix any schema drift.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const migrations = [
  // candidates — columns added after initial DB setup
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary TEXT`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS availability VARCHAR(100)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS coding_score FLOAT`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS communication_score FLOAT`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS degree VARCHAR(255)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS graduation_year INTEGER`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS overall_score FLOAT`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS overlap_hours FLOAT`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS psychometric_score FLOAT`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referred_by VARCHAR(255)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source VARCHAR(100)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tier VARCHAR(50)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS university VARCHAR(255)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS kyc_approved BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMP`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS kyc_notes TEXT`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS aadhaar_back_url VARCHAR(500)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS aadhaar_front_url VARCHAR(500)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pan_card_url VARCHAR(500)`,
  `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20)`,

  // clients — columns added after initial setup
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`,
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS verification_notes TEXT`,
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_website VARCHAR(500)`,
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`,
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) DEFAULT 'startup'`,

  // jobs — pending_approval status support
  `ALTER TABLE jobs ALTER COLUMN status DROP DEFAULT`,
  `ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'draft'`,

  // assessments
  `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_tier VARCHAR(20)`,
  `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS test_name VARCHAR(255)`,

  // contract_signatures — candidate role
  `ALTER TABLE contract_signatures ADD COLUMN IF NOT EXISTS user_agent TEXT`,
]

async function main() {
  console.log('Running schema drift migrations...')
  let applied = 0
  let skipped = 0

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql)
      applied++
    } catch (err) {
      // Log but don't fail — some may not apply on all envs
      console.warn(`Skipped: ${sql.substring(0, 60)}... — ${err.message}`)
      skipped++
    }
  }

  console.log(`Done. Applied: ${applied}, Skipped: ${skipped}`)
}

main()
  .catch(err => { console.error('Migration failed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
