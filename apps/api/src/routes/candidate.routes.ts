import { Router, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', file.fieldname === 'resume' ? 'resumes' : 'videos')
    fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for resumes
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'resume') {
      const allowed = ['.pdf', '.doc', '.docx']
      const ext = path.extname(file.originalname).toLowerCase()
      if (allowed.includes(ext)) {
        cb(null, true)
      } else {
        cb(new Error('Only PDF and Word documents are allowed'))
      }
    } else if (file.fieldname === 'video') {
      const allowed = ['.mp4', '.webm', '.mov']
      const ext = path.extname(file.originalname).toLowerCase()
      if (allowed.includes(ext)) {
        cb(null, true)
      } else {
        cb(new Error('Only MP4, WebM, and MOV videos are allowed'))
      }
    } else {
      cb(null, true)
    }
  }
})

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  headline: z.string().max(255).optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  currentCompany: z.string().optional(),
  currentTitle: z.string().optional(),
  expectedSalaryMin: z.number().int().min(0).optional(),
  expectedSalaryMax: z.number().int().min(0).optional(),
  salaryCurrency: z.string().length(3).optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  linkedinUrl: z.string().url().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  skills: z.array(z.string()).optional(),
  preferredRoles: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  workAuthorization: z.string().optional(),
  willingToRelocate: z.boolean().optional(),
})

/**
 * GET /api/v1/candidates
 * List all candidates (for clients/admins)
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { skills, location, experienceMin, experienceMax, limit = '20', offset = '0' } = req.query

    const where: any = {}

    if (skills) {
      const skillList = (skills as string).split(',')
      where.skills = { hasSome: skillList }
    }

    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' }
    }

    if (experienceMin || experienceMax) {
      where.experienceYears = {}
      if (experienceMin) where.experienceYears.gte = parseInt(experienceMin as string)
      if (experienceMax) where.experienceYears.lte = parseInt(experienceMax as string)
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        user: { select: { email: true } },
        skillBadges: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { percentile: 'desc' },
          take: 5
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { profileScore: 'desc' }
    })

    const total = await prisma.candidate.count({ where })

    res.json({
      candidates: candidates.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.user.email,
        headline: c.headline,
        location: c.location,
        experienceYears: c.experienceYears,
        skills: c.skills,
        profileScore: c.profileScore,
        skillBadges: c.skillBadges,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })
  } catch (error) {
    console.error('Error fetching candidates:', error)
    res.status(500).json({ error: 'Failed to fetch candidates' })
  }
})

/**
 * GET /api/v1/candidates/:id
 * Get candidate by ID
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true } },
        skillBadges: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { percentile: 'desc' }
        },
        assessments: {
          where: { status: 'completed' },
          orderBy: { completedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' })
    }

    res.json({ candidate })
  } catch (error) {
    console.error('Error fetching candidate:', error)
    res.status(500).json({ error: 'Failed to fetch candidate' })
  }
})

/**
 * GET /api/v1/me/profile
 * Get current user's profile
 */
router.get('/me/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can access this endpoint' })
    }

    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: { select: { email: true } },
        applications: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                location: true,
                client: { select: { companyName: true } }
              }
            }
          },
          orderBy: { appliedAt: 'desc' },
          take: 10
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        skillBadges: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { percentile: 'desc' }
        }
      }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    res.json({ profile: candidate })
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

/**
 * PUT /api/v1/me/profile
 * Update current user's profile
 */
router.put('/me/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can update their profile' })
    }

    const input = updateProfileSchema.parse(req.body)

    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user.userId }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        ...input,
        updatedAt: new Date()
      },
      include: {
        user: { select: { email: true } },
        skillBadges: {
          where: { expiresAt: { gt: new Date() } }
        }
      }
    })

    res.json({ profile: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

/**
 * POST /api/v1/me/resume
 * Upload resume
 */
router.post('/me/resume', authenticateToken, upload.single('resume'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can upload resumes' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const resumeUrl = `/uploads/resumes/${req.file.filename}`

    const candidate = await prisma.candidate.update({
      where: { userId: req.user.userId },
      data: { resumeUrl }
    })

    res.json({
      message: 'Resume uploaded successfully',
      resumeUrl,
      candidateId: candidate.id
    })
  } catch (error) {
    console.error('Error uploading resume:', error)
    res.status(500).json({ error: 'Failed to upload resume' })
  }
})

/**
 * POST /api/v1/me/video
 * Upload video profile
 */
router.post('/me/video', authenticateToken, upload.single('video'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can upload videos' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`

    const candidate = await prisma.candidate.update({
      where: { userId: req.user.userId },
      data: { videoProfileUrl: videoUrl }
    })

    res.json({
      message: 'Video uploaded successfully',
      videoUrl,
      candidateId: candidate.id
    })
  } catch (error) {
    console.error('Error uploading video:', error)
    res.status(500).json({ error: 'Failed to upload video' })
  }
})

/**
 * GET /api/v1/me/applications
 * Get current user's applications
 */
router.get('/me/applications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can access this endpoint' })
    }

    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user.userId }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const applications = await prisma.application.findMany({
      where: { candidateId: candidate.id },
      include: {
        job: {
          include: {
            client: { select: { companyName: true, companyLogoUrl: true } }
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    })

    res.json({ applications })
  } catch (error) {
    console.error('Error fetching applications:', error)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

/**
 * GET /api/v1/me/job-matches
 * Get AI-powered job recommendations
 */
router.get('/me/job-matches', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can access this endpoint' })
    }

    const candidate = await prisma.candidate.findUnique({
      where: { userId: req.user.userId }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    // Find jobs matching candidate skills
    const jobs = await prisma.job.findMany({
      where: {
        status: 'active',
        OR: [
          { skillsRequired: { hasSome: candidate.skills } },
          { location: candidate.preferredLocations?.length ? { in: candidate.preferredLocations } : undefined }
        ]
      },
      include: {
        client: { select: { companyName: true, companyLogoUrl: true } }
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    })

    // Calculate match scores
    const matchScores: Record<string, number> = {}
    jobs.forEach(job => {
      const skillMatch = job.skillsRequired.filter(s => candidate.skills.includes(s)).length
      const totalRequired = job.skillsRequired.length || 1
      matchScores[job.id] = Math.round((skillMatch / totalRequired) * 100)
    })

    // Sort by match score
    const sortedJobs = jobs.sort((a, b) => matchScores[b.id] - matchScores[a.id])

    res.json({ jobs: sortedJobs, matchScores })
  } catch (error) {
    console.error('Error fetching job matches:', error)
    res.status(500).json({ error: 'Failed to fetch job matches' })
  }
})

export default router
