import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import dotenv from 'dotenv'
import prisma from './config/database.js'

// Route imports
import authRoutes from './routes/auth.routes.js'
import assessmentRoutes from './routes/assessment.routes.js'
import candidateRoutes from './routes/candidate.routes.js'
import jobRoutes from './routes/job.routes.js'
import applicationRoutes from './routes/application.routes.js'
import interviewRoutes from './routes/interview.routes.js'
import clientRoutes from './routes/client.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import aiRoutes from './routes/ai.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'

import { authenticateToken, AuthRequest } from './middleware/auth.js'

dotenv.config({ path: '../../.env' })

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(helmet())
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Auth routes (public)
app.use('/api/v1/auth', authRoutes)

// Assessment routes (iMocha integration)
app.use('/api/v1/assessments', assessmentRoutes)

// Candidate routes
app.use('/api/v1/candidates', candidateRoutes)

// Job routes
app.use('/api/v1/jobs', jobRoutes)

// Application routes
app.use('/api/v1/applications', applicationRoutes)

// Interview routes
app.use('/api/v1/interviews', interviewRoutes)

// Client routes
app.use('/api/v1/clients', clientRoutes)

// Notification routes
app.use('/api/v1/notifications', notificationRoutes)

// AI routes
app.use('/api/v1/ai', aiRoutes)

// Analytics routes
app.use('/api/v1/analytics', analyticsRoutes)

// Me routes (convenience endpoints for current user)
app.get('/api/v1/me/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (req.user.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId },
        include: {
          user: { select: { email: true } },
          applications: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  location: true,
                  client: { select: { companyName: true, companyLogoUrl: true } }
                }
              }
            },
            take: 10,
            orderBy: { appliedAt: 'desc' }
          },
          assessments: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          skillBadges: {
            where: { expiresAt: { gt: new Date() } },
            orderBy: { percentile: 'desc' }
          }
        }
      })

      if (!candidate) {
        return res.status(404).json({ error: 'Profile not found' })
      }

      return res.json({ profile: candidate })
    }

    if (req.user.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId },
        include: {
          client: true,
          user: { select: { email: true } }
        }
      })

      if (!clientUser) {
        return res.status(404).json({ error: 'Client profile not found' })
      }

      return res.json({
        profile: {
          ...clientUser.client,
          role: clientUser.role,
          email: clientUser.user.email
        }
      })
    }

    res.json({ profile: null })
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

app.put('/api/v1/me/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (req.user.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId }
      })

      if (!candidate) {
        return res.status(404).json({ error: 'Profile not found' })
      }

      const updated = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          ...req.body,
          updatedAt: new Date()
        },
        include: {
          user: { select: { email: true } },
          skillBadges: {
            where: { expiresAt: { gt: new Date() } }
          }
        }
      })

      return res.json({ profile: updated })
    }

    res.status(400).json({ error: 'Profile update not supported for this user type' })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`)
  console.log(`📚 Health: http://localhost:${PORT}/health`)
  console.log(`🔐 Auth endpoints ready`)
  console.log(`📋 Assessment/iMocha endpoints ready`)
  console.log(`👥 Candidate endpoints ready`)
  console.log(`💼 Job endpoints ready`)
  console.log(`📝 Application endpoints ready`)
  console.log(`📅 Interview endpoints ready`)
  console.log(`🏢 Client endpoints ready`)
  console.log(`🔔 Notification endpoints ready`)
  console.log(`🤖 AI endpoints ready`)
  console.log(`📊 Analytics endpoints ready`)
})
