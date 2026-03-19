import { Router, Response } from 'express'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

const SETTINGS_KEY = 'platform'

const DEFAULTS = {
  aiAutoApprove: false,
  aiAutoApproveThreshold: 85,
  emailNotifications: true,
  slackNotifications: false,
  webhookUrl: '',
  matchScoreThreshold: 60,
  requireHumanApproval: true,
  maxAssessmentRetries: 2,
  assessmentExpirationDays: 7,
}

/**
 * GET /api/v1/settings/platform
 * Get platform settings (admin only)
 */
router.get('/platform', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: SETTINGS_KEY } })
    const settings = row ? { ...DEFAULTS, ...(row.value as object) } : DEFAULTS
    res.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

/**
 * PUT /api/v1/settings/platform
 * Save platform settings (admin only)
 */
router.put('/platform', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const incoming = req.body
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload' })
    }

    // Merge with defaults to prevent unknown fields overwriting everything
    const merged = { ...DEFAULTS, ...incoming }

    await prisma.platformSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: merged },
      create: { key: SETTINGS_KEY, value: merged },
    })

    res.json({ settings: merged })
  } catch (error) {
    console.error('Error saving settings:', error)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

export default router
