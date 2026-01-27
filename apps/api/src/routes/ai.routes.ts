import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

// AI Screening Schema
const screenCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
})

const matchJobsSchema = z.object({
  candidateId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(10),
})

const rankCandidatesSchema = z.object({
  jobId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(20),
})

const generateOutreachSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
  channel: z.enum(['email', 'linkedin', 'sms']).default('email'),
})

/**
 * POST /api/v1/ai/screen-candidate
 * Run AI screening on a candidate for a job
 */
router.post('/screen-candidate', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = screenCandidateSchema.parse(req.body)

    const [candidate, job] = await Promise.all([
      prisma.candidate.findUnique({
        where: { id: input.candidateId },
        include: {
          skillBadges: { where: { expiresAt: { gt: new Date() } } },
          assessments: { where: { status: 'completed' }, take: 5 }
        }
      }),
      prisma.job.findUnique({
        where: { id: input.jobId }
      })
    ])

    if (!candidate || !job) {
      return res.status(404).json({ error: 'Candidate or job not found' })
    }

    // Calculate skill match
    const requiredSkills = job.skillsRequired || []
    const candidateSkills = candidate.skills || []
    const matchedSkills = requiredSkills.filter(s =>
      candidateSkills.some(cs => cs.toLowerCase() === s.toLowerCase())
    )
    const skillMatchPercent = requiredSkills.length > 0
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : 50

    // Check experience
    const expMatch = (!job.experienceMin || (candidate.experienceYears || 0) >= job.experienceMin) &&
                     (!job.experienceMax || (candidate.experienceYears || 0) <= job.experienceMax)

    // Badge bonus
    const relevantBadges = candidate.skillBadges.filter(b =>
      requiredSkills.some(s => s.toLowerCase() === b.skillName.toLowerCase())
    )
    const badgeBonus = relevantBadges.reduce((acc, b) => {
      if (b.badgeLevel === 'expert') return acc + 10
      if (b.badgeLevel === 'advanced') return acc + 5
      return acc + 2
    }, 0)

    // Assessment bonus
    const assessmentBonus = candidate.assessments.length > 0 ? 10 : 0

    // Calculate overall match score
    let matchScore = skillMatchPercent * 0.6 // 60% weight for skills
    matchScore += expMatch ? 20 : 0 // 20% for experience
    matchScore += Math.min(badgeBonus, 15) // Up to 15% for badges
    matchScore += assessmentBonus * 0.05 // 5% for assessments
    matchScore = Math.min(Math.round(matchScore), 100)

    // Generate strengths and concerns
    const strengths: string[] = []
    const concerns: string[] = []

    if (skillMatchPercent >= 80) strengths.push(`Strong skill match (${matchedSkills.join(', ')})`)
    else if (skillMatchPercent >= 50) strengths.push(`Partial skill match (${matchedSkills.join(', ')})`)
    else concerns.push(`Limited skill overlap (${skillMatchPercent}% match)`)

    if (expMatch) strengths.push('Experience level matches requirements')
    else concerns.push('Experience level may not align')

    if (relevantBadges.length > 0) {
      strengths.push(`Verified skills: ${relevantBadges.map(b => `${b.skillName} (${b.badgeLevel})`).join(', ')}`)
    }

    if (candidate.assessments.length > 0) {
      const avgScore = candidate.assessments.reduce((acc, a) => acc + (a.percentile || 0), 0) / candidate.assessments.length
      if (avgScore >= 75) strengths.push(`Strong assessment performance (avg ${Math.round(avgScore)}th percentile)`)
    }

    // Determine recommendation
    let recommendation: 'proceed' | 'review' | 'reject' = 'review'
    if (matchScore >= 80) recommendation = 'proceed'
    else if (matchScore < 40) recommendation = 'reject'

    // Generate summary
    const summary = `${candidate.firstName} ${candidate.lastName} has a ${matchScore}% match for this role. ` +
      `${strengths.length > 0 ? 'Key strengths include ' + strengths[0].toLowerCase() + '. ' : ''}` +
      `${concerns.length > 0 ? 'Note: ' + concerns[0] + '.' : ''}`

    // Log AI action
    await prisma.aiAction.create({
      data: {
        agentType: 'screening',
        actionType: 'candidate_screening',
        entityType: 'application',
        inputPayload: input,
        outputPayload: { matchScore, strengths, concerns, recommendation, summary },
        status: 'completed',
        executedAt: new Date()
      }
    })

    res.json({
      matchScore,
      strengths,
      concerns,
      recommendation,
      summary,
      details: {
        skillMatch: skillMatchPercent,
        experienceMatch: expMatch,
        verifiedSkills: relevantBadges.length,
        assessmentsTaken: candidate.assessments.length
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error screening candidate:', error)
    res.status(500).json({ error: 'Failed to screen candidate' })
  }
})

/**
 * POST /api/v1/ai/match-jobs
 * Find matching jobs for a candidate
 */
router.post('/match-jobs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const input = matchJobsSchema.parse(req.body)

    const candidate = await prisma.candidate.findUnique({
      where: { id: input.candidateId },
      include: { skillBadges: { where: { expiresAt: { gt: new Date() } } } }
    })

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' })
    }

    // Find jobs with overlapping skills
    const jobs = await prisma.job.findMany({
      where: {
        status: 'active',
        skillsRequired: { hasSome: candidate.skills }
      },
      include: {
        client: { select: { companyName: true, companyLogoUrl: true } }
      },
      take: 100
    })

    // Calculate match scores
    const scoredJobs = jobs.map(job => {
      const skillMatch = job.skillsRequired.filter(s =>
        candidate.skills.some(cs => cs.toLowerCase() === s.toLowerCase())
      ).length
      const matchScore = Math.round((skillMatch / (job.skillsRequired.length || 1)) * 100)

      // Experience bonus/penalty
      let expBonus = 0
      if (job.experienceMin && candidate.experienceYears && candidate.experienceYears >= job.experienceMin) {
        expBonus = 10
      }

      return {
        ...job,
        matchScore: Math.min(matchScore + expBonus, 100),
        matchedSkills: job.skillsRequired.filter(s =>
          candidate.skills.some(cs => cs.toLowerCase() === s.toLowerCase())
        )
      }
    })

    // Sort by match score and return top matches
    const topMatches = scoredJobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, input.limit)

    res.json({ jobs: topMatches })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error matching jobs:', error)
    res.status(500).json({ error: 'Failed to match jobs' })
  }
})

/**
 * POST /api/v1/ai/rank-candidates
 * Rank candidates for a job
 */
router.post('/rank-candidates', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = rankCandidatesSchema.parse(req.body)

    const job = await prisma.job.findUnique({
      where: { id: input.jobId }
    })

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Find candidates with matching skills
    const candidates = await prisma.candidate.findMany({
      where: {
        skills: { hasSome: job.skillsRequired }
      },
      include: {
        user: { select: { email: true } },
        skillBadges: {
          where: {
            skillName: { in: job.skillsRequired },
            expiresAt: { gt: new Date() }
          }
        },
        assessments: {
          where: { status: 'completed' },
          take: 3,
          orderBy: { completedAt: 'desc' }
        }
      },
      take: 200
    })

    // Score and rank candidates
    const rankedCandidates = candidates.map(c => {
      const skillMatch = job.skillsRequired.filter(s =>
        c.skills.some(cs => cs.toLowerCase() === s.toLowerCase())
      ).length
      const skillScore = (skillMatch / (job.skillsRequired.length || 1)) * 60

      // Badge bonus
      const badgeScore = c.skillBadges.reduce((acc, b) => {
        if (b.badgeLevel === 'expert') return acc + 8
        if (b.badgeLevel === 'advanced') return acc + 4
        return acc + 2
      }, 0)

      // Assessment bonus
      const assessmentScore = c.assessments.length > 0
        ? c.assessments.reduce((acc, a) => acc + (a.percentile || 0), 0) / c.assessments.length * 0.2
        : 0

      // Experience match
      let expScore = 0
      if (c.experienceYears) {
        if (job.experienceMin && c.experienceYears >= job.experienceMin) expScore += 10
        if (job.experienceMax && c.experienceYears <= job.experienceMax) expScore += 5
      }

      const totalScore = Math.min(Math.round(skillScore + Math.min(badgeScore, 20) + assessmentScore + expScore), 100)

      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.user.email,
        headline: c.headline,
        location: c.location,
        experienceYears: c.experienceYears,
        skills: c.skills,
        profileScore: c.profileScore,
        matchScore: totalScore,
        verifiedSkills: c.skillBadges.map(b => ({
          skill: b.skillName,
          level: b.badgeLevel
        })),
        matchedSkills: job.skillsRequired.filter(s =>
          c.skills.some(cs => cs.toLowerCase() === s.toLowerCase())
        )
      }
    })

    // Sort and limit
    const topCandidates = rankedCandidates
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, input.limit)

    res.json({ candidates: topCandidates })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error ranking candidates:', error)
    res.status(500).json({ error: 'Failed to rank candidates' })
  }
})

/**
 * POST /api/v1/ai/generate-outreach
 * Generate personalized outreach message
 */
router.post('/generate-outreach', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = generateOutreachSchema.parse(req.body)

    const [candidate, job] = await Promise.all([
      prisma.candidate.findUnique({
        where: { id: input.candidateId },
        include: { skillBadges: { where: { expiresAt: { gt: new Date() } } } }
      }),
      prisma.job.findUnique({
        where: { id: input.jobId },
        include: { client: { select: { companyName: true } } }
      })
    ])

    if (!candidate || !job) {
      return res.status(404).json({ error: 'Candidate or job not found' })
    }

    // Generate personalized message based on channel
    let subject = ''
    let message = ''

    const matchedSkills = job.skillsRequired.filter(s =>
      candidate.skills.some(cs => cs.toLowerCase() === s.toLowerCase())
    )

    if (input.channel === 'email') {
      subject = `Exciting ${job.title} opportunity at ${job.client?.companyName || 'our company'}`
      message = `Hi ${candidate.firstName},

I came across your profile and was impressed by your experience${matchedSkills.length > 0 ? `, particularly your skills in ${matchedSkills.slice(0, 3).join(', ')}` : ''}.

We're currently looking for a ${job.title} to join ${job.client?.companyName || 'our team'}${job.location ? ` in ${job.location}` : ''}${job.remotePolicy === 'remote' ? ' (fully remote)' : ''}.

${job.description ? job.description.slice(0, 200) + '...' : 'This is an exciting opportunity to work on challenging projects with a great team.'}

Would you be open to a brief conversation to learn more?

Best regards`
    } else if (input.channel === 'linkedin') {
      message = `Hi ${candidate.firstName}! Your background in ${matchedSkills.slice(0, 2).join(' and ') || 'your field'} caught my attention. We have an exciting ${job.title} role at ${job.client?.companyName || 'our company'} that might interest you. Would love to connect!`
    } else {
      message = `Hi ${candidate.firstName}, this is from ${job.client?.companyName || 'our recruiting team'}. We have a ${job.title} opportunity that matches your background. Interested in learning more?`
    }

    res.json({
      channel: input.channel,
      subject,
      message,
      candidate: {
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`
      },
      job: {
        id: job.id,
        title: job.title
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('Error generating outreach:', error)
    res.status(500).json({ error: 'Failed to generate outreach' })
  }
})

/**
 * GET /api/v1/ai/actions
 * Get AI action history
 */
router.get('/actions', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { agentType, status, limit = '50', offset = '0' } = req.query

    const where: any = {}
    if (agentType) where.agentType = agentType
    if (status) where.status = status

    const actions = await prisma.aiAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const total = await prisma.aiAction.count({ where })

    res.json({ actions, total })
  } catch (error) {
    console.error('Error fetching AI actions:', error)
    res.status(500).json({ error: 'Failed to fetch AI actions' })
  }
})

/**
 * POST /api/v1/ai/actions/:id/approve
 * Approve a pending AI action
 */
router.post('/actions/:id/approve', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const action = await prisma.aiAction.findUnique({
      where: { id: req.params.id }
    })

    if (!action) {
      return res.status(404).json({ error: 'Action not found' })
    }

    if (action.status !== 'pending') {
      return res.status(400).json({ error: 'Action is not pending approval' })
    }

    const updated = await prisma.aiAction.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        approvedBy: req.user!.userId,
        approvedAt: new Date(),
        executedAt: new Date()
      }
    })

    res.json({ action: updated })
  } catch (error) {
    console.error('Error approving action:', error)
    res.status(500).json({ error: 'Failed to approve action' })
  }
})

export default router
