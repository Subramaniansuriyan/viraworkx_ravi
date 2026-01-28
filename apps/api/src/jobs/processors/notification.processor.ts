import { Job } from 'bullmq'
import prisma from '../../config/database.js'
import { socketService } from '../../services/socket.service.js'
import { NotificationJobData } from '../queues.js'
import { addEmailJob } from '../index.js'

/**
 * Process notification jobs
 */
export async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { userId, type, title, message, data, channels = ['in_app'] } = job.data

  console.log(`Processing notification job: ${job.id}, type: ${type}, user: ${userId}`)

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    console.warn(`User not found for notification: ${userId}`)
    return
  }

  // Create in-app notification record
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data as any,
      channel: 'in_app',
      sentAt: new Date(),
    }
  })

  // Send via each requested channel
  for (const channel of channels) {
    switch (channel) {
      case 'in_app':
        // Send real-time notification via Socket.io
        socketService.sendNotification(userId, {
          id: notification.id,
          type,
          title,
          message,
        })
        break

      case 'email':
        // Queue email notification
        await addEmailJob({
          type: 'application_status', // Generic notification email
          to: user.email,
          data: {
            candidateName: user.email.split('@')[0],
            subject: title,
            message,
            ...data,
          }
        })
        break

      case 'push':
        // Push notification would go here
        // This would integrate with FCM, APNS, etc.
        console.log(`Push notification not implemented: ${title}`)
        break
    }
  }

  console.log(`Notification job completed: ${job.id}`)
}

/**
 * Batch notification helper - send same notification to multiple users
 */
export async function sendBatchNotifications(
  userIds: string[],
  notification: Omit<NotificationJobData, 'userId'>
): Promise<void> {
  const { addNotificationJob } = await import('../index.js')

  for (const userId of userIds) {
    await addNotificationJob({
      userId,
      ...notification,
    })
  }
}

/**
 * Send notification to all users with a specific role
 */
export async function notifyUsersByRole(
  role: string,
  notification: Omit<NotificationJobData, 'userId'>
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { userType: role },
    select: { id: true }
  })

  await sendBatchNotifications(
    users.map(u => u.id),
    notification
  )
}
