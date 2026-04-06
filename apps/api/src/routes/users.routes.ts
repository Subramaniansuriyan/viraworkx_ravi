import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/v1/users
 * Admin: list all users with optional filters
 */
router.get('/', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, type, status, page = '1', limit = '20' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where: any = {}
    if (type && type !== 'all') where.userType = type
    if (status && status !== 'all') where.status = status
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          userType: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          candidate: {
            select: { firstName: true, lastName: true, profileScore: true }
          },
          clientUsers: {
            select: {
              role: true,
              client: { select: { companyName: true } }
            },
            take: 1
          }
        }
      }),
      prisma.user.count({ where })
    ])

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

/**
 * PATCH /api/v1/users/:userId/status
 * Admin: update user status (active / suspended / deactivated)
 */
router.patch('/:userId/status', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const { status } = z.object({
      status: z.enum(['active', 'suspended', 'deactivated'])
    }).parse(req.body)

    // Prevent admins from suspending themselves
    if (userId === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot change your own account status' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, userType: true, status: true }
    })

    res.json({ user, message: `User status updated to ${status}` })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid status value' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' })
    }
    console.error('Error updating user status:', error)
    res.status(500).json({ error: 'Failed to update user status' })
  }
})

/**
 * PATCH /api/v1/users/:userId/role
 * Admin: promote a user to admin (or change userType)
 */
router.patch('/:userId/role', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const { userType } = z.object({
      userType: z.enum(['admin', 'candidate', 'client'])
    }).parse(req.body)

    if (userId === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { userType },
      select: { id: true, email: true, userType: true, status: true }
    })

    res.json({ user, message: `User role updated to ${userType}` })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid userType value' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' })
    }
    console.error('Error updating user role:', error)
    res.status(500).json({ error: 'Failed to update user role' })
  }
})

export default router
