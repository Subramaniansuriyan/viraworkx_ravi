import { Queue, QueueEvents } from 'bullmq'
import { redisConnection } from '../config/redis.js'

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email',
  ASSESSMENT: 'assessment',
  AI_SCREENING: 'ai-screening',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  RESUME_PARSING: 'resume-parsing',
  PAYMENT: 'payment',
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]

// Queue instances
const queues: Map<QueueName, Queue> = new Map()
const queueEvents: Map<QueueName, QueueEvents> = new Map()

// Default job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60, // 7 days
  },
}

/**
 * Get or create a queue by name
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, {
      connection: redisConnection,
      defaultJobOptions,
    })
    queues.set(name, queue)
  }
  return queues.get(name)!
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(name: QueueName): QueueEvents {
  if (!queueEvents.has(name)) {
    const events = new QueueEvents(name, {
      connection: redisConnection,
    })
    queueEvents.set(name, events)
  }
  return queueEvents.get(name)!
}

/**
 * Close all queues gracefully
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises: Promise<void>[] = []

  for (const queue of queues.values()) {
    closePromises.push(queue.close())
  }

  for (const events of queueEvents.values()) {
    closePromises.push(events.close())
  }

  await Promise.all(closePromises)
  queues.clear()
  queueEvents.clear()
}

// Job type definitions
export interface EmailJobData {
  type: 'welcome' | 'application_status' | 'interview_scheduled' | 'interview_reminder' | 'assessment_invite' | 'offer_extended' | 'password_reset'
  to: string
  subject?: string
  data: Record<string, any>
}

export interface AssessmentJobData {
  type: 'send_invite' | 'process_results' | 'send_reminder' | 'check_expired'
  assessmentId?: string
  candidateId?: string
  testId?: string
  data?: Record<string, any>
}

export interface AIScreeningJobData {
  applicationId: string
  jobId: string
  candidateId: string
  resumeContent?: string
}

export interface NotificationJobData {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  channels?: ('in_app' | 'email' | 'push')[]
}

export interface AnalyticsJobData {
  type: 'update_metrics' | 'generate_report' | 'sync_data'
  clientId?: string
  dateRange?: { start: string; end: string }
  data?: Record<string, any>
}

export interface ResumeParsingJobData {
  candidateId: string
  resumeUrl: string
  applicationId?: string
}

export interface PaymentJobData {
  type: 'payment_reminder' | 'contract_expiring'
  data?: Record<string, any>
}
