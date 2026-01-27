import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/env.js'

// Types
interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string
    email: string
    userType: string
  }
}

interface JwtPayload {
  userId: string
  email: string
  userType: string
}

// Event types for type safety
export interface ServerToClientEvents {
  // Application events
  'application:created': (data: { applicationId: string; jobId: string; candidateId: string }) => void
  'application:updated': (data: { applicationId: string; stage: string; previousStage: string }) => void
  'application:rejected': (data: { applicationId: string; reason?: string }) => void

  // Interview events
  'interview:scheduled': (data: { interviewId: string; applicationId: string; scheduledAt: string }) => void
  'interview:updated': (data: { interviewId: string; status: string }) => void
  'interview:reminder': (data: { interviewId: string; minutesUntil: number }) => void

  // Assessment events
  'assessment:invited': (data: { assessmentId: string; applicationId: string; testId: string }) => void
  'assessment:started': (data: { assessmentId: string; candidateId: string }) => void
  'assessment:completed': (data: { assessmentId: string; score: number; maxScore: number }) => void

  // Notification events
  'notification:new': (data: { id: string; type: string; title: string; message: string }) => void

  // AI events
  'ai:action:pending': (data: { actionId: string; agentType: string; actionType: string }) => void
  'ai:action:completed': (data: { actionId: string; status: string; result: any }) => void

  // Job events
  'job:new_application': (data: { jobId: string; applicationCount: number }) => void
  'job:status_changed': (data: { jobId: string; status: string }) => void

  // General events
  'error': (data: { message: string; code?: string }) => void
  'connected': (data: { userId: string; userType: string }) => void
}

export interface ClientToServerEvents {
  // Room subscriptions
  'subscribe:job': (jobId: string) => void
  'unsubscribe:job': (jobId: string) => void
  'subscribe:application': (applicationId: string) => void
  'unsubscribe:application': (applicationId: string) => void

  // Typing indicators (for chat features)
  'typing:start': (data: { roomId: string }) => void
  'typing:stop': (data: { roomId: string }) => void
}

class SocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null
  private userSockets: Map<string, Set<string>> = new Map() // userId -> Set of socket IDs

  initialize(httpServer: HttpServer): Server {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return next(new Error('Authentication required'))
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
        socket.user = {
          userId: decoded.userId,
          email: decoded.email,
          userType: decoded.userType
        }
        next()
      } catch (err) {
        next(new Error('Invalid token'))
      }
    })

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const user = socket.user!
      console.log(`Socket connected: ${user.email} (${socket.id})`)

      // Track user's sockets
      if (!this.userSockets.has(user.userId)) {
        this.userSockets.set(user.userId, new Set())
      }
      this.userSockets.get(user.userId)!.add(socket.id)

      // Join user's personal room
      socket.join(`user:${user.userId}`)

      // Join role-based room
      socket.join(`role:${user.userType}`)

      // Send connected confirmation
      socket.emit('connected', {
        userId: user.userId,
        userType: user.userType
      })

      // Handle room subscriptions
      this.setupRoomHandlers(socket)

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${user.email} (${socket.id})`)
        this.userSockets.get(user.userId)?.delete(socket.id)
        if (this.userSockets.get(user.userId)?.size === 0) {
          this.userSockets.delete(user.userId)
        }
      })
    })

    console.log('Socket.io initialized')
    return this.io
  }

  private setupRoomHandlers(socket: AuthenticatedSocket): void {
    const user = socket.user!

    // Subscribe to job updates (for clients/admins watching applications)
    socket.on('subscribe:job', (jobId: string) => {
      if (user.userType === 'client' || user.userType === 'admin') {
        socket.join(`job:${jobId}`)
        console.log(`${user.email} subscribed to job:${jobId}`)
      }
    })

    socket.on('unsubscribe:job', (jobId: string) => {
      socket.leave(`job:${jobId}`)
    })

    // Subscribe to application updates (for candidates tracking their applications)
    socket.on('subscribe:application', (applicationId: string) => {
      socket.join(`application:${applicationId}`)
      console.log(`${user.email} subscribed to application:${applicationId}`)
    })

    socket.on('unsubscribe:application', (applicationId: string) => {
      socket.leave(`application:${applicationId}`)
    })
  }

  // Emit to specific user
  emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
    this.io?.to(`user:${userId}`).emit(event, data)
  }

  // Emit to all users of a specific role
  emitToRole(role: string, event: keyof ServerToClientEvents, data: any): void {
    this.io?.to(`role:${role}`).emit(event, data)
  }

  // Emit to a specific room (job, application, etc.)
  emitToRoom(room: string, event: keyof ServerToClientEvents, data: any): void {
    this.io?.to(room).emit(event, data)
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
  }

  // Get online user count
  getOnlineUserCount(): number {
    return this.userSockets.size
  }

  // Application events
  notifyApplicationCreated(applicationId: string, jobId: string, candidateId: string, candidateUserId: string): void {
    // Notify the job room (clients watching this job)
    this.emitToRoom(`job:${jobId}`, 'application:created', {
      applicationId,
      jobId,
      candidateId
    })

    // Notify admins
    this.emitToRole('admin', 'application:created', {
      applicationId,
      jobId,
      candidateId
    })

    // Update application count for job watchers
    this.emitToRoom(`job:${jobId}`, 'job:new_application', {
      jobId,
      applicationCount: -1 // Frontend should fetch actual count
    })
  }

  notifyApplicationUpdated(applicationId: string, stage: string, previousStage: string, candidateUserId: string): void {
    // Notify the candidate
    this.emitToUser(candidateUserId, 'application:updated', {
      applicationId,
      stage,
      previousStage
    })

    // Notify application room watchers
    this.emitToRoom(`application:${applicationId}`, 'application:updated', {
      applicationId,
      stage,
      previousStage
    })
  }

  notifyApplicationRejected(applicationId: string, candidateUserId: string, reason?: string): void {
    this.emitToUser(candidateUserId, 'application:rejected', {
      applicationId,
      reason
    })

    this.emitToRoom(`application:${applicationId}`, 'application:rejected', {
      applicationId,
      reason
    })
  }

  // Interview events
  notifyInterviewScheduled(interviewId: string, applicationId: string, scheduledAt: string, candidateUserId: string): void {
    this.emitToUser(candidateUserId, 'interview:scheduled', {
      interviewId,
      applicationId,
      scheduledAt
    })

    this.emitToRoom(`application:${applicationId}`, 'interview:scheduled', {
      interviewId,
      applicationId,
      scheduledAt
    })
  }

  notifyInterviewUpdated(interviewId: string, status: string, participantUserIds: string[]): void {
    participantUserIds.forEach(userId => {
      this.emitToUser(userId, 'interview:updated', {
        interviewId,
        status
      })
    })
  }

  // Assessment events
  notifyAssessmentInvited(assessmentId: string, applicationId: string, testId: string, candidateUserId: string): void {
    this.emitToUser(candidateUserId, 'assessment:invited', {
      assessmentId,
      applicationId,
      testId
    })
  }

  notifyAssessmentCompleted(assessmentId: string, candidateId: string, score: number, maxScore: number, jobId: string): void {
    // Notify job watchers (clients/admins)
    this.emitToRoom(`job:${jobId}`, 'assessment:completed', {
      assessmentId,
      score,
      maxScore
    })
  }

  // Notification events
  sendNotification(userId: string, notification: { id: string; type: string; title: string; message: string }): void {
    this.emitToUser(userId, 'notification:new', notification)
  }

  // AI events
  notifyAIActionPending(actionId: string, agentType: string, actionType: string): void {
    this.emitToRole('admin', 'ai:action:pending', {
      actionId,
      agentType,
      actionType
    })
  }

  notifyAIActionCompleted(actionId: string, status: string, result: any): void {
    this.emitToRole('admin', 'ai:action:completed', {
      actionId,
      status,
      result
    })
  }

  // Job events
  notifyJobStatusChanged(jobId: string, status: string): void {
    this.emitToRoom(`job:${jobId}`, 'job:status_changed', {
      jobId,
      status
    })
  }
}

// Export singleton instance
export const socketService = new SocketService()
