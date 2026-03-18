import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { imochaService, IMochaWebhookPayload } from '../services/imocha.service.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'
import { socketService } from '../services/socket.service.js'
import { emailService } from '../services/email.service.js'

const router = Router()

// Validation schemas
const inviteSchema = z.object({
  testId: z.string().min(1, 'Test ID is required'),
  candidateId: z.string().uuid('Invalid candidate ID'),
  applicationId: z.string().uuid('Invalid application ID').optional(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
})

/**
 * GET /api/v1/assessments/tests
 * List available iMocha tests
 */
router.get('/tests', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query
    const tests = await imochaService.getTests(category as string | undefined)

    res.json({ tests })
  } catch (error) {
    console.error('Error fetching tests from iMocha:', error)
    res.status(502).json({ error: 'Failed to fetch tests from iMocha' })
  }
})

/**
 * POST /api/v1/assessments/invite
 * Send assessment invitation to a candidate
 */
router.post('/invite', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const input = inviteSchema.parse(req.body)

    // Get candidate details
    const candidate = await prisma.candidate.findUnique({
      where: { id: input.candidateId },
      include: { user: { select: { email: true } } }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' })
    }

    // Check if candidate already has a pending assessment for this test
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        candidateId: input.candidateId,
        imochaTestId: input.testId,
        status: { in: ['pending', 'invited', 'started'] }
      }
    })

    if (existingAssessment) {
      return res.status(409).json({
        error: 'Candidate already has a pending assessment for this test',
        assessmentId: existingAssessment.id,
      })
    }

    // Calculate expiration date
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined

    const result = await imochaService.inviteCandidate({
      testId: input.testId,
      candidateId: input.candidateId,
      candidateEmail: candidate.user.email,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      applicationId: input.applicationId,
      expiresAt,
    })

    // Send real-time notification
    const candidateUserId = candidate.userId
    if (candidateUserId && input.applicationId) {
      socketService.notifyAssessmentInvited(
        result.assessment.id,
        input.applicationId,
        input.testId,
        candidateUserId
      )
    }

    res.status(201).json({
      message: 'Assessment invitation sent',
      assessment: result.assessment,
      testUrl: result.invitation.testUrl,
      expiresAt: result.invitation.expiresAt,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      })
    }
    console.error('Error sending invitation:', error)
    res.status(500).json({ error: 'Failed to send assessment invitation' })
  }
})

/**
 * GET /api/v1/assessments
 * List assessments (filtered by user type)
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { candidateId, status, applicationId } = req.query

    const where: any = {}

    // Filter by candidate for candidate users
    if (req.user?.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId }
      })
      if (candidate) {
        where.candidateId = candidate.id
      }
    } else if (candidateId) {
      where.candidateId = candidateId
    }

    if (status) {
      where.status = status
    }

    if (applicationId) {
      where.applicationId = applicationId
    }

    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } }
          }
        },
        application: {
          select: {
            id: true,
            job: { select: { id: true, title: true, client: { select: { companyName: true } } } }
          }
        },
        skillBadges: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({ assessments })
  } catch (error) {
    console.error('Error fetching assessments:', error)
    res.status(500).json({ error: 'Failed to fetch assessments' })
  }
})

/**
 * GET /api/v1/assessments/:id
 * Get assessment details
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } }
          }
        },
        application: {
          select: {
            id: true,
            job: { select: { id: true, title: true, client: { select: { companyName: true } } } }
          }
        },
        skillBadges: true,
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    res.json({ assessment })
  } catch (error) {
    console.error('Error fetching assessment:', error)
    res.status(500).json({ error: 'Failed to fetch assessment' })
  }
})

/**
 * GET /api/v1/assessments/:id/report
 * Get assessment report/results
 */
router.get('/:id/report', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        skillBadges: true,
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.status !== 'completed') {
      return res.status(400).json({ error: 'Assessment not yet completed' })
    }

    res.json({
      report: {
        assessmentId: assessment.id,
        candidateName: `${assessment.candidate.firstName} ${assessment.candidate.lastName}`,
        testName: assessment.testName,
        score: assessment.score,
        maxScore: assessment.maxScore,
        percentile: assessment.percentile,
        skillScores: assessment.skillScores,
        badges: assessment.skillBadges.map(b => ({
          skill: b.skillName,
          level: b.badgeLevel,
          percentile: b.percentile,
        })),
        reportUrl: assessment.reportUrl,
        completedAt: assessment.completedAt,
        proctoringFlags: assessment.proctoringFlags,
      }
    })
  } catch (error) {
    console.error('Error fetching report:', error)
    res.status(500).json({ error: 'Failed to fetch assessment report' })
  }
})

/**
 * POST /api/v1/assessments/webhook
 * iMocha webhook handler
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body)
    const signature = req.headers['x-imocha-signature'] as string

    // Verify webhook signature (if secret is configured)
    if (signature) {
      const isValid = imochaService.verifyWebhookSignature(rawBody, signature)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    const payload = req.body as IMochaWebhookPayload

    // Validate payload
    if (!payload.event || !payload.data) {
      return res.status(400).json({ error: 'Invalid webhook payload' })
    }

    // Process webhook asynchronously
    imochaService.handleWebhook(payload).catch(err => {
      console.error('Webhook processing error:', err)
    })

    // Respond immediately to acknowledge receipt
    res.status(200).json({ received: true, event: payload.event })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

/**
 * POST /api/v1/assessments/:id/simulate-complete
 * Simulate assessment completion (for testing)
 */
router.post('/:id/simulate-complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.status === 'completed') {
      return res.status(400).json({ error: 'Assessment already completed' })
    }

    // Simulate webhook payload
    const mockPayload: IMochaWebhookPayload = {
      event: 'test.completed',
      timestamp: new Date().toISOString(),
      data: {
        attemptId: `mock-attempt-${Date.now()}`,
        invitationId: assessment.imochaInvitationId || '',
        testId: assessment.imochaTestId,
        candidateEmail: '',
        score: req.body.score || Math.floor(Math.random() * 20) + 80, // 80-100
        maxScore: 100,
        percentile: req.body.percentile || Math.floor(Math.random() * 30) + 70, // 70-100
        reportUrl: `https://reports.imocha.io/${assessment.id}`,
        proctoringFlags: {
          faceNotDetected: false,
          multipleFaces: false,
          tabSwitched: req.body.tabSwitched || false,
          copyPasteDetected: false,
        }
      }
    }

    // Process the mock webhook
    await imochaService.handleWebhook(mockPayload)

    // Fetch updated assessment
    const updatedAssessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { skillBadges: true }
    })

    res.json({
      message: 'Assessment completion simulated',
      assessment: updatedAssessment,
    })
  } catch (error) {
    console.error('Error simulating completion:', error)
    res.status(500).json({ error: 'Failed to simulate assessment completion' })
  }
})

/**
 * GET /api/v1/assessments/candidate/:candidateId/badges
 * Get all skill badges for a candidate
 */
router.get('/candidate/:candidateId/badges', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const badges = await prisma.skillBadge.findMany({
      where: {
        candidateId: req.params.candidateId,
        expiresAt: { gt: new Date() } // Only valid badges
      },
      orderBy: { percentile: 'desc' }
    })

    res.json({ badges })
  } catch (error) {
    console.error('Error fetching badges:', error)
    res.status(500).json({ error: 'Failed to fetch skill badges' })
  }
})

// ============ ADMIN: Human-in-the-Loop Test Allocation ============

/**
 * GET /api/v1/assessments/admin/pending-allocation
 * Get candidates with match scores pending test allocation (Admin only)
 */
router.get('/admin/pending-allocation', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Find candidate IDs that already have an active assessment
    const activeAssessments = await prisma.assessment.findMany({
      where: { status: { in: ['pending', 'invited', 'started'] } },
      select: { candidateId: true },
    })
    const excludedIds = [...new Set(activeAssessments.map(a => a.candidateId))]

    // Return all candidates without an active assessment
    const candidateRecords = await prisma.candidate.findMany({
      where: {
        id: { notIn: excludedIds }
      },
      include: {
        user: { select: { email: true } },
        skillBadges: {
          where: { expiresAt: { gt: new Date() } },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const candidates = candidateRecords.map(c => ({
      candidateId: c.id,
      candidate: {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.user.email,
        headline: c.headline,
        location: c.location,
        experienceYears: c.experienceYears,
        skills: c.skills,
        profileScore: c.profileScore,
        badges: c.skillBadges.map(b => ({
          skillName: b.skillName,
          level: b.badgeLevel,
          percentile: b.percentile
        }))
      }
    }))

    res.json({ candidates, total: candidates.length })
  } catch (error) {
    console.error('Error fetching pending allocations:', error)
    res.status(500).json({ error: 'Failed to fetch pending allocations' })
  }
})

/**
 * POST /api/v1/assessments/admin/allocate
 * Admin allocates a test to a matched candidate (Human-in-the-Loop)
 */
router.post('/admin/allocate', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { candidateId, testId, expiresInDays = 7, notes } = req.body

    if (!candidateId || !testId) {
      return res.status(400).json({ error: 'Candidate ID and Test ID are required' })
    }

    // Get candidate details
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { user: { select: { email: true } } }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' })
    }

    // Check if active assessment already exists for this candidate+test
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        candidateId,
        imochaTestId: testId,
        status: { in: ['pending', 'invited', 'started'] }
      }
    })

    if (existingAssessment) {
      return res.status(409).json({
        error: 'Candidate already has an active assessment for this test',
        assessmentId: existingAssessment.id
      })
    }

    // Check 90-day retake policy
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const recentCompleted = await prisma.assessment.findFirst({
      where: {
        candidateId,
        imochaTestId: testId,
        status: 'completed',
        completedAt: { gte: ninetyDaysAgo }
      }
    })

    if (recentCompleted) {
      const retakeEligibleAt = new Date(recentCompleted.completedAt!.getTime() + 90 * 24 * 60 * 60 * 1000)
      return res.status(409).json({
        error: 'Retake not allowed within 90 days of previous completion',
        completedAt: recentCompleted.completedAt,
        retakeEligibleAt,
      })
    }

    // Calculate expiration
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    // Create assessment invitation via iMocha
    const result = await imochaService.inviteCandidate({
      testId,
      candidateId,
      candidateEmail: candidate.user.email,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      expiresAt
    })

    // Log admin action
    await prisma.aiAction.create({
      data: {
        agentType: 'admin',
        actionType: 'allocate_assessment',
        entityType: 'candidate',
        entityId: candidateId,
        inputPayload: {
          testId,
          candidateId,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          notes
        },
        outputPayload: {
          assessmentId: result.assessment.id,
          invitationId: result.invitation.invitationId
        },
        status: 'completed',
        approvedBy: req.user!.userId,
        approvedAt: new Date(),
        executedAt: new Date()
      }
    })

    // Notify candidate via socket
    socketService.sendNotification(candidate.userId, {
      id: `assessment-${result.assessment.id}`,
      type: 'assessment_invite',
      title: 'Assessment Invitation',
      message: `You've been invited to complete a technical assessment on iMocha`
    })

    // Send email notification (#23)
    const appUrl = process.env.APP_URL || 'https://www.viraworkx.ai'
    emailService.sendAssessmentInvite(candidate.user.email, {
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: 'Technical Skills Assessment',
      companyName: 'ViraWorkx',
      testName: testId,
      testUrl: result.invitation.testUrl || `${appUrl}/assessments`,
      expiresAt: expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }).catch(err => console.error('Failed to send assessment invite email:', err))

    res.json({
      message: 'Assessment allocated successfully',
      assessment: result.assessment,
      invitation: result.invitation
    })
  } catch (error) {
    console.error('Error allocating assessment:', error)
    res.status(500).json({ error: 'Failed to allocate assessment' })
  }
})

/**
 * GET /api/v1/assessments/admin/allocation-history
 * Get history of admin test allocations
 */
router.get('/admin/allocation-history', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const allocations = await prisma.aiAction.findMany({
      where: {
        agentType: 'admin',
        actionType: 'allocate_assessment'
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        approver: { select: { email: true } }
      }
    })

    res.json({
      allocations: allocations.map(a => ({
        id: a.id,
        applicationId: a.entityId,
        testId: (a.inputPayload as any)?.testId,
        candidateName: (a.inputPayload as any)?.candidateName,
        jobTitle: (a.inputPayload as any)?.jobTitle,
        matchScore: (a.inputPayload as any)?.matchScore,
        notes: (a.inputPayload as any)?.notes,
        allocatedBy: a.approver?.email,
        allocatedAt: a.approvedAt,
        assessmentId: (a.outputPayload as any)?.assessmentId
      }))
    })
  } catch (error) {
    console.error('Error fetching allocation history:', error)
    res.status(500).json({ error: 'Failed to fetch allocation history' })
  }
})

export default router
