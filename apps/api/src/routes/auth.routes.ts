import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authService } from '../services/auth.service.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { emailService } from '../services/email.service.js'
import { recordFailedLogin } from '../middleware/blocklist.js'
import { logSecurityEvent } from '../middleware/security-logger.js'

const router = Router()

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  userType: z.enum(['candidate', 'client']),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
}).refine(data => {
  if (data.userType === 'candidate') {
    return data.firstName && data.lastName
  }
  if (data.userType === 'client') {
    return data.companyName
  }
  return true
}, {
  message: 'Candidates require firstName and lastName. Clients require companyName.',
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Common disposable/throwaway email domains
const BLOCKED_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'spam4.me', 'yopmail.com', 'dispostable.com', 'trashmail.com', 'trashmail.me',
  'maildrop.cc', 'getairmail.com', 'filzmail.com', 'spamgourmet.com',
  'wegwerfmail.de', 'trash-mail.at', 'mytemp.email', 'fakeinbox.com',
  'tempr.email', 'discard.email', 'spamgourmet.net', 'spamgourmet.org',
  'tempinbox.com', 'spambox.us',
])

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? BLOCKED_DOMAINS.has(domain) : false
}

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body)

    // Block disposable email addresses
    if (isDisposableEmail(input.email)) {
      return res.status(400).json({
        error: 'Please use a valid work or personal email address. Disposable email addresses are not allowed.'
      })
    }

    const result = await authService.register(input)

    // Send welcome email (non-blocking)
    const userName = input.userType === 'candidate'
      ? `${input.firstName} ${input.lastName}`
      : input.companyName || 'there'

    emailService.sendWelcome(input.email, {
      userName,
      userType: input.userType
    }).catch(err => console.error('Failed to send welcome email:', err))

    res.status(201).json({
      message: 'Registration successful',
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      })
    }
    if (error instanceof Error) {
      if (error.message === 'Email already registered') {
        return res.status(409).json({ error: error.message })
      }
      return res.status(500).json({ error: error.message })
    }
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body)
    const result = await authService.login(input)

    res.json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      })
    }
    if (error instanceof Error) {
      if (error.message === 'Invalid email or password') {
        const ip = req.ip || req.socket.remoteAddress || 'unknown'
        recordFailedLogin(ip)
        logSecurityEvent('failed_login', req, { email: req.body?.email })
        return res.status(401).json({ error: error.message })
      }
      return res.status(500).json({ error: error.message })
    }
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' })
    }

    const tokens = await authService.refreshToken(refreshToken)

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message })
    }
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

// GET /api/v1/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const user = await authService.getMe(req.user.userId)
    res.json({ user })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to get user' })
  }
})

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }
    const appUrl = process.env.APP_URL || 'https://www.viraworkx.ai'
    await authService.forgotPassword(email.toLowerCase().trim(), appUrl)
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (error) {
    // Always return 200 to prevent email enumeration
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  }
})

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    await authService.resetPassword(token, password)
    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  // In a production app, you'd invalidate the refresh token here
  // For now, we just acknowledge the logout (client should clear tokens)
  res.json({ message: 'Logged out successfully' })
})

// PUT /api/v1/auth/password
router.put('/password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }

    await authService.updatePassword(req.user.userId, currentPassword, newPassword)
    res.json({ message: 'Password updated successfully' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({ error: error.message })
      }
      return res.status(500).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to update password' })
  }
})

export default router
