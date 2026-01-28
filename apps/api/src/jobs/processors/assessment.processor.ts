import { Job } from 'bullmq'
import prisma from '../../config/database.js'
import { imochaService } from '../../services/imocha.service.js'
import { socketService } from '../../services/socket.service.js'
import { AssessmentJobData } from '../queues.js'
import { addEmailJob } from '../index.js'

/**
 * Process assessment jobs
 */
export async function processAssessmentJob(job: Job<AssessmentJobData>): Promise<void> {
  const { type, assessmentId, candidateId, testId, data } = job.data

  console.log(`Processing assessment job: ${job.id}, type: ${type}`)

  switch (type) {
    case 'send_invite':
      await handleSendInvite(candidateId!, testId!, data)
      break

    case 'process_results':
      await handleProcessResults(assessmentId!)
      break

    case 'send_reminder':
      await handleSendReminder(assessmentId!)
      break

    case 'check_expired':
      await handleCheckExpired()
      break

    default:
      console.warn(`Unknown assessment job type: ${type}`)
  }

  console.log(`Assessment job completed: ${job.id}`)
}

/**
 * Send assessment invitation
 */
async function handleSendInvite(
  candidateId: string,
  testId: string,
  data?: Record<string, any>
): Promise<void> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { user: { select: { email: true } } }
  })

  if (!candidate) {
    throw new Error(`Candidate not found: ${candidateId}`)
  }

  const result = await imochaService.inviteCandidate({
    testId,
    candidateId,
    candidateEmail: candidate.user.email,
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    applicationId: data?.applicationId,
  })

  // Send email notification
  await addEmailJob({
    type: 'assessment_invite',
    to: candidate.user.email,
    data: {
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: data?.jobTitle || 'Position',
      companyName: data?.companyName || 'Company',
      testName: result.assessment.testName,
      testUrl: result.invitation.testUrl,
      expiresAt: result.invitation.expiresAt,
    }
  })

  // Send real-time notification
  socketService.notifyAssessmentInvited(
    result.assessment.id,
    data?.applicationId || '',
    testId,
    candidate.userId
  )
}

/**
 * Process assessment results (for delayed/manual processing)
 */
async function handleProcessResults(assessmentId: string): Promise<void> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      candidate: true,
      application: { include: { job: true } }
    }
  })

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`)
  }

  if (assessment.status === 'completed') {
    console.log(`Assessment already completed: ${assessmentId}`)
    return
  }

  // Try to fetch results from iMocha
  if (assessment.imochaAttemptId) {
    try {
      const results = await imochaService.getResults(assessment.imochaAttemptId)

      // Update assessment with results
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          score: results.score,
          maxScore: results.maxScore,
          percentile: results.percentile,
          reportUrl: results.reportUrl,
          status: 'completed',
          completedAt: new Date(results.completedAt),
        }
      })

      // Send notification
      if (assessment.application?.jobId) {
        socketService.notifyAssessmentCompleted(
          assessmentId,
          assessment.candidateId,
          results.score,
          results.maxScore,
          assessment.application.jobId
        )
      }
    } catch (error) {
      console.error(`Failed to fetch results for assessment: ${assessmentId}`, error)
    }
  }
}

/**
 * Send reminder for pending assessments
 */
async function handleSendReminder(assessmentId: string): Promise<void> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      candidate: { include: { user: { select: { email: true } } } },
      application: { include: { job: { include: { client: true } } } }
    }
  })

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`)
  }

  // Only send reminder if still pending or invited
  if (!['pending', 'invited'].includes(assessment.status)) {
    console.log(`Assessment not in pending state: ${assessmentId}`)
    return
  }

  const candidate = assessment.candidate
  const job = assessment.application?.job

  // Send reminder email
  await addEmailJob({
    type: 'assessment_invite', // Reuse same template as reminder
    to: candidate.user.email,
    data: {
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: job?.title || 'Position',
      companyName: job?.client?.companyName || 'Company',
      testName: assessment.testName,
      testUrl: `https://assessment.imocha.io/test/${assessment.imochaInvitationId}`,
      expiresAt: assessment.expiresAt?.toISOString(),
      isReminder: true,
    }
  })
}

/**
 * Check and mark expired assessments
 */
async function handleCheckExpired(): Promise<void> {
  const now = new Date()

  // Find all expired but not yet marked assessments
  const expiredAssessments = await prisma.assessment.findMany({
    where: {
      status: { in: ['pending', 'invited'] },
      expiresAt: { lt: now }
    },
    include: {
      application: true
    }
  })

  console.log(`Found ${expiredAssessments.length} expired assessments`)

  for (const assessment of expiredAssessments) {
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: 'expired' }
    })

    // Update application stage if needed
    if (assessment.applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: assessment.applicationId }
      })

      if (application?.stage === 'assessment') {
        // Keep at assessment stage but could notify
        console.log(`Assessment expired for application: ${assessment.applicationId}`)
      }
    }
  }
}
