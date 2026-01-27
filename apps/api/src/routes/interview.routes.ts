import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

// Validation schemas
const createInterviewSchema = z.object({
  applicationId: z.string().uuid(),
  interviewType: z.enum(['ai_screening', 'phone', 'video', 'onsite', 'technical', 'panel', 'final']),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  timezone: z.string().default('UTC'),
  meetingUrl: z.string().url().optional(),
  meetingProvider: z.string().optional(),
  location: z.string().optional(),
  interviewerIds: z.array(z.string().uuid()).optional(),
})

const updateInterviewSchema = createInterviewSchema.partial().extend({
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).optional(),
})

const feedbackSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  recommendation: z.enum(['strong_hire', 'hire', 'no_hire', 'strong_no_hire', 'undecided']),
  strengths: z.string().optional(),
  concerns: z.string().optional(),
  notes: z.string().optional(),
  scorecard: z.record(z.number()).optional(),
})

/**
 * GET /api/v1/interviews
 * List interviews
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, status, startDate, endDate, limit = '50', offset = '0' } = req.query

    const where: any = {}

    if (applicationId) where.applicationId = applicationId
    if (status) where.status = status

    if (startDate || endDate) {
      where.scheduledAt = {}
      if (startDate) where.scheduledAt.gte = new Date(startDate as string)
      if (endDate) where.scheduledAt.lte = new Date(endDate as string)
    }

    // Filter by user role
    if (req.user?.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId }
      })
      if (candidate) {
        where.application = { candidateId: candidate.id }
      }
    }

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        application: {
          include: {
            job: { select: { id: true, title: true, client: { select: { companyName: true } } } },
            candidate: {
              include: { user: { select: { email: true } } }
            }
          }
        },
        participants: {
          include: {
            user: { select: { id: true, email: true } }
          }
        },
        feedback: {
          include: {
            interviewer: { select: { id: true, email: true } }
          }
        }
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { scheduledAt: 'asc' }
    })

    const total = await prisma.interview.count({ where })

    res.json({ interviews, total })
  } catch (error) {
    console.error('Error fetching interviews:', error)
    res.status(500).json({ error: 'Failed to fetch interviews' })
  }
})

/**
 * GET /api/v1/interviews/:id
 * Get interview by ID
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
      include: {
        application: {
          include: {
            job: {
              include: { client: { select: { companyName: true } } }
            },
            candidate: {
              include: {
                user: { select: { email: true } },
                skillBadges: { where: { expiresAt: { gt: new Date() } } }
              }
            }
          }
        },
        participants: {
          include: {
            user: { select: { id: true, email: true } }
          }
        },
        feedback: {
          include: {
            interviewer: { select: { id: true, email: true } }
          }
        }
      }
    })

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' })
    }

    res.json({ interview })
  } catch (error) {
    console.error('Error fetching interview:', error)
    res.status(500).json({ error: 'Failed to fetch interview' })
  }
})

/**
 * POST /api/v1/interviews
 * Create a new interview
 */
router.post('/', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = createInterviewSchema.parse(req.body)

    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: { candidate: true }
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId: input.applicationId,
        interviewType: input.interviewType,
        title: input.title || `${input.interviewType.replace('_', ' ')} Interview`,
        description: input.description,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes,
        timezone: input.timezone,
        meetingUrl: input.meetingUrl,
        meetingProvider: input.meetingProvider,
        location: input.location,
        status: 'scheduled',
      },
      include: {
        application: {
          include: {
            job: { select: { title: true } },
            candidate: { include: { user: { select: { email: true } } } }
          }
        }
      }
    })

    // Add candidate as participant
    await prisma.interviewParticipant.create({
      data: {
        interviewId: interview.id,
        participantType: 'candidate',
        responseStatus: 'pending'
      }
    })

    // Add interviewers as participants
    if (input.interviewerIds) {
      await prisma.interviewParticipant.createMany({
        data: input.interviewerIds.map(userId => ({
          interviewId: interview.id,
          userId,
          participantType: 'interviewer',
          responseStatus: 'pending'
        }))
      })
    }

    // Update application stage
    await prisma.application.update({
      where: { id: input.applicationId },
      data: { stage: 'interview', stageUpdatedAt: new Date() }
    })

    res.status(201).json({ interview })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error creating interview:', error)
    res.status(500).json({ error: 'Failed to create interview' })
  }
})

/**
 * PUT /api/v1/interviews/:id
 * Update an interview
 */
router.put('/:id', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = updateInterviewSchema.parse(req.body)

    const interview = await prisma.interview.update({
      where: { id: req.params.id },
      data: {
        ...input,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        updatedAt: new Date()
      },
      include: {
        application: {
          include: { candidate: { include: { user: { select: { email: true } } } } }
        }
      }
    })

    res.json({ interview })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error updating interview:', error)
    res.status(500).json({ error: 'Failed to update interview' })
  }
})

/**
 * DELETE /api/v1/interviews/:id
 * Delete an interview
 */
router.delete('/:id', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.interview.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Interview deleted successfully' })
  } catch (error) {
    console.error('Error deleting interview:', error)
    res.status(500).json({ error: 'Failed to delete interview' })
  }
})

/**
 * POST /api/v1/interviews/:id/reschedule
 * Reschedule an interview
 */
router.post('/:id/reschedule', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { scheduledAt, reason } = req.body

    if (!scheduledAt) {
      return res.status(400).json({ error: 'New scheduled time is required' })
    }

    const interview = await prisma.interview.update({
      where: { id: req.params.id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'rescheduled',
        description: reason ? `Rescheduled: ${reason}` : undefined,
        updatedAt: new Date()
      }
    })

    res.json({ interview })
  } catch (error) {
    console.error('Error rescheduling interview:', error)
    res.status(500).json({ error: 'Failed to reschedule interview' })
  }
})

/**
 * POST /api/v1/interviews/:id/cancel
 * Cancel an interview
 */
router.post('/:id/cancel', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body

    const interview = await prisma.interview.update({
      where: { id: req.params.id },
      data: {
        status: 'cancelled',
        description: reason ? `Cancelled: ${reason}` : undefined,
        updatedAt: new Date()
      }
    })

    res.json({ interview })
  } catch (error) {
    console.error('Error cancelling interview:', error)
    res.status(500).json({ error: 'Failed to cancel interview' })
  }
})

/**
 * POST /api/v1/interviews/:id/feedback
 * Submit interview feedback
 */
router.post('/:id/feedback', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = feedbackSchema.parse(req.body)

    // Check if feedback already exists from this interviewer
    const existing = await prisma.interviewFeedback.findFirst({
      where: {
        interviewId: req.params.id,
        interviewerId: req.user!.userId
      }
    })

    if (existing) {
      return res.status(409).json({ error: 'Feedback already submitted' })
    }

    const feedback = await prisma.interviewFeedback.create({
      data: {
        interviewId: req.params.id,
        interviewerId: req.user!.userId,
        overallRating: input.overallRating,
        recommendation: input.recommendation,
        strengths: input.strengths,
        concerns: input.concerns,
        notes: input.notes,
        scorecard: input.scorecard,
      }
    })

    // Update interview status to completed if all feedback received
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
      include: {
        participants: { where: { participantType: 'interviewer' } },
        feedback: true
      }
    })

    if (interview && interview.feedback.length >= interview.participants.length) {
      await prisma.interview.update({
        where: { id: req.params.id },
        data: { status: 'completed' }
      })
    }

    res.status(201).json({ feedback })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error submitting feedback:', error)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

/**
 * GET /api/v1/interviews/:id/feedback
 * Get interview feedback
 */
router.get('/:id/feedback', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const feedback = await prisma.interviewFeedback.findMany({
      where: { interviewId: req.params.id },
      include: {
        interviewer: { select: { id: true, email: true } }
      }
    })

    // Calculate average rating
    const avgRating = feedback.length > 0
      ? feedback.reduce((acc, f) => acc + f.overallRating, 0) / feedback.length
      : null

    // Aggregate recommendations
    const recommendations = feedback.reduce((acc, f) => {
      acc[f.recommendation] = (acc[f.recommendation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    res.json({ feedback, avgRating, recommendations })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    res.status(500).json({ error: 'Failed to fetch feedback' })
  }
})

/**
 * POST /api/v1/interviews/:id/confirm
 * Confirm interview attendance (for participants)
 */
router.post('/:id/confirm', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const participant = await prisma.interviewParticipant.findFirst({
      where: {
        interviewId: req.params.id,
        userId: req.user!.userId
      }
    })

    if (!participant) {
      // Check if candidate
      const interview = await prisma.interview.findUnique({
        where: { id: req.params.id },
        include: { application: true }
      })

      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user!.userId }
      })

      if (interview?.application.candidateId === candidate?.id) {
        await prisma.interviewParticipant.updateMany({
          where: {
            interviewId: req.params.id,
            participantType: 'candidate'
          },
          data: { responseStatus: 'accepted' }
        })
      } else {
        return res.status(404).json({ error: 'Participant not found' })
      }
    } else {
      await prisma.interviewParticipant.update({
        where: { id: participant.id },
        data: { responseStatus: 'accepted' }
      })
    }

    // Check if all confirmed
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
      include: { participants: true }
    })

    if (interview && interview.participants.every(p => p.responseStatus === 'accepted')) {
      await prisma.interview.update({
        where: { id: req.params.id },
        data: { status: 'confirmed' }
      })
    }

    res.json({ message: 'Interview confirmed' })
  } catch (error) {
    console.error('Error confirming interview:', error)
    res.status(500).json({ error: 'Failed to confirm interview' })
  }
})

export default router
