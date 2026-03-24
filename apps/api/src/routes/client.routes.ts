import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

// Validation schemas
const updateClientSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  companyWebsite: z.string().url().optional().nullable(),
  companyLogoUrl: z.string().url().optional().nullable(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  headquartersLocation: z.string().optional(),
  description: z.string().optional(),
})

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'hiring_manager', 'recruiter', 'member']).default('member'),
})

/**
 * GET /api/v1/clients/me
 * Get current client's profile (resolved from token)
 */
router.get('/me', authenticateToken, requireRole('client'), async (req: AuthRequest, res: Response) => {
  try {
    const clientUser = await prisma.clientUser.findFirst({
      where: { userId: req.user!.userId },
      include: {
        client: {
          include: {
            _count: { select: { jobs: true, clientUsers: true } }
          }
        }
      }
    })
    if (!clientUser) return res.status(404).json({ error: 'No client associated with this account' })
    res.json({ client: clientUser.client })
  } catch (error) {
    console.error('Error fetching client profile:', error)
    res.status(500).json({ error: 'Failed to fetch client profile' })
  }
})

/**
 * GET /api/v1/clients/:id
 * Get client profile
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            jobs: true,
            clientUsers: true
          }
        }
      }
    })

    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    // Check access (admins and client users can see full details)
    const clientUser = await prisma.clientUser.findFirst({
      where: {
        clientId: client.id,
        userId: req.user!.userId
      }
    })

    const isAdmin = req.user?.userType === 'admin'
    const isMember = !!clientUser

    // Only admins and client members can access client profile
    if (!isAdmin && !isMember) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json({ client })
  } catch (error) {
    console.error('Error fetching client:', error)
    res.status(500).json({ error: 'Failed to fetch client' })
  }
})

/**
 * PUT /api/v1/clients/:id
 * Update client profile
 */
router.put('/:id', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = updateClientSchema.parse(req.body)

    // Check if user has admin access to this client
    const clientUser = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: req.user!.userId,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!clientUser && req.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to update this client' })
    }

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...input,
        updatedAt: new Date()
      }
    })

    res.json({ client })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error updating client:', error)
    res.status(500).json({ error: 'Failed to update client' })
  }
})

/**
 * GET /api/v1/clients/:id/users
 * Get client team members
 */
router.get('/:id/users', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Check access
    const clientUser = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: req.user!.userId
      }
    })

    if (!clientUser && req.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const users = await prisma.clientUser.findMany({
      where: { clientId: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json({
      users: users.map(cu => ({
        id: cu.id,
        userId: cu.user.id,
        email: cu.user.email,
        role: cu.role,
        permissions: cu.permissions,
        joinedAt: cu.createdAt
      }))
    })
  } catch (error) {
    console.error('Error fetching client users:', error)
    res.status(500).json({ error: 'Failed to fetch team members' })
  }
})

/**
 * POST /api/v1/clients/:id/users
 * Invite a user to the client team
 */
router.post('/:id/users', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = inviteUserSchema.parse(req.body)

    // Check if requester has admin access
    const requesterAccess = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: req.user!.userId,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!requesterAccess && req.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite users' })
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: input.email }
    })

    if (!user) {
      // Create pending user
      user = await prisma.user.create({
        data: {
          email: input.email,
          userType: 'client',
          passwordHash: '', // Will be set when they accept invite
        }
      })
    }

    // Check if already a member
    const existing = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: user.id
      }
    })

    if (existing) {
      return res.status(409).json({ error: 'User is already a team member' })
    }

    const clientUser = await prisma.clientUser.create({
      data: {
        clientId: req.params.id,
        userId: user.id,
        role: input.role,
      },
      include: {
        user: { select: { email: true } }
      }
    })

    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: clientUser.id,
        email: clientUser.user.email,
        role: clientUser.role
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error inviting user:', error)
    res.status(500).json({ error: 'Failed to invite user' })
  }
})

/**
 * PUT /api/v1/clients/:id/users/:userId
 * Update a team member's role
 */
router.put('/:id/users/:userId', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, permissions } = req.body

    // Check if requester has admin access
    const requesterAccess = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: req.user!.userId,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!requesterAccess && req.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update team members' })
    }

    // Cannot change owner role
    const targetUser = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: req.params.userId
      }
    })

    if (targetUser?.role === 'owner' && role !== 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' })
    }

    const updated = await prisma.clientUser.updateMany({
      where: {
        clientId: req.params.id,
        userId: req.params.userId
      },
      data: {
        role,
        permissions
      }
    })

    if (updated.count === 0) {
      return res.status(404).json({ error: 'User not found in team' })
    }

    res.json({ message: 'User updated successfully' })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

/**
 * DELETE /api/v1/clients/:id/users/:userId
 * Remove a user from the client team
 */
router.delete('/:id/users/:userId', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Check if requester has admin access
    const requesterAccess = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: req.user!.userId,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!requesterAccess && req.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove team members' })
    }

    // Cannot remove owner
    const targetUser = await prisma.clientUser.findFirst({
      where: {
        clientId: req.params.id,
        userId: req.params.userId
      }
    })

    if (targetUser?.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the owner' })
    }

    const deleted = await prisma.clientUser.deleteMany({
      where: {
        clientId: req.params.id,
        userId: req.params.userId
      }
    })

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'User not found in team' })
    }

    res.json({ message: 'User removed successfully' })
  } catch (error) {
    console.error('Error removing user:', error)
    res.status(500).json({ error: 'Failed to remove user' })
  }
})

/**
 * GET /api/v1/clients/:id/detail
 * Get full client detail for admin
 */
router.get('/:id/detail', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.params.id

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        clientUsers: {
          include: {
            user: { select: { id: true, email: true, userType: true, createdAt: true } }
          }
        },
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            postedAt: true,
            _count: { select: { applications: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        contracts: {
          select: { id: true, title: true, status: true, createdAt: true },
          take: 10
        }
      }
    })

    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    const totalApplications = await prisma.application.count({
      where: { job: { clientId } }
    })

    res.json({ client, totalApplications })
  } catch (error) {
    console.error('Error fetching client detail:', error)
    res.status(500).json({ error: 'Failed to fetch client detail' })
  }
})

/**
 * POST /api/v1/clients/:id/verify
 * Verify or unverify a client company (admin only)
 */
router.post('/:id/verify', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { verified, notes } = req.body

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        verified: verified !== false,
        verifiedAt: verified !== false ? new Date() : null,
        verificationNotes: notes || null,
        updatedAt: new Date()
      }
    })

    res.json({ client })
  } catch (error) {
    console.error('Error verifying client:', error)
    res.status(500).json({ error: 'Failed to verify client' })
  }
})

/**
 * GET /api/v1/clients/me/dashboard
 * Get current client's dashboard (no clientId needed — resolved from token)
 */
router.get('/me/dashboard', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    let clientId: string

    if (req.user?.userType === 'admin') {
      return res.status(400).json({ error: 'Admins must use /clients/:id/dashboard' })
    }

    const clientUser = await prisma.clientUser.findFirst({ where: { userId: req.user!.userId } })
    if (!clientUser) return res.status(404).json({ error: 'No client associated with this account' })
    clientId = clientUser.clientId

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)

    const [activeJobs, totalApplications, interviewsToday, hiredApps, recentApplications, recentAiActions] = await Promise.all([
      prisma.job.count({ where: { clientId, status: 'active' } }),
      prisma.application.count({ where: { job: { clientId } } }),
      prisma.interview.count({
        where: {
          application: { job: { clientId } },
          scheduledAt: { gte: todayStart, lt: todayEnd },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),
      prisma.application.findMany({
        where: { job: { clientId }, stage: 'hired' },
        select: { appliedAt: true, stageUpdatedAt: true },
        take: 100
      }),
      prisma.application.findMany({
        where: { job: { clientId } },
        include: {
          candidate: { select: { firstName: true, lastName: true, headline: true, skills: true } },
          job: { select: { title: true } }
        },
        orderBy: { appliedAt: 'desc' },
        take: 5
      }),
      prisma.aiAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ])

    // Count unique candidates
    const uniqueCandidates = await prisma.application.groupBy({
      by: ['candidateId'],
      where: { job: { clientId } }
    })

    // Avg time to hire
    let avgTimeToHire = 0
    if (hiredApps.length > 0) {
      const days = hiredApps.map(a => {
        const diff = new Date(a.stageUpdatedAt || a.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
      })
      avgTimeToHire = Math.round(days.reduce((a, b) => a + b, 0) / days.length)
    }

    res.json({
      stats: {
        activeJobs,
        totalApplications,
        totalCandidates: uniqueCandidates.length,
        interviewsToday,
        avgTimeToHire
      },
      recentApplications,
      recentAiActions
    })
  } catch (error) {
    console.error('Error fetching client dashboard:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

/**
 * GET /api/v1/clients/:id/dashboard
 * Get client dashboard data
 */
router.get('/:id/dashboard', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.params.id

    // Get job stats
    const jobStats = await prisma.job.groupBy({
      by: ['status'],
      where: { clientId },
      _count: { status: true }
    })

    // Get active jobs
    const activeJobs = await prisma.job.count({
      where: { clientId, status: 'active' }
    })

    // Get total applications
    const totalApplications = await prisma.application.count({
      where: { job: { clientId } }
    })

    // Get applications by stage
    const applicationsByStage = await prisma.application.groupBy({
      by: ['stage'],
      where: { job: { clientId } },
      _count: { stage: true }
    })

    // Get recent applications
    const recentApplications = await prisma.application.findMany({
      where: { job: { clientId } },
      include: {
        candidate: {
          include: { user: { select: { email: true } } }
        },
        job: { select: { title: true } }
      },
      orderBy: { appliedAt: 'desc' },
      take: 10
    })

    // Get upcoming interviews
    const upcomingInterviews = await prisma.interview.findMany({
      where: {
        application: { job: { clientId } },
        scheduledAt: { gte: new Date() },
        status: { in: ['scheduled', 'confirmed'] }
      },
      include: {
        application: {
          include: {
            candidate: { include: { user: { select: { email: true } } } },
            job: { select: { title: true } }
          }
        }
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10
    })

    res.json({
      stats: {
        activeJobs,
        totalApplications,
        jobsByStatus: jobStats.reduce((acc, s) => {
          acc[s.status] = s._count.status
          return acc
        }, {} as Record<string, number>),
        applicationsByStage: applicationsByStage.reduce((acc, s) => {
          acc[s.stage] = s._count.stage
          return acc
        }, {} as Record<string, number>)
      },
      recentApplications,
      upcomingInterviews
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

/**
 * GET /api/v1/me/client
 * Get current user's client
 */
router.get('/me/client', authenticateToken, requireRole('client'), async (req: AuthRequest, res: Response) => {
  try {
    const clientUser = await prisma.clientUser.findFirst({
      where: { userId: req.user!.userId },
      include: {
        client: {
          include: {
            _count: {
              select: { jobs: true, clientUsers: true }
            }
          }
        }
      }
    })

    if (!clientUser) {
      return res.status(404).json({ error: 'No client associated with this account' })
    }

    res.json({
      client: clientUser.client,
      role: clientUser.role,
      permissions: clientUser.permissions
    })
  } catch (error) {
    console.error('Error fetching client:', error)
    res.status(500).json({ error: 'Failed to fetch client' })
  }
})

export default router
