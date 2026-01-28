import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { imochaService, IMochaWebhookPayload } from '../services/imocha.service.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'
import { socketService } from '../services/socket.service.js'

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
    console.error('Error fetching tests:', error)
    // Return mock tests if iMocha API is not configured
    res.json({
      tests: [
        { id: 'react-senior', name: 'React.js Senior Developer', category: 'Frontend', duration: 60, skills: ['React', 'JavaScript', 'TypeScript'], difficulty: 'Advanced' },
        { id: 'python-backend', name: 'Python Backend Developer', category: 'Backend', duration: 45, skills: ['Python', 'Django', 'SQL'], difficulty: 'Intermediate' },
        { id: 'nodejs-fullstack', name: 'Node.js Full Stack', category: 'Full Stack', duration: 60, skills: ['Node.js', 'Express', 'React'], difficulty: 'Advanced' },
        { id: 'devops-aws', name: 'DevOps & AWS', category: 'DevOps', duration: 45, skills: ['AWS', 'Docker', 'Kubernetes'], difficulty: 'Advanced' },
        { id: 'ml-python', name: 'Machine Learning with Python', category: 'Data Science', duration: 60, skills: ['Python', 'TensorFlow', 'Scikit-learn'], difficulty: 'Advanced' },
      ]
    })
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

    // Try to send real invitation, fall back to mock
    let result
    try {
      result = await imochaService.inviteCandidate({
        testId: input.testId,
        candidateId: input.candidateId,
        candidateEmail: candidate.user.email,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        applicationId: input.applicationId,
        expiresAt,
      })
    } catch {
      // Create mock assessment if iMocha API is not configured
      const mockAssessment = await prisma.assessment.create({
        data: {
          candidateId: input.candidateId,
          applicationId: input.applicationId,
          imochaTestId: input.testId,
          imochaInvitationId: `mock-inv-${Date.now()}`,
          testName: input.testId,
          status: 'invited',
          invitedAt: new Date(),
          expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      })

      // Update application stage if linked
      if (input.applicationId) {
        await prisma.application.update({
          where: { id: input.applicationId },
          data: { stage: 'assessment' }
        })
      }

      result = {
        assessment: mockAssessment,
        invitation: {
          invitationId: mockAssessment.imochaInvitationId,
          testId: input.testId,
          testUrl: `https://assessment.imocha.io/test/${mockAssessment.imochaInvitationId}`,
          expiresAt: mockAssessment.expiresAt?.toISOString(),
        }
      }
    }

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
            job: { select: { id: true, title: true } }
          }
        }
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
    // Get applications that have been screened (have match score) but don't have assessments yet
    const pendingApplications = await prisma.application.findMany({
      where: {
        matchScore: { not: null },
        stage: { in: ['screening', 'new'] },
        assessments: {
          none: {} // No assessments assigned yet
        }
      },
      include: {
        candidate: {
          include: {
            user: { select: { email: true } },
            skillBadges: {
              where: { expiresAt: { gt: new Date() } },
              take: 5
            }
          }
        },
        job: {
          include: {
            client: { select: { companyName: true, companyLogoUrl: true } }
          }
        }
      },
      orderBy: [
        { matchScore: 'desc' },
        { appliedAt: 'desc' }
      ]
    })

    // Format response
    const candidates = pendingApplications.map(app => ({
      applicationId: app.id,
      candidateId: app.candidateId,
      jobId: app.jobId,
      candidate: {
        id: app.candidate.id,
        firstName: app.candidate.firstName,
        lastName: app.candidate.lastName,
        email: app.candidate.user.email,
        headline: app.candidate.headline,
        location: app.candidate.location,
        experienceYears: app.candidate.experienceYears,
        skills: app.candidate.skills,
        profileScore: app.candidate.profileScore,
        badges: app.candidate.skillBadges.map(b => ({
          skillName: b.skillName,
          level: b.badgeLevel,
          percentile: b.percentile
        }))
      },
      job: {
        id: app.job.id,
        title: app.job.title,
        company: app.job.client.companyName,
        companyLogo: app.job.client.companyLogoUrl,
        skillsRequired: app.job.skillsRequired,
        recommendedTestId: app.job.imochaTestId
      },
      matchScore: app.matchScore,
      aiSummary: app.aiSummary,
      appliedAt: app.appliedAt,
      stage: app.stage
    }))

    res.json({
      candidates,
      total: candidates.length
    })
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
    const { applicationId, testId, expiresInDays = 7, notes } = req.body

    if (!applicationId || !testId) {
      return res.status(400).json({ error: 'Application ID and Test ID are required' })
    }

    // Get application with candidate details
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          include: { user: { select: { email: true } } }
        },
        job: {
          include: { client: { select: { companyName: true } } }
        }
      }
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    // Check if assessment already exists
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        applicationId,
        status: { in: ['pending', 'invited', 'started'] }
      }
    })

    if (existingAssessment) {
      return res.status(409).json({
        error: 'Assessment already allocated for this application',
        assessmentId: existingAssessment.id
      })
    }

    // Calculate expiration
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    // Create assessment invitation via iMocha service
    const result = await imochaService.inviteCandidate({
      testId,
      candidateId: application.candidateId,
      candidateEmail: application.candidate.user.email,
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      applicationId,
      expiresAt
    })

    // Log admin action
    await prisma.aiAction.create({
      data: {
        agentType: 'admin',
        actionType: 'allocate_assessment',
        entityType: 'application',
        entityId: applicationId,
        inputPayload: {
          testId,
          candidateId: application.candidateId,
          candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
          jobTitle: application.job.title,
          matchScore: application.matchScore,
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

    // Send notification to candidate
    socketService.sendNotification(application.candidate.userId, {
      id: `assessment-${result.assessment.id}`,
      type: 'assessment_invite',
      title: 'Assessment Invitation',
      message: `You've been invited to complete an assessment for ${application.job.title} at ${application.job.client.companyName}`
    })

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
