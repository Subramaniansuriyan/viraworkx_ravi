import { Router, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'resumes'
    if (file.fieldname === 'video') subDir = 'videos'
    else if (file.fieldname === 'document') subDir = 'documents'
    const uploadDir = path.join(process.cwd(), 'uploads', subDir)
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
    fileSize: 10 * 1024 * 1024, // 10MB
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
    } else if (file.fieldname === 'document') {
      const allowed = ['.jpg', '.jpeg', '.png', '.pdf']
      const ext = path.extname(file.originalname).toLowerCase()
      if (allowed.includes(ext)) {
        cb(null, true)
      } else {
        cb(new Error('Only JPG, PNG, and PDF files are allowed'))
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
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g., ABCDE1234F)').optional().nullable(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits').optional().nullable(),
})

/**
 * GET /api/v1/candidates
 * List all candidates (for clients/admins only)
 */
router.get('/', authenticateToken, requireRole('admin', 'client'), async (req: AuthRequest, res: Response) => {
  try {
    const { skills, location, experienceMin, experienceMax, tier, limit = '20', offset = '0', page, search } = req.query

    // Support both page-based (frontend) and offset-based pagination
    const parsedLimit = parseInt(limit as string)
    const parsedOffset = page
      ? (parseInt(page as string) - 1) * parsedLimit
      : parseInt(offset as string)

    const where: any = {}

    if (search) {
      const q = (search as string).trim()
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { skills: { hasSome: [q] } },
      ]
    }

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

    if (tier) {
      where.tier = tier as string
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
      take: parsedLimit,
      skip: parsedOffset,
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
      limit: parsedLimit,
      offset: parsedOffset,
    })
  } catch (error) {
    console.error('Error fetching candidates:', error)
    res.status(500).json({ error: 'Failed to fetch candidates' })
  }
})

/**
 * GET /api/v1/candidates/profile
 * Get current candidate's own profile (shorthand, no /me/ prefix)
 */
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
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
 * GET /api/v1/candidates/job-matches
 * Get AI-powered job recommendations (shorthand, no /me/ prefix)
 */
router.get('/job-matches', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    const matchScores: Record<string, number> = {}
    jobs.forEach(job => {
      const skillMatch = job.skillsRequired.filter(s => candidate.skills.includes(s)).length
      const totalRequired = job.skillsRequired.length || 1
      matchScores[job.id] = Math.round((skillMatch / totalRequired) * 100)
    })

    const sortedJobs = jobs.sort((a, b) => matchScores[b.id] - matchScores[a.id])

    res.json({ jobs: sortedJobs, matchScores })
  } catch (error) {
    console.error('Error fetching job matches:', error)
    res.status(500).json({ error: 'Failed to fetch job matches' })
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
 * POST /api/v1/me/pan-card
 * Upload PAN card document
 */
router.post('/me/pan-card', authenticateToken, upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can upload documents' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const panCardUrl = `/uploads/documents/${req.file.filename}`

    const candidate = await prisma.candidate.update({
      where: { userId: req.user.userId },
      data: { panCardUrl }
    })

    res.json({
      message: 'PAN card uploaded successfully',
      panCardUrl,
      candidateId: candidate.id
    })
  } catch (error) {
    console.error('Error uploading PAN card:', error)
    res.status(500).json({ error: 'Failed to upload PAN card' })
  }
})

/**
 * POST /api/v1/me/aadhaar-front
 * Upload Aadhaar card front
 */
router.post('/me/aadhaar-front', authenticateToken, upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can upload documents' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const aadhaarFrontUrl = `/uploads/documents/${req.file.filename}`

    const candidate = await prisma.candidate.update({
      where: { userId: req.user.userId },
      data: { aadhaarFrontUrl }
    })

    res.json({
      message: 'Aadhaar front uploaded successfully',
      aadhaarFrontUrl,
      candidateId: candidate.id
    })
  } catch (error) {
    console.error('Error uploading Aadhaar front:', error)
    res.status(500).json({ error: 'Failed to upload Aadhaar front' })
  }
})

/**
 * POST /api/v1/me/aadhaar-back
 * Upload Aadhaar card back
 */
router.post('/me/aadhaar-back', authenticateToken, upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can upload documents' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const aadhaarBackUrl = `/uploads/documents/${req.file.filename}`

    const candidate = await prisma.candidate.update({
      where: { userId: req.user.userId },
      data: { aadhaarBackUrl }
    })

    res.json({
      message: 'Aadhaar back uploaded successfully',
      aadhaarBackUrl,
      candidateId: candidate.id
    })
  } catch (error) {
    console.error('Error uploading Aadhaar back:', error)
    res.status(500).json({ error: 'Failed to upload Aadhaar back' })
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

/**
 * POST /api/v1/candidates/invite
 * Admin invites a candidate to the platform
 */
router.post('/invite', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
    })

    const { firstName, lastName, email, phone } = schema.parse(req.body)

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' })
    }

    // Create user + candidate profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
      const bcrypt = await import('bcryptjs')
      const passwordHash = await bcrypt.default.hash(tempPassword, 10)

      const user = await tx.user.create({
        data: {
          email,
          phone: phone || null,
          passwordHash,
          userType: 'candidate',
          status: 'active',
        }
      })

      const candidate = await tx.candidate.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
        }
      })

      return { user, candidate }
    })

    // Send invite email (non-blocking)
    const { emailService } = await import('../services/email.service.js')
    emailService.sendWelcome(email, { userName: firstName, userType: 'candidate' }).catch(console.error)

    res.status(201).json({
      message: 'Candidate invited successfully',
      candidate: {
        id: result.candidate.id,
        firstName,
        lastName,
        email,
      }
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    console.error('Error inviting candidate:', error)
    res.status(500).json({ error: 'Failed to invite candidate' })
  }
})

export default router
