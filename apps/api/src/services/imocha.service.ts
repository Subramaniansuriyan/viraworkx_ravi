import axios, { AxiosInstance, AxiosError } from 'axios'
import crypto from 'crypto'
import prisma from '../config/database.js'
import { imochaConfig, getBadgeLevel, BadgeLevel, getTierLevel, isIMochaConfigured } from '../config/imocha.js'
import { socketService } from './socket.service.js'
import { contractService } from './contract.service.js'

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
  private isConfigured: boolean

  constructor() {
    this.isConfigured = isIMochaConfigured()

    this.client = axios.create({
      baseURL: imochaConfig.baseUrl,
      headers: {
        'x-api-key': imochaConfig.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: imochaConfig.timeout,
    })

    // Add retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any
        if (!config || config.__retryCount >= imochaConfig.retries) {
          return Promise.reject(error)
        }

        config.__retryCount = config.__retryCount || 0

        // Only retry on network errors or 5xx errors
        if (!error.response || error.response.status >= 500) {
          config.__retryCount += 1
          await this.delay(imochaConfig.retryDelay * config.__retryCount)
          return this.client(config)
        }

        return Promise.reject(error)
      }
    )

    if (!this.isConfigured) {
      console.warn('iMocha API not configured - using mock mode')
    } else {
      console.log('iMocha API configured and ready')
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if iMocha is configured for live API calls
   */
  isLive(): boolean {
    return this.isConfigured
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
    if (!this.isConfigured) {
      // Return mock tests for development
      const mockTests: IMochaTest[] = [
        { id: 'mock-js-001', name: 'JavaScript Fundamentals', category: 'Programming', duration: 45, skills: ['JavaScript', 'ES6', 'DOM'], difficulty: 'intermediate' },
        { id: 'mock-react-002', name: 'React & Frontend Development', category: 'Programming', duration: 60, skills: ['React', 'TypeScript', 'CSS'], difficulty: 'intermediate' },
        { id: 'mock-node-003', name: 'Node.js & Backend', category: 'Programming', duration: 60, skills: ['Node.js', 'Express', 'REST API'], difficulty: 'intermediate' },
        { id: 'mock-py-004', name: 'Python Programming', category: 'Programming', duration: 45, skills: ['Python', 'OOP', 'Data Structures'], difficulty: 'beginner' },
        { id: 'mock-sql-005', name: 'SQL & Database Design', category: 'Database', duration: 30, skills: ['SQL', 'PostgreSQL', 'Database Design'], difficulty: 'intermediate' },
        { id: 'mock-java-006', name: 'Java Development', category: 'Programming', duration: 60, skills: ['Java', 'OOP', 'Spring'], difficulty: 'intermediate' },
        { id: 'mock-comm-007', name: 'English Communication', category: 'Communication', duration: 30, skills: ['Communication', 'Writing', 'Grammar'], difficulty: 'beginner' },
        { id: 'mock-cs-008', name: 'Computer Science Fundamentals', category: 'Core', duration: 45, skills: ['Algorithms', 'Data Structures', 'Problem Solving'], difficulty: 'intermediate' },
      ]
      if (category) return mockTests.filter(t => t.category === category)
      return mockTests
    }

    try {
      const response = await this.client.get('/tests', {
        params: { category }
      })
      const tests = response.data.tests || []
      // Normalise v3 field names (testId/testName) to our internal shape
      return tests.map((t: any) => ({
        id: String(t.testId ?? t.id),
        name: t.testName ?? t.name,
        category: t.category || 'General',
        duration: t.duration || 60,
        skills: t.labels || [],
        difficulty: t.difficulty || 'Intermediate',
        status: t.status,
      }))
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

    // If not configured, use mock mode
    if (!this.isConfigured) {
      return this.createMockInvitation(params, expiresAt)
    }

    try {
      // Call iMocha API to create invitation (v3 format)
      const response = await this.client.post(`/tests/${params.testId}/invite`, {
        email: params.candidateEmail,
        name: params.candidateName,
      })

      const invitation: IMochaInvitation = {
        invitationId: String(response.data.testInvitationId),
        testId: params.testId,
        testUrl: response.data.testUrl,
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
          invitationUrl: invitation.testUrl,
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

      console.log(`iMocha invitation sent: ${invitation.invitationId}`)
      return { assessment, invitation }
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response) {
        console.error('iMocha API error:', axiosError.response.status, axiosError.response.data)
        // Handle specific error codes
        if (axiosError.response.status === 401) {
          throw new Error('iMocha authentication failed - check API credentials')
        }
        if (axiosError.response.status === 404) {
          throw new Error('Test not found in iMocha')
        }
        if (axiosError.response.status === 429) {
          throw new Error('iMocha rate limit exceeded - please try again later')
        }
      }
      console.error('Failed to create iMocha invitation:', error)
      throw new Error('Failed to send assessment invitation')
    }
  }

  /**
   * Create mock invitation for development/testing
   */
  private async createMockInvitation(
    params: {
      testId: string
      candidateId: string
      candidateEmail: string
      candidateName: string
      applicationId?: string
    },
    expiresAt: Date
  ): Promise<{ assessment: any; invitation: IMochaInvitation }> {
    const invitationId = `mock-inv-${Date.now()}`

    const invitation: IMochaInvitation = {
      invitationId,
      testId: params.testId,
      testUrl: `https://assessment.imocha.io/test/${invitationId}`,
      expiresAt: expiresAt.toISOString(),
    }

    // Get mock test name
    const testNames: Record<string, string> = {
      'react-senior': 'React.js Senior Developer',
      'python-backend': 'Python Backend Developer',
      'nodejs-fullstack': 'Node.js Full Stack',
      'devops-aws': 'DevOps & AWS',
      'ml-python': 'Machine Learning with Python',
    }

    const assessment = await prisma.assessment.create({
      data: {
        candidateId: params.candidateId,
        applicationId: params.applicationId,
        imochaTestId: params.testId,
        imochaInvitationId: invitationId,
        invitationUrl: invitation.testUrl,
        testName: testNames[params.testId] || 'Assessment',
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

    if (params.applicationId) {
      await prisma.application.update({
        where: { id: params.applicationId },
        data: { stage: 'assessment' }
      })
    }

    console.log(`Mock iMocha invitation created: ${invitationId}`)
    return { assessment, invitation }
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

    // Try to get detailed skill report from iMocha
    let skillScores: IMochaSkillScore[] = []
    try {
      const skillReport = await this.getSkillReport(attemptId)
      skillScores = skillReport.skills
    } catch {
      console.warn(`Could not fetch skill report for attempt ${attemptId} — badges will not be generated`)
    }

    // Compute tier from real score only
    const tier = (score != null && maxScore != null) ? getTierLevel(score, maxScore) : null

    // Update assessment record with real iMocha data only
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        imochaAttemptId: attemptId,
        status: 'completed',
        score: score ?? null,
        maxScore: maxScore ?? null,
        percentile: percentile ?? null,
        skillScores: skillScores.length > 0 ? skillScores as any : undefined,
        reportUrl,
        tier,
        proctoringFlags: proctoringFlags as any,
        completedAt: new Date(payload.timestamp),
      }
    })

    // Generate skill badges only if we have real skill data
    if (skillScores.length > 0) {
      await this.generateSkillBadges(assessment.candidateId, assessment.id, skillScores)
    }

    // Update application stage if linked
    if (assessment.applicationId) {
      await prisma.application.update({
        where: { id: assessment.applicationId },
        data: { stage: 'assessment_complete' }
      })
    }

    // Auto-initiate contract if score >= 60%
    if (
      assessment.applicationId &&
      score != null &&
      maxScore != null &&
      maxScore > 0 &&
      (score / maxScore) * 100 >= 60
    ) {
      try {
        // Check no contract already exists for this application
        const existingContract = await prisma.contract.findFirst({
          where: { applicationId: assessment.applicationId },
        })

        if (!existingContract) {
          // Find the first active contractor template
          const template = await prisma.contractTemplate.findFirst({
            where: { isActive: true, templateType: 'contractor' },
            orderBy: { createdAt: 'asc' },
          })

          if (template) {
            const contract = await contractService.generateContract({
              applicationId: assessment.applicationId,
              templateId: template.id,
            })
            if (contract) {
              await contractService.sendForSignatures(contract.id)
              console.log(
                `[iMocha] Auto-initiated contract ${contract.id} for application ${assessment.applicationId} (score ${score}/${maxScore})`
              )
            }
          } else {
            console.warn('[iMocha] No active contractor template found — skipping auto-contract')
          }
        }
      } catch (err) {
        // Don't fail assessment completion if contract generation fails
        console.error('[iMocha] Failed to auto-initiate contract:', err)
      }
    }

    // Update candidate profile score
    await this.updateCandidateProfileScore(assessment.candidateId)

    // Send real-time notification
    if (assessment.application?.jobId && score != null && maxScore != null) {
      socketService.notifyAssessmentCompleted(
        assessment.id,
        assessment.candidateId,
        score,
        maxScore,
        assessment.application.jobId
      )
    }

    console.log(`Assessment completed: ${assessment.id}, Score: ${score ?? 'N/A'}/${maxScore ?? 'N/A'}`)
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
