import { Router, Response } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
 * POST /api/v1/ai/job-description
 * Generate a full job description using Claude
 */
router.post('/job-description', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const input = z.object({
      title: z.string().min(2).max(200),
      department: z.string().optional(),
      employmentType: z.string().optional(),
      experienceMin: z.number().optional(),
      experienceMax: z.number().optional(),
      remotePolicy: z.string().optional(),
      location: z.string().optional(),
      skillsRequired: z.array(z.string()).optional(),
      context: z.string().max(500).optional(), // extra notes from user
    }).parse(req.body)

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured' })
    }

    const prompt = `You are an expert technical recruiter writing job descriptions for US-based startups hiring remote talent from India.

Generate a compelling, well-structured job description for the following role. Return ONLY valid JSON with these exact keys: description, requirements, responsibilities.

Role details:
- Title: ${input.title}
${input.department ? `- Department: ${input.department}` : ''}
${input.employmentType ? `- Employment type: ${input.employmentType}` : ''}
${input.experienceMin != null || input.experienceMax != null ? `- Experience: ${input.experienceMin ?? 0}–${input.experienceMax ?? '10+'} years` : ''}
${input.remotePolicy ? `- Work style: ${input.remotePolicy}` : ''}
${input.location ? `- Location: ${input.location}` : ''}
${input.skillsRequired?.length ? `- Required skills: ${input.skillsRequired.join(', ')}` : ''}
${input.context ? `- Additional context: ${input.context}` : ''}

Guidelines:
- description: 3–4 sentences. Exciting overview of the role, team, and impact. Mention the India–US collaboration angle.
- requirements: Bullet list (5–7 items) as a single string with \\n• separators. Include technical and soft skill requirements.
- responsibilities: Bullet list (5–7 items) as a single string with \\n• separators. Focus on day-to-day ownership and impact.

Respond with ONLY the JSON object, no markdown, no explanation.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: { description: string; requirements: string; responsibilities: string }
    try {
      parsed = JSON.parse(text)
    } catch {
      // Strip markdown code fences if Claude added them
      const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    }

    if (!parsed.description || !parsed.requirements || !parsed.responsibilities) {
      throw new Error('Incomplete response from AI')
    }

    await prisma.aiAction.create({
      data: {
        agentType: 'sourcing',
        actionType: 'generate_job_description',
        entityType: 'job',
        inputPayload: input as any,
        outputPayload: parsed as any,
        status: 'completed',
        executedAt: new Date()
      }
    })

    res.json(parsed)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned malformed response, please try again' })
    }
    console.error('Error generating job description:', error)
    res.status(500).json({ error: 'Failed to generate job description' })
  }
})

/**
 * GET /api/v1/ai/actions/stats
 * Get AI action statistics
 */
router.get('/actions/stats', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [total, byStatus, pending] = await Promise.all([
      prisma.aiAction.count(),
      prisma.aiAction.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.aiAction.count({ where: { requiresApproval: true, status: 'pending' } })
    ])

    const completedActions = await prisma.aiAction.findMany({
      where: { status: 'completed' },
      select: { outputPayload: true },
      take: 100
    })

    let avgMatchScore = 0
    const scoresWithMatch = completedActions
      .map(a => (a.outputPayload as any)?.matchScore)
      .filter((s) => typeof s === 'number')
    if (scoresWithMatch.length > 0) {
      avgMatchScore = Math.round(scoresWithMatch.reduce((a: number, b: number) => a + b, 0) / scoresWithMatch.length)
    }

    res.json({
      stats: {
        total_actions: total,
        pending_approvals: pending,
        average_match_score: avgMatchScore,
        by_status: byStatus.reduce((acc, s) => {
          acc[s.status] = s._count.status
          return acc
        }, {} as Record<string, number>)
      }
    })
  } catch (error) {
    console.error('Error fetching AI action stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

/**
 * GET /api/v1/ai/actions/pending-approval
 * Get actions awaiting human review
 */
router.get('/actions/pending-approval', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const actions = await prisma.aiAction.findMany({
      where: { requiresApproval: true, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json({ actions })
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    res.status(500).json({ error: 'Failed to fetch pending approvals' })
  }
})

/**
 * GET /api/v1/ai/actions
 * Get AI action history
 */
router.get('/actions', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { agentType, agent_type, status, requiresApproval, limit = '50', offset = '0', page } = req.query

    const where: any = {}
    const resolvedAgentType = (agentType || agent_type) as string | undefined
    if (resolvedAgentType) where.agentType = resolvedAgentType
    if (status) where.status = status
    if (requiresApproval === 'true') where.requiresApproval = true

    // Support page-based pagination
    const take = parseInt(limit as string)
    const skip = page
      ? (parseInt(page as string) - 1) * take
      : parseInt(offset as string)

    const actions = await prisma.aiAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip
    })

    const total = await prisma.aiAction.count({ where })

    res.json({ actions, total })
  } catch (error) {
    console.error('Error fetching AI actions:', error)
    res.status(500).json({ error: 'Failed to fetch AI actions' })
  }
})

/**
 * GET /api/v1/ai/actions/:id
 * Get a single AI action by ID
 */
router.get('/actions/:id', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const action = await prisma.aiAction.findUnique({ where: { id: req.params.id } })
    if (!action) return res.status(404).json({ error: 'Action not found' })
    res.json({ action })
  } catch (error) {
    console.error('Error fetching AI action:', error)
    res.status(500).json({ error: 'Failed to fetch action' })
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
