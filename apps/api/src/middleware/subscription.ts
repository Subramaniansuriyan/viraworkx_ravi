import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.js'
import prisma from '../config/database.js'

/**
 * Middleware that blocks client actions when subscription is not active.
 * Apply to routes that require an active subscription (job creation, pipeline access, AI features).
 * Does NOT block: billing, contract signing, viewing own subscription.
 */
export async function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Admins bypass subscription check
  if (req.user.userType === 'admin') {
    return next()
  }

  // Only enforce for client users
  if (req.user.userType !== 'client') {
    return next()
  }

  const clientUser = await prisma.clientUser.findFirst({
    where: { userId: req.user.userId },
  })

  if (!clientUser) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const subscription = await prisma.subscription.findUnique({
    where: { clientId: clientUser.clientId },
  })

  if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
    return res.status(403).json({
      error: 'Active subscription required',
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Please activate your subscription to access this feature.',
    })
  }

  next()
}
