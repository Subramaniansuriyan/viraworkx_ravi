import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { recordInvalidToken } from './blocklist.js'
import { logSecurityEvent } from './security-logger.js'

export interface JwtPayload {
  userId: string
  email: string
  userType: string
}

export interface AuthRequest extends Request {
  user?: JwtPayload
}

const JWT_SECRET = process.env.JWT_SECRET || 'viraworkx-dev-secret-change-in-production'

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = decoded
    next()
  } catch (error) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    if (error instanceof jwt.TokenExpiredError) {
      recordInvalidToken(ip)
      logSecurityEvent('invalid_token', req, { reason: 'expired' })
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    recordInvalidToken(ip)
    logSecurityEvent('invalid_token', req, { reason: 'invalid_signature' })
    return res.status(403).json({ error: 'Invalid token' })
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
      req.user = decoded
    } catch {
      // Token invalid, but continue without user
    }
  }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
