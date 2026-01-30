import { Request, Response, NextFunction } from 'express'

interface BlockEntry {
  blockedAt: number
  expiresAt: number
  reason: string
  manual: boolean
}

interface FailureRecord {
  count: number
  firstFailure: number
}

const FAILED_LOGIN_THRESHOLD = 20
const INVALID_TOKEN_THRESHOLD = 50
const TRACKING_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const BLOCK_DURATION_MS = 60 * 60 * 1000 // 1 hour

const blockedIPs = new Map<string, BlockEntry>()
const failedLogins = new Map<string, FailureRecord>()
const invalidTokens = new Map<string, FailureRecord>()

// Stats counters
let totalBlockEvents = 0
let totalFailedLogins = 0
let totalRateLimitHits = 0

function cleanExpired() {
  const now = Date.now()
  for (const [ip, entry] of blockedIPs) {
    if (entry.expiresAt <= now) {
      blockedIPs.delete(ip)
    }
  }
  for (const [ip, record] of failedLogins) {
    if (now - record.firstFailure > TRACKING_WINDOW_MS) {
      failedLogins.delete(ip)
    }
  }
  for (const [ip, record] of invalidTokens) {
    if (now - record.firstFailure > TRACKING_WINDOW_MS) {
      invalidTokens.delete(ip)
    }
  }
}

// Periodic cleanup every 5 minutes
setInterval(cleanExpired, 5 * 60 * 1000).unref()

export function checkBlocklist(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const entry = blockedIPs.get(ip)

  if (entry) {
    if (entry.expiresAt <= Date.now()) {
      blockedIPs.delete(ip)
    } else {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your IP has been temporarily blocked due to suspicious activity.',
      })
    }
  }

  next()
}

function recordFailure(
  tracker: Map<string, FailureRecord>,
  ip: string,
  threshold: number,
  reason: string
) {
  const now = Date.now()
  const record = tracker.get(ip)

  if (!record || now - record.firstFailure > TRACKING_WINDOW_MS) {
    tracker.set(ip, { count: 1, firstFailure: now })
    return
  }

  record.count++

  if (record.count >= threshold) {
    blockedIPs.set(ip, {
      blockedAt: now,
      expiresAt: now + BLOCK_DURATION_MS,
      reason,
      manual: false,
    })
    tracker.delete(ip)
    totalBlockEvents++
  }
}

export function recordFailedLogin(ip: string) {
  totalFailedLogins++
  recordFailure(failedLogins, ip, FAILED_LOGIN_THRESHOLD, 'excessive_failed_logins')
}

export function recordInvalidToken(ip: string) {
  recordFailure(invalidTokens, ip, INVALID_TOKEN_THRESHOLD, 'excessive_invalid_tokens')
}

export function incrementRateLimitHits() {
  totalRateLimitHits++
}

export function manualBlockIP(ip: string, reason: string = 'manual_block', durationMs: number = BLOCK_DURATION_MS) {
  blockedIPs.set(ip, {
    blockedAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    reason,
    manual: true,
  })
  totalBlockEvents++
}

export function unblockIP(ip: string): boolean {
  return blockedIPs.delete(ip)
}

export function getBlockedIPs() {
  cleanExpired()
  const entries: Array<{ ip: string } & BlockEntry> = []
  for (const [ip, entry] of blockedIPs) {
    entries.push({ ip, ...entry })
  }
  return entries
}

export function getSecurityStats() {
  cleanExpired()
  return {
    blockedIPCount: blockedIPs.size,
    totalBlockEvents,
    totalFailedLogins,
    totalRateLimitHits,
    trackedFailedLoginIPs: failedLogins.size,
    trackedInvalidTokenIPs: invalidTokens.size,
  }
}
