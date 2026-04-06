/**
 * Email Service - Resend Integration
 * Handles all email notifications for ViraWorkx
 */
import { Resend } from 'resend'

// Initialize Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@viraworkx.ai'
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'ViraWorkx'
const APP_URL = process.env.APP_URL || 'https://www.viraworkx.ai'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// Email Templates
const templates = {
  // Assessment Invitation
  assessmentInvite: (data: {
    candidateName: string
    jobTitle: string
    companyName: string
    testName: string
    testUrl: string
    expiresAt: string
  }) => ({
    subject: `Assessment Invitation: ${data.jobTitle} at ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.candidateName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Great news! You've been invited to complete a skills assessment for the
            <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0;"><strong>Assessment:</strong> ${data.testName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Expires:</strong> ${data.expiresAt}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.testUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Start Assessment
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Tips for success:
          </p>
          <ul style="color: #6b7280; font-size: 14px;">
            <li>Find a quiet place with stable internet</li>
            <li>Complete the assessment in one sitting</li>
            <li>Don't switch tabs during the test (proctoring enabled)</li>
          </ul>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.candidateName},\n\nYou've been invited to complete a skills assessment for ${data.jobTitle} at ${data.companyName}.\n\nAssessment: ${data.testName}\nExpires: ${data.expiresAt}\n\nStart here: ${data.testUrl}\n\nGood luck!\nViraWorkx Team`
  }),

  // Application Received
  applicationReceived: (data: {
    candidateName: string
    jobTitle: string
    companyName: string
  }) => ({
    subject: `Application Received: ${data.jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.candidateName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for applying to the <strong>${data.jobTitle}</strong> position at
            <strong>${data.companyName}</strong>. We've received your application!
          </p>
          <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #a7f3d0;">
            <p style="color: #065f46; margin: 0;">
              <strong>What's next?</strong><br>
              Our AI-powered screening will review your profile. You may receive an assessment invitation soon.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/applications" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Track Application
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.candidateName},\n\nThank you for applying to ${data.jobTitle} at ${data.companyName}. We've received your application!\n\nOur AI-powered screening will review your profile. You may receive an assessment invitation soon.\n\nTrack your application: ${APP_URL}/applications\n\nBest,\nViraWorkx Team`
  }),

  // Interview Scheduled
  interviewScheduled: (data: {
    candidateName: string
    jobTitle: string
    companyName: string
    interviewType: string
    scheduledAt: string
    timezone: string
    meetingUrl?: string
    interviewerName?: string
  }) => ({
    subject: `Interview Scheduled: ${data.jobTitle} at ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.candidateName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Your interview has been scheduled for the <strong>${data.jobTitle}</strong> position at
            <strong>${data.companyName}</strong>.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${data.interviewType}</p>
            <p style="margin: 0 0 10px 0;"><strong>Date & Time:</strong> ${data.scheduledAt} (${data.timezone})</p>
            ${data.interviewerName ? `<p style="margin: 0 0 10px 0;"><strong>Interviewer:</strong> ${data.interviewerName}</p>` : ''}
            ${data.meetingUrl ? `<p style="margin: 0;"><strong>Meeting Link:</strong> <a href="${data.meetingUrl}">${data.meetingUrl}</a></p>` : ''}
          </div>
          ${data.meetingUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.meetingUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Join Meeting
            </a>
          </div>
          ` : ''}
          <p style="color: #6b7280; font-size: 14px;">
            Preparation tips:
          </p>
          <ul style="color: #6b7280; font-size: 14px;">
            <li>Test your camera and microphone beforehand</li>
            <li>Find a quiet, well-lit space</li>
            <li>Have your resume and portfolio ready</li>
            <li>Prepare questions about the role</li>
          </ul>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.candidateName},\n\nYour interview has been scheduled!\n\nPosition: ${data.jobTitle} at ${data.companyName}\nType: ${data.interviewType}\nDate & Time: ${data.scheduledAt} (${data.timezone})\n${data.meetingUrl ? `Meeting Link: ${data.meetingUrl}` : ''}\n\nGood luck!\nViraWorkx Team`
  }),

  // Application Status Update
  applicationStatusUpdate: (data: {
    candidateName: string
    jobTitle: string
    companyName: string
    status: string
    message?: string
  }) => ({
    subject: `Application Update: ${data.jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.candidateName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            There's an update on your application for <strong>${data.jobTitle}</strong> at
            <strong>${data.companyName}</strong>.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #6366f1;">
              Status: ${data.status}
            </p>
          </div>
          ${data.message ? `<p style="color: #4b5563; line-height: 1.6;">${data.message}</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/applications" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Application
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.candidateName},\n\nThere's an update on your application for ${data.jobTitle} at ${data.companyName}.\n\nStatus: ${data.status}\n${data.message ? `\n${data.message}` : ''}\n\nView details: ${APP_URL}/applications\n\nViraWorkx Team`
  }),

  // Offer Extended
  offerExtended: (data: {
    candidateName: string
    jobTitle: string
    companyName: string
    salary?: string
    startDate?: string
  }) => ({
    subject: `Congratulations! Offer for ${data.jobTitle} at ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Congratulations!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.candidateName},</h2>
          <p style="color: #4b5563; line-height: 1.6; font-size: 18px;">
            We're thrilled to extend you an offer for the <strong>${data.jobTitle}</strong> position at
            <strong>${data.companyName}</strong>!
          </p>
          <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #a7f3d0;">
            ${data.salary ? `<p style="margin: 0 0 10px 0;"><strong>Compensation:</strong> ${data.salary}</p>` : ''}
            ${data.startDate ? `<p style="margin: 0;"><strong>Proposed Start Date:</strong> ${data.startDate}</p>` : ''}
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Please log in to review the full offer details and respond.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/applications" style="background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Review Offer
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.candidateName},\n\nCongratulations! We're thrilled to extend you an offer for ${data.jobTitle} at ${data.companyName}!\n\n${data.salary ? `Compensation: ${data.salary}\n` : ''}${data.startDate ? `Proposed Start Date: ${data.startDate}\n` : ''}\n\nReview offer: ${APP_URL}/applications\n\nViraWorkx Team`
  }),

  // Email Verification
  emailVerification: (data: {
    userName: string
    verifyUrl: string
  }) => ({
    subject: 'Verify your ViraWorkx email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.userName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thanks for signing up! Please verify your email address to activate your account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verifyUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.userName},\n\nPlease verify your email address:\n${data.verifyUrl}\n\nThis link expires in 24 hours.\n\nViraWorkx Team`
  }),

  // Password Reset
  passwordReset: (data: {
    userName: string
    resetUrl: string
    expiresIn: string
  }) => ({
    subject: 'Reset Your ViraWorkx Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.userName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This link will expire in ${data.expiresIn}. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.userName},\n\nWe received a request to reset your password.\n\nReset here: ${data.resetUrl}\n\nThis link expires in ${data.expiresIn}.\n\nIf you didn't request this, ignore this email.\n\nViraWorkx Team`
  }),

  // Contract Ready to Sign
  contractReady: (data: {
    candidateName: string
    contractUrl: string
  }) => ({
    subject: 'Action Required: Your ViraWorkx Agreement is Ready to Sign',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.candidateName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Your ViraWorkx Talent Agreement is ready for your review and signature.
            Please sign it to complete your onboarding and get started.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.contractUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Review &amp; Sign Agreement
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy this link into your browser:<br>
            <a href="${data.contractUrl}" style="color: #6366f1;">${data.contractUrl}</a>
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.candidateName},\n\nYour ViraWorkx Talent Agreement is ready to sign.\n\nReview and sign here: ${data.contractUrl}\n\nViraWorkx Team`
  }),

  // Ops Assessment Notification
  opsAssessmentCompleted: (data: {
    candidateName: string
    candidateEmail: string
    testName: string
    score: number | null
    maxScore: number | null
    tier: string | null
    adminUrl: string
  }) => ({
    subject: `Assessment Completed: ${data.candidateName} — ${data.testName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">ViraWorkx</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Assessment Completed</h2>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0;"><strong>Candidate:</strong> ${data.candidateName} (${data.candidateEmail})</p>
            <p style="margin: 0 0 10px 0;"><strong>Test:</strong> ${data.testName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Score:</strong> ${data.score != null && data.maxScore != null ? `${data.score}/${data.maxScore}` : 'Pending'}</p>
            <p style="margin: 0;"><strong>Tier:</strong> ${data.tier ?? 'Not assigned'}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.adminUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View in Admin Portal
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - Internal Ops Notification</p>
        </div>
      </div>
    `,
    text: `Assessment Completed\n\nCandidate: ${data.candidateName} (${data.candidateEmail})\nTest: ${data.testName}\nScore: ${data.score != null && data.maxScore != null ? `${data.score}/${data.maxScore}` : 'Pending'}\nTier: ${data.tier ?? 'Not assigned'}\n\nView in admin: ${data.adminUrl}\n\nViraWorkx Ops`
  }),

  // Welcome Email
  welcome: (data: {
    userName: string
    userType: 'candidate' | 'client'
  }) => ({
    subject: 'Welcome to ViraWorkx!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to ViraWorkx!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${data.userName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            ${data.userType === 'candidate'
              ? "Welcome to ViraWorkx! We're excited to help you find your dream job with top US startups."
              : "Welcome to ViraWorkx! We're excited to help you find exceptional tech talent from India."
            }
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #1f2937; margin-top: 0;">Get Started:</h3>
            ${data.userType === 'candidate' ? `
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>Complete your profile</li>
              <li>Upload your resume</li>
              <li>Browse job opportunities</li>
              <li>Take skill assessments to earn badges</li>
            </ul>
            ` : `
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>Post your first job</li>
              <li>Let our AI screen candidates</li>
              <li>Review AI-ranked applicants</li>
              <li>Schedule interviews effortlessly</li>
            </ul>
            `}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/dashboard" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>ViraWorkx - AI-Powered Global Recruiting</p>
        </div>
      </div>
    `,
    text: `Hi ${data.userName},\n\nWelcome to ViraWorkx!\n\n${data.userType === 'candidate' ? "We're excited to help you find your dream job with top US startups." : "We're excited to help you find exceptional tech talent from India."}\n\nGet started: ${APP_URL}/dashboard\n\nViraWorkx Team`
  })
}

// Email Service Class
class EmailService {
  private enabled: boolean

  constructor() {
    this.enabled = !!RESEND_API_KEY
    if (!this.enabled) {
      console.warn('Resend API key not configured. Emails will be logged but not sent.')
    }
  }

  /**
   * Send an email
   */
  async send(to: string, template: { subject: string; html: string; text: string }): Promise<boolean> {
    if (!this.enabled) {
      console.log('📧 Email (not sent - no API key):')
      console.log(`   To: ${to}`)
      console.log(`   Subject: ${template.subject}`)
      return true
    }

    try {
      const { error } = await resend!.emails.send({
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })
      if (error) {
        console.error('Failed to send email:', error.message)
        return false
      }
      console.log(`📧 Email sent to ${to}: ${template.subject}`)
      return true
    } catch (error: any) {
      console.error('Failed to send email:', error.message)
      return false
    }
  }

  /**
   * Send assessment invitation email
   */
  async sendAssessmentInvite(to: string, data: Parameters<typeof templates.assessmentInvite>[0]) {
    return this.send(to, templates.assessmentInvite(data))
  }

  /**
   * Send application received confirmation
   */
  async sendApplicationReceived(to: string, data: Parameters<typeof templates.applicationReceived>[0]) {
    return this.send(to, templates.applicationReceived(data))
  }

  /**
   * Send interview scheduled notification
   */
  async sendInterviewScheduled(to: string, data: Parameters<typeof templates.interviewScheduled>[0]) {
    return this.send(to, templates.interviewScheduled(data))
  }

  /**
   * Send application status update
   */
  async sendApplicationStatusUpdate(to: string, data: Parameters<typeof templates.applicationStatusUpdate>[0]) {
    return this.send(to, templates.applicationStatusUpdate(data))
  }

  /**
   * Send offer extended email
   */
  async sendOfferExtended(to: string, data: Parameters<typeof templates.offerExtended>[0]) {
    return this.send(to, templates.offerExtended(data))
  }

  /**
   * Send email verification link
   */
  async sendEmailVerification(to: string, data: Parameters<typeof templates.emailVerification>[0]) {
    return this.send(to, templates.emailVerification(data))
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, data: Parameters<typeof templates.passwordReset>[0]) {
    return this.send(to, templates.passwordReset(data))
  }

  /**
   * Send welcome email
   */
  async sendWelcome(to: string, data: Parameters<typeof templates.welcome>[0]) {
    return this.send(to, templates.welcome(data))
  }

  /**
   * Send contract ready-to-sign email to candidate
   */
  async sendContractReady(to: string, data: Parameters<typeof templates.contractReady>[0]) {
    return this.send(to, templates.contractReady(data))
  }

  /**
   * Notify ops team when an assessment is completed
   */
  async sendOpsAssessmentNotification(data: Parameters<typeof templates.opsAssessmentCompleted>[0]): Promise<void> {
    const opsEmails = (process.env.OPS_NOTIFICATION_EMAILS || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    if (opsEmails.length === 0) {
      console.warn('[EmailService] OPS_NOTIFICATION_EMAILS not configured — skipping ops notification')
      return
    }

    await Promise.all(
      opsEmails.map(email => this.send(email, templates.opsAssessmentCompleted(data)))
    )
  }
}

// Export singleton instance
export const emailService = new EmailService()
export default emailService
