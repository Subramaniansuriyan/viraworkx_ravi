import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'
import { emailService } from '../services/email.service.js'

const router = Router()

// Application stages in order
const STAGE_ORDER = [
  'new',
  'screening',
  'assessment',
  'assessment_complete',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn'
]

/**
 * GET /api/v1/applications
 * List applications (filtered by user role)
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, candidateId, stage, limit = '50', offset = '0' } = req.query

    const where: any = {}

    // Candidates can only see their own applications
    if (req.user?.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId }
      })
      if (candidate) {
        where.candidateId = candidate.id
      }
    } else {
      if (jobId) where.jobId = jobId
      if (candidateId) where.candidateId = candidateId
    }

    if (stage) {
      where.stage = stage
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        job: {
          include: {
            client: { select: { companyName: true, companyLogoUrl: true } }
          }
        },
        candidate: {
          include: {
            user: { select: { email: true } }
          }
        },
        interviews: {
          where: { status: { notIn: ['cancelled'] } },
          orderBy: { scheduledAt: 'desc' },
          take: 1
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { appliedAt: 'desc' }
    })

    const total = await prisma.application.count({ where })

    res.json({ applications, total })
  } catch (error) {
    console.error('Error fetching applications:', error)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

/**
 * GET /api/v1/applications/:id
 * Get application by ID
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        job: {
          include: {
            client: { select: { companyName: true, companyLogoUrl: true, industry: true } }
          }
        },
        candidate: {
          include: {
            user: { select: { email: true } },
            skillBadges: {
              where: { expiresAt: { gt: new Date() } }
            }
          }
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' }
        },
        assessments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    // Check access
    if (req.user?.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId }
      })
      if (candidate?.id !== application.candidateId) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    res.json({ application })
  } catch (error) {
    console.error('Error fetching application:', error)
    res.status(500).json({ error: 'Failed to fetch application' })
  }
})

/**
 * PUT /api/v1/applications/:id
 * Update application
 */
router.put('/:id', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { notes, aiSummary } = req.body

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        notes,
        aiSummary,
        updatedAt: new Date()
      }
    })

    res.json({ application })
  } catch (error) {
    console.error('Error updating application:', error)
    res.status(500).json({ error: 'Failed to update application' })
  }
})

/**
 * POST /api/v1/applications/:id/advance
 * Move application to next stage
 */
router.post('/:id/advance', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { stage, notes } = req.body

    const application = await prisma.application.findUnique({
      where: { id: req.params.id }
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    // Validate stage transition
    const currentIndex = STAGE_ORDER.indexOf(application.stage)
    const newIndex = STAGE_ORDER.indexOf(stage)

    if (newIndex === -1) {
      return res.status(400).json({ error: 'Invalid stage' })
    }

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        stage,
        notes: notes || application.notes,
        stageUpdatedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        job: {
          select: { title: true },
          include: { client: { select: { companyName: true } } }
        },
        candidate: {
          include: { user: { select: { email: true } } }
        }
      }
    })

    // Send email notification for important stage changes
    const candidateEmail = updated.candidate?.user?.email
    const candidateName = `${updated.candidate?.firstName} ${updated.candidate?.lastName}`
    const jobTitle = updated.job?.title || 'Position'
    const companyName = (updated.job as any)?.client?.companyName || 'Company'

    if (candidateEmail) {
      if (stage === 'offer') {
        // Offer extended
        emailService.sendOfferExtended(candidateEmail, {
          candidateName,
          jobTitle,
          companyName
        }).catch(err => console.error('Failed to send offer email:', err))
      } else if (stage === 'shortlisted') {
        // Shortlisted notification
        emailService.sendApplicationStatusUpdate(candidateEmail, {
          candidateName,
          jobTitle,
          companyName,
          status: 'Shortlisted',
          message: 'Congratulations! You have been shortlisted for the next round.'
        }).catch(err => console.error('Failed to send status email:', err))
      } else if (stage === 'interview') {
        // Interview stage notification
        emailService.sendApplicationStatusUpdate(candidateEmail, {
          candidateName,
          jobTitle,
          companyName,
          status: 'Interview Stage',
          message: 'You have moved to the interview stage. We will contact you soon with scheduling details.'
        }).catch(err => console.error('Failed to send status email:', err))
      }
    }

    res.json({ application: updated })
  } catch (error) {
    console.error('Error advancing application:', error)
    res.status(500).json({ error: 'Failed to advance application' })
  }
})

/**
 * POST /api/v1/applications/:id/reject
 * Reject an application
 */
router.post('/:id/reject', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason, notes } = req.body

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        stage: 'rejected',
        rejectionReason: reason,
        notes,
        stageUpdatedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        job: {
          include: { client: { select: { companyName: true } } }
        },
        candidate: {
          include: { user: { select: { email: true } } }
        }
      }
    })

    // Send rejection email
    const candidateEmail = application.candidate?.user?.email
    if (candidateEmail) {
      emailService.sendApplicationStatusUpdate(candidateEmail, {
        candidateName: `${application.candidate?.firstName} ${application.candidate?.lastName}`,
        jobTitle: application.job?.title || 'Position',
        companyName: (application.job as any)?.client?.companyName || 'Company',
        status: 'Application Update',
        message: 'Thank you for your interest. After careful consideration, we have decided to move forward with other candidates. We encourage you to apply for future positions that match your skills.'
      }).catch(err => console.error('Failed to send rejection email:', err))
    }

    res.json({ application })
  } catch (error) {
    console.error('Error rejecting application:', error)
    res.status(500).json({ error: 'Failed to reject application' })
  }
})

/**
 * POST /api/v1/applications/:id/shortlist
 * Shortlist an application
 */
router.post('/:id/shortlist', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        stage: 'shortlisted',
        notes,
        stageUpdatedAt: new Date(),
        updatedAt: new Date()
      }
    })

    res.json({ application })
  } catch (error) {
    console.error('Error shortlisting application:', error)
    res.status(500).json({ error: 'Failed to shortlist application' })
  }
})

/**
 * POST /api/v1/applications/:id/withdraw
 * Withdraw an application (candidate only)
 */
router.post('/:id/withdraw', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can withdraw applications' })
    }

    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user.userId }
    })

    const application = await prisma.application.findUnique({
      where: { id: req.params.id }
    })

    if (!application || application.candidateId !== candidate?.id) {
      return res.status(404).json({ error: 'Application not found' })
    }

    if (['hired', 'rejected', 'withdrawn'].includes(application.stage)) {
      return res.status(400).json({ error: 'Cannot withdraw this application' })
    }

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        stage: 'withdrawn',
        stageUpdatedAt: new Date(),
        updatedAt: new Date()
      }
    })

    res.json({ application: updated })
  } catch (error) {
    console.error('Error withdrawing application:', error)
    res.status(500).json({ error: 'Failed to withdraw application' })
  }
})

/**
 * GET /api/v1/applications/pipeline
 * Get application pipeline stats for a job
 */
router.get('/pipeline/:jobId', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const stages = await prisma.application.groupBy({
      by: ['stage'],
      where: { jobId: req.params.jobId },
      _count: { stage: true }
    })

    const pipeline = STAGE_ORDER.map(stage => ({
      stage,
      count: stages.find(s => s.stage === stage)?._count.stage || 0
    }))

    const total = pipeline.reduce((acc, p) => acc + p.count, 0)

    res.json({ pipeline, total })
  } catch (error) {
    console.error('Error fetching pipeline:', error)
    res.status(500).json({ error: 'Failed to fetch pipeline' })
  }
})

export default router
