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

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)

    const whereJobs = targetClientId ? { clientId: targetClientId } : {}
    const whereApps = targetClientId ? { job: { clientId: targetClientId } } : {}

    // Get counts
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      totalInterviews,
      totalHires
    ] = await Promise.all([
      prisma.job.count({ where: whereJobs }),
      prisma.job.count({ where: { ...whereJobs, status: 'active' } }),
      prisma.application.count({ where: whereApps }),
      prisma.interview.count({ where: { application: whereApps } }),
      prisma.application.count({ where: { ...whereApps, stage: 'hired' } })
    ])

    // Calculate conversion rates
    const conversionRate = totalApplications > 0
      ? Math.round((totalHires / totalApplications) * 100)
      : 0

    res.json({
      totalJobs,
      activeJobs,
      totalApplications,
      totalInterviews,
      totalHires,
      conversionRate
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

    // Calculate cumulative conversion rates
    let cumulative = total
    const conversionRates = stageOrder.map(stage => {
      const count = stages.find(s => s.stage === stage)?._count.stage || 0
      const rate = total > 0 ? Math.round((count / total) * 100) : 0
      cumulative -= count
      return {
        stage,
        count,
        percentage: rate,
        cumulativeDropped: total - cumulative
      }
    })

    res.json({ conversionRates, total })
  } catch (error) {
    console.error('Error fetching conversion rates:', error)
    res.status(500).json({ error: 'Failed to fetch conversion rates' })
  }
})

export default router
