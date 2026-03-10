// Load environment variables FIRST before any other imports
import { JWT_SECRET, PORT } from './config/env.js'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import http from 'http'
import jwt from 'jsonwebtoken'
import prisma from './config/database.js'
import { typeDefs } from './graphql/schema/index.js'
import { resolvers } from './graphql/resolvers/index.js'
import { socketService } from './services/socket.service.js'
import { initializeWorkers, closeWorkers, scheduleRecurringJobs, getQueueStats } from './jobs/index.js'
import { closeAllQueues } from './jobs/queues.js'
import { closeRedisConnection, SKIP_REDIS } from './config/redis.js'

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
import contractRoutes from './routes/contract.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import userRoutes from './routes/users.routes.js'

import { authenticateToken, AuthRequest } from './middleware/auth.js'
import { requireActiveSubscription } from './middleware/subscription.js'

// Security middleware imports
import { requestId } from './middleware/request-id.js'
import { checkBlocklist, getBlockedIPs, manualBlockIP, unblockIP, getSecurityStats } from './middleware/blocklist.js'
import { globalLimiter, authLimiter, authSlowDown, apiLimiter } from './middleware/rate-limit.js'
import { securityLogger, logSecurityEvent } from './middleware/security-logger.js'

const app = express()
const startTime = Date.now()

// Trust proxy (Cloud Run / load balancers set X-Forwarded-For)
// Use 1 to trust the first proxy hop (Cloud Run's load balancer)
app.set('trust proxy', 1)

// 1. Request ID (first — traceability for all subsequent logs)
app.use(requestId)

// 2. Blocklist check (reject blocked IPs before any processing)
app.use(checkBlocklist)

// 3. Security headers
app.use(helmet())

// 4. CORS
const CORS_ORIGINS = [
  'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
  'http://localhost:5000', 'http://localhost:5173',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
]
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}))

// 5. Global rate limiter (disabled during development)
// app.use(globalLimiter)

// 6. Security logger (suspicious path detection)
app.use(securityLogger)

// 7. Request logging
app.use(morgan('dev'))

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '10mb' }))

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Health check (expanded with uptime and memory)
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage()
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
  })
})

// Job queue stats (for monitoring)
app.get('/api/v1/jobs/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    if (SKIP_REDIS) {
      return res.json({ stats: {}, message: 'Redis disabled (SKIP_REDIS=true)', timestamp: new Date().toISOString() })
    }
    const stats = await getQueueStats()
    res.json({ stats, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Error fetching queue stats:', error)
    res.status(500).json({ error: 'Failed to fetch queue stats' })
  }
})

// ── Admin security endpoints ──

app.get('/api/v1/admin/blocked-ips', authenticateToken, (req: AuthRequest, res) => {
  if (req.user?.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  res.json({ blockedIPs: getBlockedIPs() })
})

app.post('/api/v1/admin/blocked-ips', authenticateToken, (req: AuthRequest, res) => {
  if (req.user?.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  const { ip, reason, durationMs } = req.body
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' })
  }
  manualBlockIP(ip, reason || 'manual_block', durationMs)
  logSecurityEvent('ip_blocked', req, { blockedIP: ip, reason })
  res.status(201).json({ message: `IP ${ip} blocked`, blockedIPs: getBlockedIPs() })
})

app.delete('/api/v1/admin/blocked-ips/:ip', authenticateToken, (req: AuthRequest, res) => {
  if (req.user?.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  const { ip } = req.params
  const removed = unblockIP(ip)
  if (removed) {
    logSecurityEvent('ip_unblocked', req, { unblockedIP: ip })
  }
  res.json({ message: removed ? `IP ${ip} unblocked` : `IP ${ip} was not blocked` })
})

app.get('/api/v1/admin/security-stats', authenticateToken, (req: AuthRequest, res) => {
  if (req.user?.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  res.json({ stats: getSecurityStats(), timestamp: new Date().toISOString() })
})

// ── Auth routes (with auth-specific rate limiting + slow down) ──
app.use('/api/v1/auth', authRoutes)

// ── API routes (with API-tier rate limiting) ──

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

// AI routes (require active subscription for client users)
app.use('/api/v1/ai', authenticateToken, requireActiveSubscription, aiRoutes)

// Analytics routes
app.use('/api/v1/analytics', analyticsRoutes)

// Contract routes
app.use('/api/v1/contracts', contractRoutes)

// Payment routes
app.use('/api/v1/payments', paymentRoutes)

// User management routes (admin)
app.use('/api/v1/users', userRoutes)

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

// Error handler — sanitize in production
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  const isProduction = process.env.NODE_ENV === 'production'
  res.status(500).json({
    error: 'Internal Server Error',
    ...(isProduction ? {} : { message: err.message }),
  })
})

// Create HTTP server for Apollo and Socket.io
const httpServer = http.createServer(app)

// 30s request timeout
httpServer.setTimeout(30000)

// Initialize Socket.io
socketService.initialize(httpServer)

// GraphQL Context interface
interface GraphQLContext {
  user?: {
    userId: string
    email: string
    userType: string
  }
}

// Initialize Apollo Server
const isProduction = process.env.NODE_ENV === 'production'

const apolloServer = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  introspection: !isProduction, // Disable introspection in production
})

// Start server function
async function startServer() {
  // Initialize job workers (skip if Redis is disabled)
  if (!SKIP_REDIS) {
    initializeWorkers()
    await scheduleRecurringJobs()
    console.log('Background job workers initialized')
  } else {
    console.log('Skipping BullMQ workers (SKIP_REDIS=true)')
  }

  // Start Apollo Server
  await apolloServer.start()

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: CORS_ORIGINS,
      credentials: true
    }),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<GraphQLContext> => {
        // Extract JWT token from Authorization header
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {}
        }

        const token = authHeader.slice(7)
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any

          return {
            user: {
              userId: decoded.userId,
              email: decoded.email,
              userType: decoded.userType
            }
          }
        } catch {
          // Invalid token - return empty context (unauthenticated)
          return {}
        }
      }
    })
  )

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...')
    if (!SKIP_REDIS) {
      await closeWorkers()
      await closeAllQueues()
      await closeRedisConnection()
    }
    await apolloServer.stop()
    await prisma.$disconnect()
    console.log('Graceful shutdown complete')
    process.exit(0)
  })

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`)
    console.log(`Health: http://localhost:${PORT}/health`)
    console.log(`GraphQL: http://localhost:${PORT}/graphql`)
    console.log(`WebSocket: ws://localhost:${PORT} (Socket.io)`)
    console.log(`Security middleware active: rate-limit, blocklist, request-id, security-logger`)
    if (isProduction) {
      console.log('Production mode: GraphQL introspection disabled, error stacks hidden')
    }
  })
}

// Start the server
startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
