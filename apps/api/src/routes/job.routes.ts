import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { authenticateToken, optionalAuth, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

// Validation schemas
const createJobSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.enum(['freelancer', 'contractor']).optional(),
  experienceMin: z.number().int().min(0).optional(),
  experienceMax: z.number().int().min(0).optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  salaryCurrency: z.string().length(3).default('USD'),
  location: z.string().optional(),
  remotePolicy: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  skillsRequired: z.array(z.string()).default([]),
  skillsPreferred: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  imochaTestId: z.string().optional(),
})

const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['draft', 'active', 'paused', 'closed', 'filled']).optional(),
})

/**
 * GET /api/v1/jobs
 * List all jobs (public for active, all for clients)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, skills, location, remotePolicy, employmentType, limit = '20', offset = '0' } = req.query

    const where: any = {}

    // Public users only see active jobs
    if (!req.user || req.user.userType === 'candidate') {
      where.status = 'active'
    } else if (status) {
      where.status = status
    }

    if (skills) {
      const skillList = (skills as string).split(',')
      where.skillsRequired = { hasSome: skillList }
    }

    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' }
    }

    if (remotePolicy) {
      where.remotePolicy = remotePolicy
    }

    if (employmentType) {
      where.employmentType = employmentType
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true, companyLogoUrl: true, industry: true } },
        _count: { select: { applications: true } }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.job.count({ where })

    res.json({
      jobs: jobs.map(j => ({
        id: j.id,
        title: j.title,
        description: j.description,
        department: j.department,
        employmentType: j.employmentType,
        experienceMin: j.experienceMin,
        experienceMax: j.experienceMax,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: j.salaryCurrency,
        location: j.location,
        remotePolicy: j.remotePolicy,
        skillsRequired: j.skillsRequired,
        skillsPreferred: j.skillsPreferred,
        benefits: j.benefits,
        status: j.status,
        client: j.client,
        applicationCount: j._count.applications,
        createdAt: j.createdAt,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    res.status(500).json({ error: 'Failed to fetch jobs' })
  }
})

/**
 * GET /api/v1/jobs/pending-approval
 * Jobs submitted by clients awaiting admin approval (draft jobs with a clientId)
 */
router.get('/pending-approval', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: 'draft', clientId: { not: undefined } },
      include: {
        client: { select: { id: true, companyName: true } },
        _count: { select: { applications: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json({ jobs })
  } catch (error) {
    console.error('Error fetching pending jobs:', error)
    res.status(500).json({ error: 'Failed to fetch pending jobs' })
  }
})

/**
 * GET /api/v1/jobs/:id
 * Get job by ID
 */
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, companyName: true, companyLogoUrl: true, industry: true, description: true } },
        _count: { select: { applications: true } }
      }
    })

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Check if job is accessible
    if (job.status !== 'active' && (!req.user || req.user.userType === 'candidate')) {
      return res.status(404).json({ error: 'Job not found' })
    }

    res.json({ job })
  } catch (error) {
    console.error('Error fetching job:', error)
    res.status(500).json({ error: 'Failed to fetch job' })
  }
})

/**
 * POST /api/v1/jobs
 * Create a new job (clients only)
 */
router.post('/', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = createJobSchema.parse(req.body)

    // Get client for the current user
    const clientUser = await prisma.clientUser.findFirst({
      where: { userId: req.user!.userId }
    })

    if (!clientUser) {
      return res.status(403).json({ error: 'You must be associated with a company to create jobs' })
    }

    const job = await prisma.job.create({
      data: {
        ...input,
        clientId: clientUser.clientId,
        createdById: req.user!.userId,
        status: 'draft',
      },
      include: {
        client: { select: { companyName: true } }
      }
    })

    res.status(201).json({ job })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error creating job:', error)
    res.status(500).json({ error: 'Failed to create job' })
  }
})

/**
 * PUT /api/v1/jobs/:id
 * Update a job
 */
router.put('/:id', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = updateJobSchema.parse(req.body)

    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { client: { include: { clientUsers: true } } }
    })

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Check if user has access to this job
    const hasAccess = req.user?.userType === 'admin' ||
      job.client.clientUsers.some(cu => cu.userId === req.user?.userId)

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this job' })
    }

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        ...input,
        updatedAt: new Date(),
        postedAt: input.status === 'active' && job.status !== 'active' ? new Date() : job.postedAt,
      },
      include: {
        client: { select: { companyName: true } }
      }
    })

    res.json({ job: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error updating job:', error)
    res.status(500).json({ error: 'Failed to update job' })
  }
})

/**
 * DELETE /api/v1/jobs/:id
 * Delete a job
 */
router.delete('/:id', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { client: { include: { clientUsers: true } } }
    })

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Check if user has access
    const hasAccess = req.user?.userType === 'admin' ||
      job.client.clientUsers.some(cu => cu.userId === req.user?.userId)

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this job' })
    }

    await prisma.job.delete({ where: { id: req.params.id } })

    res.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error deleting job:', error)
    res.status(500).json({ error: 'Failed to delete job' })
  }
})

/**
 * POST /api/v1/jobs/:id/publish
 * Publish a job
 */
router.post('/:id/publish', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: 'active',
        postedAt: new Date(),
      }
    })

    res.json({ message: 'Job published successfully', job })
  } catch (error) {
    console.error('Error publishing job:', error)
    res.status(500).json({ error: 'Failed to publish job' })
  }
})

/**
 * POST /api/v1/jobs/:id/close
 * Close a job
 */
router.post('/:id/close', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: reason === 'filled' ? 'filled' : 'closed',
        closedAt: new Date(),
      }
    })

    res.json({ message: 'Job closed successfully', job })
  } catch (error) {
    console.error('Error closing job:', error)
    res.status(500).json({ error: 'Failed to close job' })
  }
})

/**
 * POST /api/v1/jobs/:id/approve
 * Approve a pending job (admin only) - publishes it
 */
router.post('/:id/approve', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ error: 'Job not found' })

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'active', postedAt: new Date(), updatedAt: new Date() },
      include: { client: { select: { companyName: true } } }
    })
    res.json({ job: updated })
  } catch (error) {
    console.error('Error approving job:', error)
    res.status(500).json({ error: 'Failed to approve job' })
  }
})

/**
 * POST /api/v1/jobs/:id/reject-approval
 * Reject a pending job (admin only) - keeps it as draft
 */
router.post('/:id/reject-approval', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body
    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'draft', updatedAt: new Date() }
    })
    res.json({ job: updated, reason })
  } catch (error) {
    console.error('Error rejecting job:', error)
    res.status(500).json({ error: 'Failed to reject job' })
  }
})

/**
 * POST /api/v1/jobs/:id/apply
 * Apply for a job
 */
router.post('/:id/apply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can apply for jobs' })
    }

    const { coverLetter } = req.body

    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    })

    if (!job || job.status !== 'active') {
      return res.status(404).json({ error: 'Job not found or not accepting applications' })
    }

    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user.userId }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate profile not found' })
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id
        }
      }
    })

    if (existing) {
      return res.status(409).json({ error: 'You have already applied for this job' })
    }

    // Calculate match score
    const skillMatch = job.skillsRequired.filter(s => candidate.skills.includes(s)).length
    const matchScore = Math.round((skillMatch / (job.skillsRequired.length || 1)) * 100)

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        coverLetter,
        matchScore,
        stage: 'new',
        source: 'direct',
      },
      include: {
        job: {
          include: { client: { select: { companyName: true } } }
        }
      }
    })

    res.status(201).json({ application })
  } catch (error) {
    console.error('Error applying for job:', error)
    res.status(500).json({ error: 'Failed to apply for job' })
  }
})

/**
 * GET /api/v1/jobs/:id/applications
 * Get applications for a job (clients only)
 */
router.get('/:id/applications', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { stage, limit = '50', offset = '0' } = req.query

    const where: any = { jobId: req.params.id }
    if (stage) where.stage = stage

    const applications = await prisma.application.findMany({
      where,
      include: {
        candidate: {
          include: {
            user: { select: { email: true } },
            skillBadges: {
              where: { expiresAt: { gt: new Date() } },
              take: 5
            }
          }
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: [
        { matchScore: 'desc' },
        { appliedAt: 'desc' }
      ]
    })

    const total = await prisma.application.count({ where })

    res.json({ applications, total })
  } catch (error) {
    console.error('Error fetching applications:', error)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

/**
 * GET /api/v1/jobs/:id/candidates
 * Get AI-ranked candidates for a job
 */
router.get('/:id/candidates', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    })

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Find candidates with matching skills
    const candidates = await prisma.candidate.findMany({
      where: {
        skills: { hasSome: job.skillsRequired }
      },
      include: {
        user: { select: { email: true } },
        skillBadges: {
          where: {
            skillName: { in: job.skillsRequired },
            expiresAt: { gt: new Date() }
          }
        },
        applications: {
          where: { jobId: job.id },
          take: 1
        }
      },
      take: 50
    })

    // Calculate match scores and rank
    const rankedCandidates = candidates.map(c => {
      const skillMatch = job.skillsRequired.filter(s => c.skills.includes(s)).length
      const badgeBonus = c.skillBadges.reduce((acc, b) => {
        const bonus = b.badgeLevel === 'expert' ? 10 : b.badgeLevel === 'advanced' ? 5 : 2
        return acc + bonus
      }, 0)
      const matchScore = Math.round((skillMatch / job.skillsRequired.length) * 100) + Math.min(badgeBonus, 20)

      return {
        ...c,
        matchScore: Math.min(matchScore, 100),
        hasApplied: c.applications.length > 0
      }
    }).sort((a, b) => b.matchScore - a.matchScore)

    res.json({ candidates: rankedCandidates })
  } catch (error) {
    console.error('Error fetching candidates:', error)
    res.status(500).json({ error: 'Failed to fetch candidates' })
  }
})

/**
 * POST /api/v1/jobs/:id/save
 * Save or unsave a job (candidate only) — toggles
 */
router.post('/:id/save', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can save jobs' })
    }
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user.userId } })
    if (!candidate) return res.status(404).json({ error: 'Candidate profile not found' })

    const existing = await prisma.savedJob.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: req.params.id } }
    })

    if (existing) {
      await prisma.savedJob.delete({ where: { id: existing.id } })
      res.json({ saved: false })
    } else {
      await prisma.savedJob.create({ data: { candidateId: candidate.id, jobId: req.params.id } })
      res.json({ saved: true })
    }
  } catch (error) {
    console.error('Error toggling saved job:', error)
    res.status(500).json({ error: 'Failed to save job' })
  }
})

/**
 * GET /api/v1/jobs/saved
 * Get all saved jobs for current candidate
 */
router.get('/saved/list', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can view saved jobs' })
    }
    const candidate = await prisma.candidate.findUnique({ where: { userId: req.user.userId } })
    if (!candidate) return res.status(404).json({ error: 'Candidate profile not found' })

    const savedJobs = await prisma.savedJob.findMany({
      where: { candidateId: candidate.id },
      include: {
        job: {
          include: { client: { select: { companyName: true, companyLogoUrl: true } } }
        }
      },
      orderBy: { savedAt: 'desc' }
    })

    res.json({ savedJobs: savedJobs.map(s => ({ ...s.job, savedAt: s.savedAt })) })
  } catch (error) {
    console.error('Error fetching saved jobs:', error)
    res.status(500).json({ error: 'Failed to fetch saved jobs' })
  }
})

export default router
