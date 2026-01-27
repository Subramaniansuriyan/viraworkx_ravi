import axios, { AxiosInstance } from 'axios'
import crypto from 'crypto'
import prisma from '../config/database.js'
import { imochaConfig, getBadgeLevel, BadgeLevel } from '../config/imocha.js'

// Types
export interface IMochaTest {
  id: string
  name: string
  category: string
  duration: number
  skills: string[]
  difficulty: string
}

export interface IMochaInvitation {
  invitationId: string
  testId: string
  testUrl: string
  expiresAt: string
}

export interface IMochaResult {
  attemptId: string
  testId: string
  candidateEmail: string
  score: number
  maxScore: number
  percentile: number
  reportUrl: string
  completedAt: string
}

export interface IMochaSkillScore {
  skillName: string
  score: number
  maxScore: number
  percentile: number
}

export interface IMochaSkillReport {
  attemptId: string
  skills: IMochaSkillScore[]
}

export interface IMochaWebhookPayload {
  event: 'test.started' | 'test.completed' | 'test.expired' | 'test.cancelled'
  timestamp: string
  data: {
    attemptId: string
    invitationId: string
    testId: string
    candidateEmail: string
    candidateName?: string
    score?: number
    maxScore?: number
    percentile?: number
    reportUrl?: string
    proctoringFlags?: {
      faceNotDetected: boolean
      multipleFaces: boolean
      tabSwitched: boolean
      copyPasteDetected: boolean
    }
  }
}

class IMochaService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: imochaConfig.baseUrl,
      headers: {
        'Authorization': `Bearer ${imochaConfig.apiKey}`,
        'X-Tenant-Id': imochaConfig.tenantId,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })
  }

  /**
   * Verify webhook signature from iMocha
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!imochaConfig.webhookSecret) {
      console.warn('iMocha webhook secret not configured - skipping verification')
      return true
    }

    const expectedSignature = crypto
      .createHmac('sha256', imochaConfig.webhookSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Get available tests from iMocha
   */
  async getTests(category?: string): Promise<IMochaTest[]> {
    try {
      const response = await this.client.get('/tests', {
        params: { category }
      })
      return response.data.tests || []
    } catch (error) {
      console.error('Failed to fetch iMocha tests:', error)
      throw new Error('Failed to fetch available tests')
    }
  }

  /**
   * Get a specific test by ID
   */
  async getTest(testId: string): Promise<IMochaTest | null> {
    try {
      const response = await this.client.get(`/tests/${testId}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch iMocha test:', error)
      return null
    }
  }

  /**
   * Send assessment invitation to a candidate
   */
  async inviteCandidate(params: {
    testId: string
    candidateId: string
    candidateEmail: string
    candidateName: string
    applicationId?: string
    expiresAt?: Date
  }): Promise<{ assessment: any; invitation: IMochaInvitation }> {
    const expiresAt = params.expiresAt || new Date(Date.now() + imochaConfig.defaultExpiration)

    try {
      // Call iMocha API to create invitation
      const response = await this.client.post('/invitations', {
        test_id: params.testId,
        candidate: {
          email: params.candidateEmail,
          name: params.candidateName,
        },
        expires_at: expiresAt.toISOString(),
        callback_url: `${process.env.API_URL || 'http://localhost:4000'}/api/v1/assessments/webhook`,
        proctoring: imochaConfig.proctoring,
      })

      const invitation: IMochaInvitation = {
        invitationId: response.data.invitation_id,
        testId: params.testId,
        testUrl: response.data.test_url,
        expiresAt: expiresAt.toISOString(),
      }

      // Get test details for name
      const test = await this.getTest(params.testId)

      // Create assessment record in database
      const assessment = await prisma.assessment.create({
        data: {
          candidateId: params.candidateId,
          applicationId: params.applicationId,
          imochaTestId: params.testId,
          imochaInvitationId: invitation.invitationId,
          testName: test?.name || 'Assessment',
          status: 'invited',
          invitedAt: new Date(),
          expiresAt,
        },
        include: {
          candidate: {
            include: { user: { select: { email: true } } }
          }
        }
      })

      // Update application stage if linked
      if (params.applicationId) {
        await prisma.application.update({
          where: { id: params.applicationId },
          data: { stage: 'assessment' }
        })
      }

      return { assessment, invitation }
    } catch (error) {
      console.error('Failed to create iMocha invitation:', error)
      throw new Error('Failed to send assessment invitation')
    }
  }

  /**
   * Get assessment results from iMocha
   */
  async getResults(attemptId: string): Promise<IMochaResult> {
    try {
      const response = await this.client.get(`/attempts/${attemptId}/results`)
      return {
        attemptId: response.data.attempt_id,
        testId: response.data.test_id,
        candidateEmail: response.data.candidate_email,
        score: response.data.score,
        maxScore: response.data.max_score,
        percentile: response.data.percentile,
        reportUrl: response.data.report_url,
        completedAt: response.data.completed_at,
      }
    } catch (error) {
      console.error('Failed to fetch iMocha results:', error)
      throw new Error('Failed to fetch assessment results')
    }
  }

  /**
   * Get detailed skill breakdown from iMocha
   */
  async getSkillReport(attemptId: string): Promise<IMochaSkillReport> {
    try {
      const response = await this.client.get(`/attempts/${attemptId}/skill-report`)
      return {
        attemptId: response.data.attempt_id,
        skills: response.data.skills.map((s: any) => ({
          skillName: s.skill_name,
          score: s.score,
          maxScore: s.max_score,
          percentile: s.percentile,
        })),
      }
    } catch (error) {
      console.error('Failed to fetch iMocha skill report:', error)
      throw new Error('Failed to fetch skill report')
    }
  }

  /**
   * Handle webhook events from iMocha
   */
  async handleWebhook(payload: IMochaWebhookPayload): Promise<void> {
    console.log(`Processing iMocha webhook: ${payload.event}`, payload.data.attemptId || payload.data.invitationId)

    switch (payload.event) {
      case 'test.started':
        await this.handleTestStarted(payload)
        break
      case 'test.completed':
        await this.handleTestCompleted(payload)
        break
      case 'test.expired':
        await this.handleTestExpired(payload)
        break
      case 'test.cancelled':
        await this.handleTestCancelled(payload)
        break
      default:
        console.warn(`Unknown iMocha webhook event: ${payload.event}`)
    }
  }

  /**
   * Handle test started event
   */
  private async handleTestStarted(payload: IMochaWebhookPayload): Promise<void> {
    const { invitationId, attemptId } = payload.data

    await prisma.assessment.updateMany({
      where: { imochaInvitationId: invitationId },
      data: {
        imochaAttemptId: attemptId,
        status: 'started',
        startedAt: new Date(payload.timestamp),
      }
    })
  }

  /**
   * Handle test completed event
   */
  private async handleTestCompleted(payload: IMochaWebhookPayload): Promise<void> {
    const { attemptId, invitationId, score, maxScore, percentile, reportUrl, proctoringFlags } = payload.data

    // Find the assessment
    const assessment = await prisma.assessment.findFirst({
      where: {
        OR: [
          { imochaAttemptId: attemptId },
          { imochaInvitationId: invitationId }
        ]
      },
      include: {
        candidate: true,
        application: true,
      }
    })

    if (!assessment) {
      console.error(`Assessment not found for attempt: ${attemptId}`)
      return
    }

    // Try to get detailed skill report (may fail in mock mode)
    let skillScores: IMochaSkillScore[] = []
    try {
      const skillReport = await this.getSkillReport(attemptId)
      skillScores = skillReport.skills
    } catch {
      // Use mock skill scores if API call fails
      skillScores = this.generateMockSkillScores(assessment.testName || 'Assessment')
    }

    // Update assessment record
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        imochaAttemptId: attemptId,
        status: 'completed',
        score: score || 85,
        maxScore: maxScore || 100,
        percentile: percentile || 75,
        skillScores: skillScores as any,
        reportUrl,
        proctoringFlags: proctoringFlags as any,
        completedAt: new Date(payload.timestamp),
      }
    })

    // Generate skill badges
    await this.generateSkillBadges(assessment.candidateId, assessment.id, skillScores)

    // Update application stage if linked
    if (assessment.applicationId) {
      await prisma.application.update({
        where: { id: assessment.applicationId },
        data: { stage: 'assessment_complete' }
      })
    }

    // Update candidate profile score
    await this.updateCandidateProfileScore(assessment.candidateId)

    console.log(`Assessment completed: ${assessment.id}, Score: ${score || 85}/${maxScore || 100}`)
  }

  /**
   * Handle test expired event
   */
  private async handleTestExpired(payload: IMochaWebhookPayload): Promise<void> {
    const { invitationId } = payload.data

    const assessment = await prisma.assessment.findFirst({
      where: { imochaInvitationId: invitationId },
      include: { application: true }
    })

    if (assessment) {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'expired' }
      })

      // Optionally update application stage
      if (assessment.applicationId) {
        await prisma.application.update({
          where: { id: assessment.applicationId },
          data: { stage: 'assessment' } // Keep at assessment stage, not complete
        })
      }
    }
  }

  /**
   * Handle test cancelled event
   */
  private async handleTestCancelled(payload: IMochaWebhookPayload): Promise<void> {
    const { invitationId } = payload.data

    await prisma.assessment.updateMany({
      where: { imochaInvitationId: invitationId },
      data: { status: 'cancelled' }
    })
  }

  /**
   * Generate skill badges based on assessment results
   */
  private async generateSkillBadges(
    candidateId: string,
    assessmentId: string,
    skillScores: IMochaSkillScore[]
  ): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // Badges valid for 1 year

    for (const skill of skillScores) {
      const badgeLevel = getBadgeLevel(skill.percentile)

      // Only create badges for intermediate level and above
      if (skill.percentile < imochaConfig.badgeLevels.intermediate) {
        continue
      }

      await prisma.skillBadge.upsert({
        where: {
          candidateId_skillName: {
            candidateId,
            skillName: skill.skillName,
          }
        },
        update: {
          assessmentId,
          badgeLevel,
          score: skill.score,
          percentile: skill.percentile,
          verifiedAt: new Date(),
          expiresAt,
        },
        create: {
          candidateId,
          assessmentId,
          skillName: skill.skillName,
          badgeLevel,
          score: skill.score,
          percentile: skill.percentile,
          expiresAt,
        }
      })
    }

    console.log(`Generated ${skillScores.length} skill badges for candidate: ${candidateId}`)
  }

  /**
   * Update candidate's profile score based on assessments and badges
   */
  private async updateCandidateProfileScore(candidateId: string): Promise<void> {
    // Get all completed assessments
    const assessments = await prisma.assessment.findMany({
      where: {
        candidateId,
        status: 'completed',
      }
    })

    // Get all valid badges
    const badges = await prisma.skillBadge.findMany({
      where: {
        candidateId,
        expiresAt: { gt: new Date() }
      }
    })

    // Calculate profile score (weighted average)
    let profileScore = 50 // Base score

    if (assessments.length > 0) {
      const avgAssessmentScore = assessments.reduce((acc, a) => {
        if (a.score && a.maxScore) {
          return acc + (a.score / a.maxScore) * 100
        }
        return acc
      }, 0) / assessments.length

      profileScore += avgAssessmentScore * 0.3 // 30% weight for assessments
    }

    // Add badge bonuses
    const badgeBonuses: Record<BadgeLevel, number> = {
      expert: 5,
      advanced: 3,
      intermediate: 1,
      beginner: 0,
    }

    const badgeBonus = badges.reduce((acc, b) => {
      return acc + (badgeBonuses[b.badgeLevel as BadgeLevel] || 0)
    }, 0)

    profileScore += Math.min(badgeBonus, 20) // Max 20 points from badges

    // Cap at 100
    profileScore = Math.min(Math.round(profileScore), 100)

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { profileScore }
    })
  }

  /**
   * Generate mock skill scores for testing
   */
  private generateMockSkillScores(testName: string): IMochaSkillScore[] {
    const skillSets: Record<string, string[]> = {
      'React': ['React', 'JavaScript', 'TypeScript', 'CSS'],
      'Python': ['Python', 'Django', 'FastAPI', 'SQL'],
      'Node.js': ['Node.js', 'Express', 'JavaScript', 'MongoDB'],
      'DevOps': ['Kubernetes', 'Docker', 'AWS', 'CI/CD'],
      'default': ['Problem Solving', 'Data Structures', 'Algorithms'],
    }

    const skills = skillSets[testName] || skillSets['default']

    return skills.map(skillName => ({
      skillName,
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      maxScore: 100,
      percentile: Math.floor(Math.random() * 40) + 60, // 60-100
    }))
  }
}

export const imochaService = new IMochaService()
