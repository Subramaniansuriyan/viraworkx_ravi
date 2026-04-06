import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'
import { emailService } from '../services/email.service.js'
import { socketService } from '../services/socket.service.js'

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
    const { jobId, candidateId, stage, search, limit = '50', offset = '0' } = req.query

    const where: any = {}

    // Candidates can only see their own applications
    if (req.user?.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId }
      })
      if (candidate) {
        where.candidateId = candidate.id
      }
    } else if (req.user?.userType === 'client') {
      // Clients only see applications for their own jobs
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId },
        select: { clientId: true }
      })
      if (clientUser) {
        where.job = { clientId: clientUser.clientId }
      }
      if (jobId) where.jobId = jobId
      if (candidateId) where.candidateId = candidateId
    } else {
      if (jobId) where.jobId = jobId
      if (candidateId) where.candidateId = candidateId
    }

    if (stage) {
      where.stage = stage
    }

    if (search) {
      where.candidate = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
        ]
      }
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
        },
        assessments: {
          where: { status: 'completed' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { score: true, maxScore: true }
        },
        contracts: {
          where: { status: { not: 'terminated' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true }
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { appliedAt: 'desc' }
    })

    const total = await prisma.application.count({ where })

    function computeTier(score: number | null, maxScore: number | null): string | null {
      if (score == null || maxScore == null || maxScore === 0) return null
      const pct = (score / maxScore) * 100
      if (pct > 80) return 'Tier 1'
      if (pct > 70) return 'Tier 2'
      if (pct > 60) return 'Tier 3'
      return null
    }

    const enrichedApplications = applications.map((app) => {
      const { assessments, ...rest } = app
      const latestAssessment = assessments?.[0]
      return {
        ...rest,
        assessmentTier: rest.assessmentTier || computeTier(
          latestAssessment?.score ?? null,
          latestAssessment?.maxScore ?? null
        )
      }
    })

    res.json({ applications: enrichedApplications, total })
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

    // Candidates can only see their own applications
    if (req.user?.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({ where: { userId: req.user.userId } })
      if (candidate?.id !== application.candidateId) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    // Clients can only see applications for their own jobs
    if (req.user?.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({ where: { userId: req.user.userId } })
      if (!clientUser || application.job.clientId !== clientUser.clientId) {
        return res.status(403).json({ error: 'Forbidden' })
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
    const { stage, notes, assessmentTier } = req.body

    const application = await prisma.application.findUnique({
      where: { id: req.params.id }
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    // Validate stage transition — auto-advance to next stage if none specified
    const currentIndex = STAGE_ORDER.indexOf(application.stage)
    const resolvedStage = stage || STAGE_ORDER[currentIndex + 1]

    if (!resolvedStage || STAGE_ORDER.indexOf(resolvedStage) === -1) {
      return res.status(400).json({ error: 'Invalid or no next stage available' })
    }

    const newIndex = STAGE_ORDER.indexOf(resolvedStage)

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        stage: resolvedStage,
        notes: notes || application.notes,
        ...(assessmentTier !== undefined && { assessmentTier }),
        stageUpdatedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        job: {
          select: { title: true, client: { select: { companyName: true } } }
        },
        candidate: {
          include: { user: { select: { id: true, email: true } } }
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

    // Send real-time notification
    const candidateUserId = updated.candidate?.user?.id || updated.candidate?.userId
    if (candidateUserId) {
      socketService.notifyApplicationUpdated(
        updated.id,
        stage,
        application.stage,
        candidateUserId
      )
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
        message: reason
          ? `Thank you for your interest. After careful review, we were unable to move forward at this time. Reason: ${reason}`
          : 'Thank you for your interest. After careful consideration, we have decided to move forward with other candidates. We encourage you to apply for future positions.'
      }).catch(err => console.error('Failed to send rejection email:', err))
    }

    // Send real-time rejection notification
    const candidateUserId = application.candidate?.userId
    if (candidateUserId) {
      socketService.notifyApplicationRejected(application.id, candidateUserId, reason)
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

/**
 * POST /api/v1/applications/admin/enroll
 * Admin manually enrolls a candidate into a job's pipeline (HITL workflow).
 */
router.post('/admin/enroll', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { candidateId, jobId, notes } = req.body
    if (!candidateId || !jobId) {
      return res.status(400).json({ error: 'candidateId and jobId are required' })
    }

    const [candidate, job] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: candidateId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ])
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })
    if (!job) return res.status(404).json({ error: 'Job not found' })

    // Prevent duplicate applications — allow re-enroll if previously rejected/withdrawn
    const existing = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId, jobId } },
    })
    if (existing) {
      if (!['rejected', 'withdrawn'].includes(existing.stage)) {
        return res.status(409).json({ error: 'Candidate already in pipeline for this job' })
      }
      // Delete old rejected/withdrawn record to allow fresh enrollment
      await prisma.application.delete({ where: { id: existing.id } })
    }

    // Simple match score based on skill overlap
    const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase())
    const jobSkills = (job.skillsRequired || []).map((s: string) => s.toLowerCase())
    const overlap = candidateSkills.filter((s: string) => jobSkills.includes(s)).length
    const matchScore = jobSkills.length > 0 ? Math.round((overlap / jobSkills.length) * 100) : 0

    const application = await prisma.application.create({
      data: {
        candidateId,
        jobId,
        stage: 'new',
        source: 'admin',
        matchScore,
        notes: notes || null,
      },
      include: {
        candidate: { include: { user: { select: { email: true } } } },
        job: { include: { client: { select: { companyName: true } } } },
      },
    })

    res.status(201).json({ application })
  } catch (error) {
    console.error('Error enrolling candidate:', error)
    res.status(500).json({ error: 'Failed to enroll candidate' })
  }
})

export default router
