import { Job } from 'bullmq'
import prisma from '../../config/database.js'

export interface PaymentJobData {
  type: 'payment_reminder' | 'contract_expiring'
  data?: Record<string, any>
}

export async function processPaymentJob(job: Job<PaymentJobData>): Promise<void> {
  const { type } = job.data

  switch (type) {
    case 'payment_reminder':
      await handlePaymentReminder()
      break
    case 'contract_expiring':
      await handleContractExpiring()
      break
    default:
      console.log(`[Payment] Unknown job type: ${type}`)
  }
}

async function handlePaymentReminder(): Promise<void> {
  // Find clients with past_due subscriptions
  const pastDueSubscriptions = await prisma.subscription.findMany({
    where: { status: 'past_due' },
    include: {
      client: {
        include: {
          clientUsers: {
            where: { role: 'owner' },
            include: { user: { select: { id: true, email: true } } },
            take: 1,
          },
        },
      },
    },
  })

  for (const sub of pastDueSubscriptions) {
    const ownerUserId = sub.client.clientUsers[0]?.userId
    if (!ownerUserId) continue

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: ownerUserId,
        type: 'payment_reminder',
        title: 'Payment Past Due',
        message: `Your subscription payment is past due. Please update your payment method to avoid service interruption.`,
        data: { subscriptionId: sub.id, planTier: sub.planTier },
        channel: 'in_app',
      },
    })

    console.log(`[Payment] Sent payment reminder to client ${sub.clientId}`)
  }
}

async function handleContractExpiring(): Promise<void> {
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const expiringContracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      expiresAt: {
        lte: sevenDaysFromNow,
        gt: new Date(),
      },
    },
    include: {
      signatures: {
        include: { user: { select: { id: true } } },
      },
    },
  })

  for (const contract of expiringContracts) {
    for (const sig of contract.signatures) {
      await prisma.notification.create({
        data: {
          userId: sig.userId,
          type: 'contract_expiring',
          title: 'Contract Expiring Soon',
          message: `Contract "${contract.title}" expires on ${contract.expiresAt?.toLocaleDateString()}.`,
          data: { contractId: contract.id },
          channel: 'in_app',
        },
      })
    }

    console.log(`[Payment] Sent contract expiry notification for ${contract.id}`)
  }
}
