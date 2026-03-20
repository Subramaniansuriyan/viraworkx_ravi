import { Router, Response } from 'express'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/v1/communications
 * List communication logs (admin only), filterable by candidateId or clientId
 */
router.get('/', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { candidateId, clientId, limit = '50', offset = '0' } = req.query

    const where: any = {}
    if (candidateId) where.candidateId = candidateId as string
    if (clientId) where.clientId = clientId as string

    const [logs, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true } },
          candidate: { select: { id: true, firstName: true, lastName: true } },
          client: { select: { id: true, companyName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.communicationLog.count({ where })
    ])

    res.json({ logs, total })
  } catch (error) {
    console.error('Error fetching communication logs:', error)
    res.status(500).json({ error: 'Failed to fetch communication logs' })
  }
})

/**
 * POST /api/v1/communications
 * Create a new communication log entry (admin only)
 */
router.post('/', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { candidateId, clientId, type, subject, body, direction } = req.body

    if (!type || !body) {
      return res.status(400).json({ error: 'type and body are required' })
    }

    const log = await prisma.communicationLog.create({
      data: {
        candidateId: candidateId || null,
        clientId: clientId || null,
        userId: req.user!.userId,
        type,
        subject: subject || null,
        body,
        direction: direction || 'outbound'
      },
      include: {
        user: { select: { id: true, email: true } },
        candidate: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, companyName: true } }
      }
    })

    res.status(201).json({ log })
  } catch (error) {
    console.error('Error creating communication log:', error)
    res.status(500).json({ error: 'Failed to create communication log' })
  }
})

export default router
