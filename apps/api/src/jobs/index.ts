import { Worker, Job } from 'bullmq'
import { redisConnection } from '../config/redis.js'
import {
  getQueue,
  QUEUE_NAMES,
  EmailJobData,
  AssessmentJobData,
  AIScreeningJobData,
  NotificationJobData,
  AnalyticsJobData,
  ResumeParsingJobData,
  PaymentJobData,
} from './queues.js'
import { processEmailJob } from './processors/email.processor.js'
import { processAssessmentJob } from './processors/assessment.processor.js'
import { processAIScreeningJob } from './processors/ai-screening.processor.js'
import { processNotificationJob } from './processors/notification.processor.js'
import { processPaymentJob } from './processors/payment.processor.js'

// Store workers for cleanup
const workers: Worker[] = []

/**
 * Initialize all job workers
 */
export function initializeWorkers(): void {
  console.log('Initializing job workers...')

  // Email worker
  const emailWorker = new Worker(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => processEmailJob(job),
    {
      connection: redisConnection,
      concurrency: 5,
    }
  )
  setupWorkerEvents(emailWorker, 'Email')
  workers.push(emailWorker)

  // Assessment worker
  const assessmentWorker = new Worker(
    QUEUE_NAMES.ASSESSMENT,
    async (job: Job<AssessmentJobData>) => processAssessmentJob(job),
    {
      connection: redisConnection,
      concurrency: 3,
    }
  )
  setupWorkerEvents(assessmentWorker, 'Assessment')
  workers.push(assessmentWorker)

  // AI Screening worker
  const aiScreeningWorker = new Worker(
    QUEUE_NAMES.AI_SCREENING,
    async (job: Job<AIScreeningJobData>) => processAIScreeningJob(job),
    {
      connection: redisConnection,
      concurrency: 2, // Lower concurrency for AI tasks
      limiter: {
        max: 10,
        duration: 60000, // Rate limit: 10 per minute
      },
    }
  )
  setupWorkerEvents(aiScreeningWorker, 'AI Screening')
  workers.push(aiScreeningWorker)

  // Notification worker
  const notificationWorker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job<NotificationJobData>) => processNotificationJob(job),
    {
      connection: redisConnection,
      concurrency: 10,
    }
  )
  setupWorkerEvents(notificationWorker, 'Notification')
  workers.push(notificationWorker)

  // Payment worker
  const paymentWorker = new Worker(
    QUEUE_NAMES.PAYMENT,
    async (job: Job<PaymentJobData>) => processPaymentJob(job),
    {
      connection: redisConnection,
      concurrency: 2,
    }
  )
  setupWorkerEvents(paymentWorker, 'Payment')
  workers.push(paymentWorker)

  console.log(`Initialized ${workers.length} job workers`)
}

/**
 * Setup worker event handlers
 */
function setupWorkerEvents(worker: Worker, name: string): void {
  worker.on('completed', (job) => {
    console.log(`[${name}] Job completed: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[${name}] Job failed: ${job?.id}`, err.message)
  })

  worker.on('error', (err) => {
    console.error(`[${name}] Worker error:`, err)
  })
}

/**
 * Close all workers gracefully
 */
export async function closeWorkers(): Promise<void> {
  console.log('Closing job workers...')
  await Promise.all(workers.map(w => w.close()))
  workers.length = 0
}

// ============ Job Adding Functions ============

/**
 * Add email job to queue
 */
export async function addEmailJob(
  data: EmailJobData,
  options?: { delay?: number; priority?: number }
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.EMAIL)
  const job = await queue.add('send-email', data, {
    delay: options?.delay,
    priority: options?.priority,
  })
  return job.id!
}

/**
 * Add assessment job to queue
 */
export async function addAssessmentJob(
  data: AssessmentJobData,
  options?: { delay?: number }
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.ASSESSMENT)
  const job = await queue.add(data.type, data, {
    delay: options?.delay,
  })
  return job.id!
}

/**
 * Add AI screening job to queue
 */
export async function addAIScreeningJob(data: AIScreeningJobData): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.AI_SCREENING)
  const job = await queue.add('screen-candidate', data)
  return job.id!
}

/**
 * Add payment job to queue
 */
export async function addPaymentJob(
  data: PaymentJobData,
  options?: { delay?: number }
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.PAYMENT)
  const job = await queue.add(data.type, data, {
    delay: options?.delay,
  })
  return job.id!
}

/**
 * Add notification job to queue
 */
export async function addNotificationJob(
  data: NotificationJobData,
  options?: { delay?: number }
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.NOTIFICATIONS)
  const job = await queue.add('send-notification', data, {
    delay: options?.delay,
  })
  return job.id!
}

/**
 * Schedule recurring jobs (cron-like)
 */
export async function scheduleRecurringJobs(): Promise<void> {
  const assessmentQueue = getQueue(QUEUE_NAMES.ASSESSMENT)

  // Check for expired assessments every hour
  await assessmentQueue.add(
    'check-expired',
    { type: 'check_expired' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
      jobId: 'recurring-check-expired',
    }
  )

  // Daily payment reminder check (9am UTC)
  const paymentQueue = getQueue(QUEUE_NAMES.PAYMENT)
  await paymentQueue.add(
    'payment-reminder',
    { type: 'payment_reminder' },
    {
      repeat: {
        pattern: '0 9 * * *', // Daily at 9am UTC
      },
      jobId: 'recurring-payment-reminder',
    }
  )

  // Weekly contract expiry check (Monday 9am UTC)
  await paymentQueue.add(
    'contract-expiring',
    { type: 'contract_expiring' },
    {
      repeat: {
        pattern: '0 9 * * 1', // Every Monday at 9am UTC
      },
      jobId: 'recurring-contract-expiring',
    }
  )

  console.log('Scheduled recurring jobs')
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {}

  for (const queueName of Object.values(QUEUE_NAMES)) {
    const queue = getQueue(queueName)
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])

    stats[queueName] = { waiting, active, completed, failed }
  }

  return stats
}
