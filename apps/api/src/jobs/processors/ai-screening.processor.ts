import { Job } from 'bullmq'
import prisma from '../../config/database.js'
import { socketService } from '../../services/socket.service.js'
import { AIScreeningJobData } from '../queues.js'

/**
 * Process AI screening jobs
 */
export async function processAIScreeningJob(job: Job<AIScreeningJobData>): Promise<void> {
  const { applicationId, jobId, candidateId, resumeContent } = job.data

  console.log(`Processing AI screening job: ${job.id}, application: ${applicationId}`)

  try {
    // Log the AI action as pending
    const aiAction = await prisma.aiAction.create({
      data: {
        agentType: 'screening',
        actionType: 'screen_candidate',
        entityType: 'application',
        entityId: applicationId,
        inputPayload: { applicationId, jobId, candidateId },
        status: 'processing',
      }
    })

    // Notify admins of pending AI action
    socketService.notifyAIActionPending(aiAction.id, 'screening', 'screen_candidate')

    // Fetch job and candidate data
    const [job_record, candidate, application] = await Promise.all([
      prisma.job.findUnique({
        where: { id: jobId },
        include: { client: true }
      }),
      prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          skillBadges: { where: { expiresAt: { gt: new Date() } } },
          assessments: { where: { status: 'completed' }, take: 5 }
        }
      }),
      prisma.application.findUnique({
        where: { id: applicationId }
      })
    ])

    if (!job_record || !candidate || !application) {
      throw new Error('Required data not found')
    }

    // Perform AI screening analysis
    const screeningResult = await performAIScreening({
      job: job_record,
      candidate,
      resumeContent: resumeContent || null,
    })

    // Update application with AI results
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        matchScore: screeningResult.matchScore,
        matchDetails: screeningResult.matchDetails as any,
        aiSummary: screeningResult.summary,
        stage: application.stage === 'new' ? 'screening' : application.stage,
        stageUpdatedAt: new Date(),
      }
    })

    // Update AI action as completed
    await prisma.aiAction.update({
      where: { id: aiAction.id },
      data: {
        status: 'completed',
        outputPayload: screeningResult as any,
        executedAt: new Date(),
      }
    })

    // Notify completion
    socketService.notifyAIActionCompleted(aiAction.id, 'completed', screeningResult)

    // If high match score, could auto-advance (if configured)
    if (screeningResult.matchScore >= 80 && screeningResult.recommendation === 'proceed') {
      // This could be configurable per client
      console.log(`High match score (${screeningResult.matchScore}) for application: ${applicationId}`)
    }

    console.log(`AI screening completed: ${job.id}, score: ${screeningResult.matchScore}`)
  } catch (error) {
    console.error(`AI screening failed: ${job.id}`, error)
    throw error
  }
}

interface ScreeningInput {
  job: any
  candidate: any
  resumeContent?: any
}

interface ScreeningResult {
  matchScore: number
  recommendation: 'proceed' | 'review' | 'reject'
  summary: string
  matchDetails: {
    skillMatch: number
    experienceMatch: number
    locationMatch: number
    salaryMatch: number
    strengths: string[]
    concerns: string[]
  }
}

/**
 * Perform AI screening analysis
 * In production, this would call the AI engine
 */
async function performAIScreening(input: ScreeningInput): Promise<ScreeningResult> {
  const { job, candidate, resumeContent } = input

  // Calculate skill match
  const requiredSkills = job.skillsRequired || []
  const candidateSkills = candidate.skills || []
  const badgeSkills = candidate.skillBadges?.map((b: any) => b.skillName.toLowerCase()) || []

  const matchedSkills = requiredSkills.filter((skill: string) =>
    candidateSkills.some((cs: string) => cs.toLowerCase().includes(skill.toLowerCase())) ||
    badgeSkills.some((bs: string) => bs.includes(skill.toLowerCase()))
  )
  const skillMatch = requiredSkills.length > 0
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 50

  // Calculate experience match
  const requiredExpMin = job.experienceMin || 0
  const requiredExpMax = job.experienceMax || 15
  const candidateExp = candidate.experienceYears || 0

  let experienceMatch = 100
  if (candidateExp < requiredExpMin) {
    experienceMatch = Math.max(0, 100 - (requiredExpMin - candidateExp) * 20)
  } else if (candidateExp > requiredExpMax + 5) {
    experienceMatch = 80 // Slight penalty for being overqualified
  }

  // Location match (simplified)
  const jobLocation = job.location?.toLowerCase() || ''
  const candidateLocation = candidate.location?.toLowerCase() || ''
  const remotePolicy = job.remotePolicy

  let locationMatch = 50
  if (remotePolicy === 'remote') {
    locationMatch = 100
  } else if (candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation)) {
    locationMatch = 100
  } else if (candidate.willingToRelocate) {
    locationMatch = 80
  }

  // Salary match
  const jobSalaryMin = job.salaryMin || 0
  const jobSalaryMax = job.salaryMax || 999999
  const candidateSalaryMin = candidate.expectedSalaryMin || 0
  const candidateSalaryMax = candidate.expectedSalaryMax || 999999

  let salaryMatch = 100
  if (candidateSalaryMin > jobSalaryMax) {
    salaryMatch = Math.max(0, 100 - ((candidateSalaryMin - jobSalaryMax) / jobSalaryMax) * 100)
  } else if (candidateSalaryMax < jobSalaryMin) {
    salaryMatch = 80 // They might accept more
  }

  // Calculate overall score (weighted average)
  const matchScore = Math.round(
    skillMatch * 0.4 +
    experienceMatch * 0.3 +
    locationMatch * 0.15 +
    salaryMatch * 0.15
  )

  // Determine recommendation
  let recommendation: 'proceed' | 'review' | 'reject' = 'review'
  if (matchScore >= 75) {
    recommendation = 'proceed'
  } else if (matchScore < 40) {
    recommendation = 'reject'
  }

  // Build strengths and concerns
  const strengths: string[] = []
  const concerns: string[] = []

  if (skillMatch >= 70) strengths.push(`Strong skill match (${matchedSkills.join(', ')})`)
  if (skillMatch < 50) concerns.push('Missing key required skills')

  if (experienceMatch >= 80) strengths.push(`Appropriate experience level (${candidateExp} years)`)
  if (experienceMatch < 50) concerns.push('Experience level mismatch')

  if (candidate.skillBadges?.length > 0) {
    strengths.push(`${candidate.skillBadges.length} verified skill badges`)
  }

  if (candidate.assessments?.length > 0) {
    const avgScore = candidate.assessments.reduce((acc: number, a: any) =>
      acc + (a.score / a.maxScore) * 100, 0) / candidate.assessments.length
    if (avgScore >= 75) strengths.push(`Strong assessment performance (${Math.round(avgScore)}%)`)
  }

  if (locationMatch < 80 && remotePolicy !== 'remote') {
    concerns.push('Location mismatch - may require relocation')
  }

  if (salaryMatch < 80) {
    concerns.push('Salary expectations may not align')
  }

  // Generate summary
  const summary = `${candidate.firstName} ${candidate.lastName} shows a ${matchScore}% match for this role. ` +
    (strengths.length > 0 ? `Strengths: ${strengths.slice(0, 2).join('; ')}. ` : '') +
    (concerns.length > 0 ? `Areas of concern: ${concerns.slice(0, 2).join('; ')}.` : '')

  return {
    matchScore,
    recommendation,
    summary,
    matchDetails: {
      skillMatch,
      experienceMatch,
      locationMatch,
      salaryMatch,
      strengths,
      concerns,
    }
  }
}
