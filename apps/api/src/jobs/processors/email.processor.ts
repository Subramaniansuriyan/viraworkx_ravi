import { Job } from 'bullmq'
import { emailService } from '../../services/email.service.js'
import { EmailJobData } from '../queues.js'

/**
 * Process email jobs
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { type, to, data } = job.data

  console.log(`Processing email job: ${job.id}, type: ${type}, to: ${to}`)

  switch (type) {
    case 'welcome':
      await emailService.sendWelcome(to, {
        userName: data.candidateName || data.userName,
        userType: data.userType || 'candidate',
      })
      break

    case 'application_status':
      await emailService.sendApplicationStatusUpdate(to, {
        candidateName: data.candidateName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        status: data.status,
        message: data.message,
      })
      break

    case 'interview_scheduled':
      await emailService.sendInterviewScheduled(to, {
        candidateName: data.candidateName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        interviewType: data.interviewType,
        scheduledAt: data.scheduledAt || data.interviewDate,
        timezone: data.timezone || 'UTC',
        meetingUrl: data.meetingUrl || data.meetingLink,
        interviewerName: data.interviewerName,
      })
      break

    case 'interview_reminder':
      // Use interview scheduled template for reminders too
      await emailService.sendInterviewScheduled(to, {
        candidateName: data.candidateName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        interviewType: data.interviewType,
        scheduledAt: data.scheduledAt || data.interviewDate,
        timezone: data.timezone || 'UTC',
        meetingUrl: data.meetingUrl || data.meetingLink,
        interviewerName: data.interviewerName,
      })
      break

    case 'assessment_invite':
      await emailService.sendAssessmentInvite(to, {
        candidateName: data.candidateName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        testName: data.testName,
        testUrl: data.testUrl,
        expiresAt: data.expiresAt,
      })
      break

    case 'offer_extended':
      await emailService.sendOfferExtended(to, {
        candidateName: data.candidateName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
      })
      break

    case 'password_reset':
      if (data.resetUrl) {
        await emailService.sendPasswordReset(to, {
          userName: data.candidateName || data.userName,
          resetUrl: data.resetUrl,
          expiresIn: data.expiresIn || '1 hour',
        })
      }
      break

    default:
      console.warn(`Unknown email job type: ${type}`)
  }

  console.log(`Email job completed: ${job.id}`)
}
