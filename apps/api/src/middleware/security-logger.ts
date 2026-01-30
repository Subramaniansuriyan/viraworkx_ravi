import { Request, Response, NextFunction } from 'express'

export type SecurityEvent =
  | 'failed_login'
  | 'rate_limit_hit'
  | 'ip_blocked'
  | 'ip_auto_blocked'
  | 'ip_unblocked'
  | 'invalid_token'
  | 'suspicious_path'

interface SecurityLogEntry {
  event: SecurityEvent
  ip: string | undefined
  path: string
  method: string
  userId?: string
  requestId?: string
  timestamp: string
  details?: Record<string, unknown>
}

export function logSecurityEvent(
  event: SecurityEvent,
  req: Request,
  details?: Record<string, unknown>,
  userId?: string
) {
  const entry: SecurityLogEntry = {
    event,
    ip: req.ip || req.socket.remoteAddress,
    path: req.originalUrl || req.url,
    method: req.method,
    userId,
    requestId: req.headers['x-request-id'] as string,
    timestamp: new Date().toISOString(),
    details,
  }
  console.log(JSON.stringify(entry))
}

const SUSPICIOUS_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /wp-admin/i,
  /wp-login/i,
  /phpinfo/i,
  /\.php$/i,
  /\/admin\/?$/i,
  /\/config\/?$/i,
  /\/backup/i,
  /\/\.well-known\/security\.txt/i,
]

export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const path = req.originalUrl || req.url

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(path)) {
      logSecurityEvent('suspicious_path', req, { pattern: pattern.source })
      break
    }
  }

  next()
}
