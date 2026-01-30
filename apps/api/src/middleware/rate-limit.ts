import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { incrementRateLimitHits } from './blocklist.js'
import { logSecurityEvent } from './security-logger.js'
import { Request } from 'express'

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req: Request, res, _next, options) => {
    incrementRateLimitHits()
    logSecurityEvent('rate_limit_hit', req, { tier: 'global', limit: 200 })
    res.status(429).json(options.message)
  },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  handler: (req: Request, res, _next, options) => {
    incrementRateLimitHits()
    logSecurityEvent('rate_limit_hit', req, { tier: 'auth', limit: 10 })
    res.status(429).json(options.message)
  },
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req: Request, res, _next, options) => {
    incrementRateLimitHits()
    logSecurityEvent('rate_limit_hit', req, { tier: 'api', limit: 100 })
    res.status(429).json(options.message)
  },
})

export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => (hits - 5) * 500,
})
