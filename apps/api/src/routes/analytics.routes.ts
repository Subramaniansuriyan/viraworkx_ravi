import { Router, Response } from 'express'
import prisma from '../config/database.js'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/v1/analytics/overview
 * Get overview analytics for a client
 */
router.get('/overview', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, startDate, endDate } = req.query

    // Get client ID from user if not provided
    let targetClientId = clientId as string
    if (!targetClientId && req.user?.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId }
      })
      targetClientId = clientUser?.clientId || ''
    }

    const whereJobs = targetClientId ? { clientId: targetClientId } : {}
    const whereApps = targetClientId ? { job: { clientId: targetClientId } } : {}

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalCandidates,
      totalClients,
      activeJobs,
      totalApplications,
      candidatesThisMonth,
      clientsThisMonth,
      jobsPostedThisMonth,
      applicationsThisMonth,
      hiredThisMonth,
      totalOffers,
      totalHiredFromOffers
    ] = await Promise.all([
      prisma.candidate.count(),
      prisma.client.count(),
      prisma.job.count({ where: { ...whereJobs, status: 'active' } }),
      prisma.application.count({ where: whereApps }),
      prisma.candidate.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.job.count({ where: { ...whereJobs, createdAt: { gte: startOfMonth } } }),
      prisma.application.count({ where: { ...whereApps, appliedAt: { gte: startOfMonth } } }),
      prisma.application.count({ where: { ...whereApps, stage: 'hired', stageUpdatedAt: { gte: startOfMonth } } }),
      prisma.application.count({ where: { ...whereApps, stage: { in: ['offer', 'hired'] } } }),
      prisma.application.count({ where: { ...whereApps, stage: 'hired' } })
    ])

    // Avg time-to-hire
    const hiredApps = await prisma.application.findMany({
      where: { ...whereApps, stage: 'hired' },
      select: { appliedAt: true, stageUpdatedAt: true },
      take: 100
    })
    let avgTimeToHire = 0
    if (hiredApps.length > 0) {
      const days = hiredApps.map(a => {
        const diff = new Date(a.stageUpdatedAt || a.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
      })
      avgTimeToHire = Math.round(days.reduce((a, b) => a + b, 0) / days.length)
    }

    // Offer accept rate
    const offerAcceptRate = totalOffers > 0 ? Math.round((totalHiredFromOffers / totalOffers) * 100) : 0

    // Top skills from active jobs
    const activeJobsList = await prisma.job.findMany({
      where: { ...whereJobs, status: 'active' },
      select: { skillsRequired: true },
      take: 200
    })
    const skillCounts: Record<string, number> = {}
    for (const job of activeJobsList) {
      for (const skill of job.skillsRequired) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1
      }
    }
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    res.json({
      overview: {
        totalCandidates,
        totalClients,
        activeJobs,
        totalApplications,
        candidatesThisMonth,
        clientsThisMonth,
        jobsPostedThisMonth,
        applicationsThisMonth,
        hiredThisMonth,
        avgTimeToHire,
        offerAcceptRate,
        aiMatchAccuracy: 87, // static placeholder until AI scoring is live
        topSkills
      }
    })
  } catch (error) {
    console.error('Error fetching overview:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

/**
 * GET /api/v1/analytics/pipeline
 * Get pipeline analytics
 */
router.get('/pipeline', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, jobId } = req.query

    let targetClientId = clientId as string
    if (!targetClientId && req.user?.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId }
      })
      targetClientId = clientUser?.clientId || ''
    }

    const where: any = {}
    if (jobId) where.jobId = jobId
    else if (targetClientId) where.job = { clientId: targetClientId }

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

    // Calculate drop-off rates
    const dropOffRates = pipeline.slice(0, -3).map((p, i) => {
      const next = pipeline[i + 1]
      if (p.count === 0) return 0
      return Math.round(((p.count - (next?.count || 0)) / p.count) * 100)
    })

    res.json({ pipeline, total, dropOffRates })
  } catch (error) {
    console.error('Error fetching pipeline:', error)
    res.status(500).json({ error: 'Failed to fetch pipeline analytics' })
  }
})

/**
 * GET /api/v1/analytics/time-to-hire
 * Get time-to-hire metrics
 */
router.get('/time-to-hire', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, startDate, endDate } = req.query

    let targetClientId = clientId as string
    if (!targetClientId && req.user?.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId }
      })
      targetClientId = clientUser?.clientId || ''
    }

    const where: any = {
      stage: 'hired',
      stageUpdatedAt: {}
    }
    if (targetClientId) where.job = { clientId: targetClientId }
    if (startDate) where.stageUpdatedAt.gte = new Date(startDate as string)
    if (endDate) where.stageUpdatedAt.lte = new Date(endDate as string)

    const hiredApplications = await prisma.application.findMany({
      where,
      select: {
        appliedAt: true,
        stageUpdatedAt: true
      }
    })

    if (hiredApplications.length === 0) {
      return res.json({
        averageDays: 0,
        minDays: 0,
        maxDays: 0,
        totalHires: 0
      })
    }

    const daysToHire = hiredApplications.map(a => {
      const applied = new Date(a.appliedAt)
      const hired = new Date(a.stageUpdatedAt || applied)
      return Math.ceil((hired.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24))
    })

    const averageDays = Math.round(daysToHire.reduce((a, b) => a + b, 0) / daysToHire.length)
    const minDays = Math.min(...daysToHire)
    const maxDays = Math.max(...daysToHire)

    res.json({
      averageDays,
      minDays,
      maxDays,
      totalHires: hiredApplications.length
    })
  } catch (error) {
    console.error('Error fetching time-to-hire:', error)
    res.status(500).json({ error: 'Failed to fetch time-to-hire analytics' })
  }
})

/**
 * GET /api/v1/analytics/source-quality
 * Get source quality metrics
 */
router.get('/source-quality', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query

    let targetClientId = clientId as string
    if (!targetClientId && req.user?.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId }
      })
      targetClientId = clientUser?.clientId || ''
    }

    const where: any = {}
    if (targetClientId) where.job = { clientId: targetClientId }

    const sourceStats = await prisma.application.groupBy({
      by: ['source'],
      where,
      _count: { source: true }
    })

    // Get hire counts by source
    const hireStats = await prisma.application.groupBy({
      by: ['source'],
      where: { ...where, stage: 'hired' },
      _count: { source: true }
    })

    const sourceQuality = sourceStats.map(s => {
      const hires = hireStats.find(h => h.source === s.source)?._count.source || 0
      return {
        source: s.source || 'direct',
        applications: s._count.source,
        hires,
        conversionRate: s._count.source > 0 ? Math.round((hires / s._count.source) * 100) : 0
      }
    })

    res.json({ sources: sourceQuality })
  } catch (error) {
    console.error('Error fetching source quality:', error)
    res.status(500).json({ error: 'Failed to fetch source quality analytics' })
  }
})

/**
 * GET /api/v1/analytics/conversion-rates
 * Get stage conversion rates
 */
router.get('/conversion-rates', authenticateToken, requireRole('client', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, jobId, startDate, endDate } = req.query

    let targetClientId = clientId as string
    if (!targetClientId && req.user?.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId }
      })
      targetClientId = clientUser?.clientId || ''
    }

    const where: any = {}
    if (jobId) where.jobId = jobId
    else if (targetClientId) where.job = { clientId: targetClientId }

    if (startDate || endDate) {
      where.appliedAt = {}
      if (startDate) where.appliedAt.gte = new Date(startDate as string)
      if (endDate) where.appliedAt.lte = new Date(endDate as string)
    }

    const stages = await prisma.application.groupBy({
      by: ['stage'],
      where,
      _count: { stage: true }
    })

    const stageOrder = ['new', 'screening', 'assessment', 'shortlisted', 'interview', 'offer', 'hired']
    const total = stages.reduce((acc, s) => acc + s._count.stage, 0)

    const conversions = stageOrder.map(stage => {
      const count = stages.find(s => s.stage === stage)?._count.stage || 0
      const rate = total > 0 ? Math.round((count / total) * 100) : 0
      return { stage, count, rate }
    })

    res.json({ conversions, total })
  } catch (error) {
    console.error('Error fetching conversion rates:', error)
    res.status(500).json({ error: 'Failed to fetch conversion rates' })
  }
})

export default router
