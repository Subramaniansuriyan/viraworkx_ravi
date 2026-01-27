import { Router, Response } from 'express'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/v1/notifications
 * Get user's notifications
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { unreadOnly, limit = '50', offset = '0' } = req.query

    const where: any = { userId: req.user!.userId }
    if (unreadOnly === 'true') {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.userId, read: false }
    })

    const total = await prisma.notification.count({ where })

    res.json({ notifications, unreadCount, total })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

/**
 * PUT /api/v1/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    })

    if (!notification || notification.userId !== req.user!.userId) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: {
        read: true,
        readAt: new Date()
      }
    })

    res.json({ notification: updated })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Failed to update notification' })
  }
})

/**
 * PUT /api/v1/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ error: 'Failed to update notifications' })
  }
})

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    })

    if (!notification || notification.userId !== req.user!.userId) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    await prisma.notification.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

// Helper function to create notifications (used by other services)
export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message?: string
  data?: any
  channel?: 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push'
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
      channel: params.channel || 'in_app',
    }
  })
}

export default router
