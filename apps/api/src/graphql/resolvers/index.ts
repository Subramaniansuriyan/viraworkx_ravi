import prisma from '../../config/database.js'
import { GraphQLError } from 'graphql'

// Context type
interface Context {
  user?: {
    userId: string
    email: string
    userType: string
  }
}

// Helper to check authentication
const requireAuth = (context: Context) => {
  if (!context.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' }
    })
  }
  return context.user
}

// Helper to check role
const requireRole = (context: Context, ...roles: string[]) => {
  const user = requireAuth(context)
  if (!roles.includes(user.userType)) {
    throw new GraphQLError('Access denied', {
      extensions: { code: 'FORBIDDEN' }
    })
  }
  return user
}

export const resolvers = {
  // Custom Scalars
  DateTime: {
    serialize: (value: Date) => value.toISOString(),
    parseValue: (value: string) => new Date(value),
  },

  // Field Resolvers
  Candidate: {
    fullName: (parent: any) => `${parent.firstName} ${parent.lastName}`,
    user: async (parent: any) => {
      if (parent.user) return parent.user
      return prisma.user.findUnique({ where: { id: parent.userId } })
    },
    applications: async (parent: any) => {
      if (parent.applications) return parent.applications
      return prisma.application.findMany({
        where: { candidateId: parent.id },
        orderBy: { appliedAt: 'desc' }
      })
    },
    assessments: async (parent: any) => {
      if (parent.assessments) return parent.assessments
      return prisma.assessment.findMany({
        where: { candidateId: parent.id },
        orderBy: { createdAt: 'desc' }
      })
    },
    skillBadges: async (parent: any) => {
      if (parent.skillBadges) return parent.skillBadges
      return prisma.skillBadge.findMany({
        where: {
          candidateId: parent.id,
          expiresAt: { gt: new Date() }
        },
        orderBy: { percentile: 'desc' }
      })
    }
  },

  Job: {
    client: async (parent: any) => {
      if (parent.client) return parent.client
      return prisma.client.findUnique({ where: { id: parent.clientId } })
    },
    createdBy: async (parent: any) => {
      if (parent.createdBy) return parent.createdBy
      if (!parent.createdById) return null
      return prisma.user.findUnique({ where: { id: parent.createdById } })
    },
    applications: async (parent: any) => {
      if (parent.applications) return parent.applications
      return prisma.application.findMany({
        where: { jobId: parent.id },
        orderBy: { appliedAt: 'desc' }
      })
    },
    applicationCount: async (parent: any) => {
      return prisma.application.count({ where: { jobId: parent.id } })
    }
  },

  Application: {
    candidate: async (parent: any) => {
      if (parent.candidate) return parent.candidate
      return prisma.candidate.findUnique({ where: { id: parent.candidateId } })
    },
    job: async (parent: any) => {
      if (parent.job) return parent.job
      return prisma.job.findUnique({ where: { id: parent.jobId } })
    },
    interviews: async (parent: any) => {
      if (parent.interviews) return parent.interviews
      return prisma.interview.findMany({
        where: { applicationId: parent.id },
        orderBy: { scheduledAt: 'desc' }
      })
    },
    assessments: async (parent: any) => {
      if (parent.assessments) return parent.assessments
      return prisma.assessment.findMany({
        where: { applicationId: parent.id },
        orderBy: { createdAt: 'desc' }
      })
    }
  },

  Interview: {
    application: async (parent: any) => {
      if (parent.application) return parent.application
      return prisma.application.findUnique({ where: { id: parent.applicationId } })
    },
    participants: async (parent: any) => {
      if (parent.participants) return parent.participants
      return prisma.interviewParticipant.findMany({
        where: { interviewId: parent.id }
      })
    },
    feedback: async (parent: any) => {
      if (parent.feedback) return parent.feedback
      return prisma.interviewFeedback.findMany({
        where: { interviewId: parent.id }
      })
    }
  },

  Client: {
    jobs: async (parent: any) => {
      if (parent.jobs) return parent.jobs
      return prisma.job.findMany({
        where: { clientId: parent.id },
        orderBy: { createdAt: 'desc' }
      })
    }
  },

  // Query Resolvers
  Query: {
    // Current User
    me: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context)
      return prisma.user.findUnique({ where: { id: user.userId } })
    },

    myProfile: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context)
      if (user.userType !== 'candidate') {
        throw new GraphQLError('Only candidates have profiles', {
          extensions: { code: 'FORBIDDEN' }
        })
      }
      return prisma.candidate.findUnique({
        where: { userId: user.userId },
        include: {
          user: { select: { email: true } },
          skillBadges: {
            where: { expiresAt: { gt: new Date() } }
          }
        }
      })
    },

    // Candidates
    candidate: async (_: any, { id }: { id: string }, context: Context) => {
      requireAuth(context)
      return prisma.candidate.findUnique({
        where: { id },
        include: {
          user: { select: { email: true } },
          skillBadges: {
            where: { expiresAt: { gt: new Date() } }
          }
        }
      })
    },

    candidates: async (_: any, { filter, pagination }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      const where: any = {}

      if (filter?.skills?.length) {
        where.skills = { hasSome: filter.skills }
      }
      if (filter?.location) {
        where.location = { contains: filter.location, mode: 'insensitive' }
      }
      if (filter?.experienceMin !== undefined) {
        where.experienceYears = { gte: filter.experienceMin }
      }
      if (filter?.experienceMax !== undefined) {
        where.experienceYears = {
          ...where.experienceYears,
          lte: filter.experienceMax
        }
      }
      if (filter?.searchTerm) {
        where.OR = [
          { firstName: { contains: filter.searchTerm, mode: 'insensitive' } },
          { lastName: { contains: filter.searchTerm, mode: 'insensitive' } },
          { headline: { contains: filter.searchTerm, mode: 'insensitive' } }
        ]
      }

      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0

      const [items, total] = await Promise.all([
        prisma.candidate.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { email: true } },
            skillBadges: {
              where: { expiresAt: { gt: new Date() } },
              take: 5
            }
          }
        }),
        prisma.candidate.count({ where })
      ])

      return {
        items,
        total,
        hasMore: offset + items.length < total
      }
    },

    candidateJobMatches: async (_: any, { candidateId, limit = 10 }: any, context: Context) => {
      const user = requireAuth(context)

      // Candidates can only see their own matches
      if (user.userType === 'candidate') {
        const candidate = await prisma.candidate.findUnique({
          where: { userId: user.userId }
        })
        if (candidate?.id !== candidateId) {
          throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } })
        }
      }

      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId }
      })

      if (!candidate) {
        throw new GraphQLError('Candidate not found')
      }

      // Find matching jobs based on skills
      const jobs = await prisma.job.findMany({
        where: {
          status: 'active',
          skillsRequired: candidate.skills?.length
            ? { hasSome: candidate.skills }
            : undefined
        },
        take: limit,
        include: {
          client: { select: { companyName: true, companyLogoUrl: true } }
        }
      })

      // Calculate match scores
      return jobs.map(job => {
        const candidateSkills = candidate.skills || []
        const requiredSkills = job.skillsRequired || []
        const matchingSkills = candidateSkills.filter(s =>
          requiredSkills.some(rs => rs.toLowerCase() === s.toLowerCase())
        )

        const matchScore = requiredSkills.length > 0
          ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
          : 50

        return {
          job,
          matchScore,
          matchReasons: matchingSkills.length > 0
            ? [`Skills match: ${matchingSkills.join(', ')}`]
            : ['General fit based on experience']
        }
      }).sort((a, b) => b.matchScore - a.matchScore)
    },

    // Jobs
    job: async (_: any, { id }: { id: string }) => {
      return prisma.job.findUnique({
        where: { id },
        include: {
          client: { select: { companyName: true, companyLogoUrl: true, industry: true } }
        }
      })
    },

    jobs: async (_: any, { filter, pagination }: any) => {
      const where: any = {}

      if (filter?.clientId) {
        where.clientId = filter.clientId
      }
      if (filter?.status) {
        where.status = filter.status
      } else {
        // By default, show only active jobs for public queries
        where.status = 'active'
      }
      if (filter?.remotePolicy) {
        where.remotePolicy = filter.remotePolicy
      }
      if (filter?.skills?.length) {
        where.skillsRequired = { hasSome: filter.skills }
      }
      if (filter?.location) {
        where.location = { contains: filter.location, mode: 'insensitive' }
      }
      if (filter?.searchTerm) {
        where.OR = [
          { title: { contains: filter.searchTerm, mode: 'insensitive' } },
          { description: { contains: filter.searchTerm, mode: 'insensitive' } }
        ]
      }

      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0

      const [items, total] = await Promise.all([
        prisma.job.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            client: { select: { companyName: true, companyLogoUrl: true } }
          }
        }),
        prisma.job.count({ where })
      ])

      return {
        items,
        total,
        hasMore: offset + items.length < total
      }
    },

    jobCandidates: async (_: any, { jobId, ranked = true }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      const job = await prisma.job.findUnique({ where: { id: jobId } })
      if (!job) {
        throw new GraphQLError('Job not found')
      }

      const applications = await prisma.application.findMany({
        where: { jobId },
        include: {
          candidate: {
            include: {
              user: { select: { email: true } },
              skillBadges: {
                where: { expiresAt: { gt: new Date() } }
              }
            }
          }
        }
      })

      const matches = applications.map(app => {
        const candidate = app.candidate
        const candidateSkills = candidate.skills || []
        const requiredSkills = job.skillsRequired || []
        const matchingSkills = candidateSkills.filter(s =>
          requiredSkills.some(rs => rs.toLowerCase() === s.toLowerCase())
        )

        const matchScore = app.matchScore || (requiredSkills.length > 0
          ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
          : 50)

        return {
          candidate,
          matchScore,
          matchReasons: matchingSkills.length > 0
            ? [`Skills: ${matchingSkills.join(', ')}`]
            : ['Applied for position']
        }
      })

      if (ranked) {
        matches.sort((a, b) => b.matchScore - a.matchScore)
      }

      return matches
    },

    // Applications
    application: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)
      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          candidate: { include: { user: { select: { email: true } } } },
          job: { include: { client: { select: { companyName: true } } } },
          interviews: { orderBy: { scheduledAt: 'desc' } },
          assessments: { orderBy: { createdAt: 'desc' } }
        }
      })

      if (!application) {
        throw new GraphQLError('Application not found')
      }

      // Candidates can only see their own applications
      if (user.userType === 'candidate') {
        const candidate = await prisma.candidate.findUnique({
          where: { userId: user.userId }
        })
        if (candidate?.id !== application.candidateId) {
          throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } })
        }
      }

      return application
    },

    applications: async (_: any, { filter, pagination }: any, context: Context) => {
      const user = requireAuth(context)

      const where: any = {}

      // Candidates can only see their own applications
      if (user.userType === 'candidate') {
        const candidate = await prisma.candidate.findUnique({
          where: { userId: user.userId }
        })
        if (candidate) {
          where.candidateId = candidate.id
        }
      } else {
        if (filter?.jobId) where.jobId = filter.jobId
        if (filter?.candidateId) where.candidateId = filter.candidateId
      }

      if (filter?.stage) {
        where.stage = filter.stage
      }

      const limit = pagination?.limit || 20
      const offset = pagination?.offset || 0

      const [items, total] = await Promise.all([
        prisma.application.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { appliedAt: 'desc' },
          include: {
            candidate: { include: { user: { select: { email: true } } } },
            job: { include: { client: { select: { companyName: true, companyLogoUrl: true } } } }
          }
        }),
        prisma.application.count({ where })
      ])

      return {
        items,
        total,
        hasMore: offset + items.length < total
      }
    },

    // Interviews
    interview: async (_: any, { id }: { id: string }, context: Context) => {
      requireAuth(context)
      return prisma.interview.findUnique({
        where: { id },
        include: {
          application: {
            include: {
              candidate: true,
              job: true
            }
          },
          participants: { include: { user: true } },
          feedback: { include: { interviewer: true } }
        }
      })
    },

    interviews: async (_: any, { applicationId }: { applicationId?: string }, context: Context) => {
      requireAuth(context)
      const where: any = {}
      if (applicationId) where.applicationId = applicationId

      return prisma.interview.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        include: {
          application: {
            include: {
              candidate: true,
              job: true
            }
          }
        }
      })
    },

    // Assessments
    assessment: async (_: any, { id }: { id: string }, context: Context) => {
      requireAuth(context)
      return prisma.assessment.findUnique({
        where: { id },
        include: {
          candidate: true,
          job: true,
          application: true
        }
      })
    },

    assessments: async (_: any, { candidateId, applicationId }: any, context: Context) => {
      requireAuth(context)
      const where: any = {}
      if (candidateId) where.candidateId = candidateId
      if (applicationId) where.applicationId = applicationId

      return prisma.assessment.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      })
    },

    // Clients
    client: async (_: any, { id }: { id: string }, context: Context) => {
      requireAuth(context)
      return prisma.client.findUnique({
        where: { id },
        include: {
          jobs: {
            where: { status: { in: ['active', 'paused'] } },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    },

    // Notifications
    notifications: async (_: any, { unreadOnly = false }: any, context: Context) => {
      const user = requireAuth(context)
      const where: any = { userId: user.userId }
      if (unreadOnly) where.read = false

      return prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    },

    unreadNotificationCount: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context)
      return prisma.notification.count({
        where: { userId: user.userId, read: false }
      })
    },

    // AI Actions
    aiActions: async (_: any, { status, limit = 20 }: any, context: Context) => {
      requireRole(context, 'admin')
      const where: any = {}
      if (status) where.status = status

      return prisma.aIAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    },

    // Analytics
    pipelineAnalytics: async (_: any, { jobId }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      const where: any = {}
      if (jobId) where.jobId = jobId

      const stages = await prisma.application.groupBy({
        by: ['stage'],
        where,
        _count: { stage: true }
      })

      const stageOrder = [
        'new', 'screening', 'assessment', 'assessment_complete',
        'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'
      ]

      const pipeline = stageOrder.map(stage => ({
        stage,
        count: stages.find(s => s.stage === stage)?._count.stage || 0
      }))

      const total = pipeline.reduce((acc, p) => acc + p.count, 0)

      return { pipeline, total, conversionRates: null }
    },

    hiringMetrics: async (_: any, { clientId, dateRange }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      const where: any = {}

      if (clientId) {
        const jobs = await prisma.job.findMany({
          where: { clientId },
          select: { id: true }
        })
        where.jobId = { in: jobs.map(j => j.id) }
      }

      if (dateRange?.startDate) {
        where.appliedAt = { gte: new Date(dateRange.startDate) }
      }
      if (dateRange?.endDate) {
        where.appliedAt = { ...where.appliedAt, lte: new Date(dateRange.endDate) }
      }

      const [totalApplications, totalHired] = await Promise.all([
        prisma.application.count({ where }),
        prisma.application.count({ where: { ...where, stage: 'hired' } })
      ])

      return {
        totalApplications,
        totalHired,
        averageTimeToHire: null,
        sourceBreakdown: null,
        stageConversion: null
      }
    }
  },

  // Mutation Resolvers
  Mutation: {
    // Applications
    createApplication: async (_: any, { input }: any, context: Context) => {
      const user = requireRole(context, 'candidate')

      const candidate = await prisma.candidate.findUnique({
        where: { userId: user.userId }
      })

      if (!candidate) {
        throw new GraphQLError('Candidate profile not found')
      }

      // Check if already applied
      const existing = await prisma.application.findUnique({
        where: {
          candidateId_jobId: {
            candidateId: candidate.id,
            jobId: input.jobId
          }
        }
      })

      if (existing) {
        throw new GraphQLError('Already applied to this job')
      }

      const job = await prisma.job.findUnique({ where: { id: input.jobId } })
      if (!job || job.status !== 'active') {
        throw new GraphQLError('Job not available')
      }

      return prisma.application.create({
        data: {
          candidateId: candidate.id,
          jobId: input.jobId,
          coverLetter: input.coverLetter,
          source: input.source || 'direct',
          stage: 'new',
          appliedAt: new Date()
        },
        include: {
          job: { include: { client: { select: { companyName: true } } } },
          candidate: true
        }
      })
    },

    updateApplicationStage: async (_: any, { id, stage, notes }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      return prisma.application.update({
        where: { id },
        data: {
          stage,
          notes,
          stageUpdatedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          candidate: true,
          job: true
        }
      })
    },

    rejectApplication: async (_: any, { id, reason, notes }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      return prisma.application.update({
        where: { id },
        data: {
          stage: 'rejected',
          rejectionReason: reason,
          notes,
          stageUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      })
    },

    withdrawApplication: async (_: any, { id }: any, context: Context) => {
      const user = requireRole(context, 'candidate')

      const candidate = await prisma.candidate.findUnique({
        where: { userId: user.userId }
      })

      const application = await prisma.application.findUnique({
        where: { id }
      })

      if (!application || application.candidateId !== candidate?.id) {
        throw new GraphQLError('Application not found')
      }

      if (['hired', 'rejected', 'withdrawn'].includes(application.stage)) {
        throw new GraphQLError('Cannot withdraw this application')
      }

      return prisma.application.update({
        where: { id },
        data: {
          stage: 'withdrawn',
          stageUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      })
    },

    // Interviews
    scheduleInterview: async (_: any, args: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      const application = await prisma.application.findUnique({
        where: { id: args.applicationId }
      })

      if (!application) {
        throw new GraphQLError('Application not found')
      }

      return prisma.interview.create({
        data: {
          applicationId: args.applicationId,
          interviewType: args.interviewType,
          title: args.title || `${args.interviewType} Interview`,
          description: args.description,
          scheduledAt: new Date(args.scheduledAt),
          durationMinutes: args.durationMinutes || 60,
          meetingUrl: args.meetingUrl,
          status: 'scheduled'
        },
        include: {
          application: {
            include: {
              candidate: true,
              job: true
            }
          }
        }
      })
    },

    cancelInterview: async (_: any, { id, reason }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      return prisma.interview.update({
        where: { id },
        data: {
          status: 'cancelled',
          description: reason ? `Cancelled: ${reason}` : undefined,
          updatedAt: new Date()
        }
      })
    },

    submitInterviewFeedback: async (_: any, args: any, context: Context) => {
      const user = requireRole(context, 'client', 'admin')

      return prisma.interviewFeedback.create({
        data: {
          interviewId: args.interviewId,
          interviewerId: user.userId,
          overallRating: args.overallRating,
          recommendation: args.recommendation,
          strengths: args.strengths,
          concerns: args.concerns,
          notes: args.notes,
          submittedAt: new Date()
        }
      })
    },

    // Assessments
    sendAssessmentInvite: async (_: any, { applicationId, testId }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { candidate: true, job: true }
      })

      if (!application) {
        throw new GraphQLError('Application not found')
      }

      return prisma.assessment.create({
        data: {
          applicationId,
          candidateId: application.candidateId,
          jobId: application.jobId,
          imochaTestId: testId,
          status: 'invited',
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })
    },

    // AI Actions
    runAIScreening: async (_: any, { applicationId }: any, context: Context) => {
      requireRole(context, 'client', 'admin')

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          candidate: true,
          job: true
        }
      })

      if (!application) {
        throw new GraphQLError('Application not found')
      }

      // Mock AI screening result (would call actual AI service in production)
      const candidateSkills = application.candidate.skills || []
      const requiredSkills = application.job.skillsRequired || []
      const matchingSkills = candidateSkills.filter(s =>
        requiredSkills.some(rs => rs.toLowerCase() === s.toLowerCase())
      )

      const matchScore = requiredSkills.length > 0
        ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
        : 50

      const result = {
        matchScore,
        strengths: matchingSkills.length > 0
          ? [`Strong skills in: ${matchingSkills.join(', ')}`]
          : ['Shows initiative in applying'],
        concerns: requiredSkills.filter(s =>
          !candidateSkills.some(cs => cs.toLowerCase() === s.toLowerCase())
        ).length > 0
          ? [`Missing skills: ${requiredSkills.filter(s =>
              !candidateSkills.some(cs => cs.toLowerCase() === s.toLowerCase())
            ).slice(0, 3).join(', ')}`]
          : [],
        recommendation: matchScore >= 70 ? 'proceed' : matchScore >= 40 ? 'review' : 'reject',
        summary: `Candidate has ${matchScore}% skill match with ${application.candidate.experienceYears || 0} years of experience.`
      }

      // Update application with AI summary
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          matchScore: result.matchScore,
          aiSummary: result.summary
        }
      })

      // Log AI action
      await prisma.aIAction.create({
        data: {
          agentType: 'screening',
          actionType: 'candidate_screening',
          entityType: 'application',
          entityId: applicationId,
          inputPayload: {
            candidateId: application.candidateId,
            jobId: application.jobId
          },
          outputPayload: result,
          status: 'completed',
          executedAt: new Date()
        }
      })

      return result
    },

    approveAIAction: async (_: any, { id }: any, context: Context) => {
      const user = requireRole(context, 'admin')

      return prisma.aIAction.update({
        where: { id },
        data: {
          status: 'completed',
          approvedById: user.userId,
          approvedAt: new Date()
        }
      })
    },

    rejectAIAction: async (_: any, { id, reason }: any, context: Context) => {
      requireRole(context, 'admin')

      return prisma.aIAction.update({
        where: { id },
        data: {
          status: 'cancelled',
          errorMessage: reason
        }
      })
    },

    // Notifications
    markNotificationRead: async (_: any, { id }: any, context: Context) => {
      const user = requireAuth(context)

      const notification = await prisma.notification.findUnique({ where: { id } })
      if (notification?.userId !== user.userId) {
        throw new GraphQLError('Notification not found')
      }

      return prisma.notification.update({
        where: { id },
        data: { read: true, readAt: new Date() }
      })
    },

    markAllNotificationsRead: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context)

      const result = await prisma.notification.updateMany({
        where: { userId: user.userId, read: false },
        data: { read: true, readAt: new Date() }
      })

      return result.count
    },

    // Candidate Profile
    updateCandidateProfile: async (_: any, args: any, context: Context) => {
      const user = requireRole(context, 'candidate')

      const candidate = await prisma.candidate.findUnique({
        where: { userId: user.userId }
      })

      if (!candidate) {
        throw new GraphQLError('Profile not found')
      }

      const updateData: any = { updatedAt: new Date() }
      const allowedFields = [
        'firstName', 'lastName', 'headline', 'summary', 'location',
        'skills', 'linkedinUrl', 'githubUrl', 'portfolioUrl',
        'expectedSalaryMin', 'expectedSalaryMax', 'noticePeriodDays'
      ]

      for (const field of allowedFields) {
        if (args[field] !== undefined) {
          updateData[field] = args[field]
        }
      }

      return prisma.candidate.update({
        where: { id: candidate.id },
        data: updateData,
        include: {
          user: { select: { email: true } },
          skillBadges: {
            where: { expiresAt: { gt: new Date() } }
          }
        }
      })
    }
  },

  // Subscription stubs (would need WebSocket/PubSub implementation)
  Subscription: {
    applicationUpdated: {
      subscribe: () => {
        throw new GraphQLError('Subscriptions not yet implemented')
      }
    },
    newNotification: {
      subscribe: () => {
        throw new GraphQLError('Subscriptions not yet implemented')
      }
    },
    aiActionCompleted: {
      subscribe: () => {
        throw new GraphQLError('Subscriptions not yet implemented')
      }
    }
  }
}
