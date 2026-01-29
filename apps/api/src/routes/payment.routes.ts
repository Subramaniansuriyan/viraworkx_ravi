import { Router, Request, Response } from 'express'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'
import { stripeService } from '../services/stripe.service.js'
import prisma from '../config/database.js'

const router = Router()

// Stripe webhook - NO auth, uses raw body + signature verification
// Note: raw body parsing is configured in index.ts
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' })
    }

    await stripeService.handleWebhook(req.body, signature)
    res.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error.message)
    res.status(400).json({ error: error.message })
  }
})

// All routes below require authentication
router.use(authenticateToken)

// Helper to get clientId for the authenticated user
async function getClientId(req: AuthRequest): Promise<string | null> {
  if (!req.user) return null
  const clientUser = await prisma.clientUser.findFirst({
    where: { userId: req.user.userId },
  })
  return clientUser?.clientId || null
}

router.get('/subscription', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req)
    if (!clientId) return res.status(404).json({ error: 'Client not found' })

    const result = await stripeService.getSubscriptionStatus(clientId)
    res.json(result)
  } catch (error) {
    console.error('Error fetching subscription:', error)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

router.post('/checkout', requireRole('client'), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req)
    if (!clientId) return res.status(404).json({ error: 'Client not found' })

    const { planTier, returnUrl } = req.body
    if (!planTier) {
      return res.status(400).json({ error: 'planTier is required' })
    }

    const validTiers = ['startup', 'growth', 'enterprise']
    if (!validTiers.includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' })
    }

    const result = await stripeService.createCheckoutSession(
      clientId,
      planTier,
      returnUrl || 'http://localhost:3000/client/billing'
    )
    res.json(result)
  } catch (error: any) {
    console.error('Error creating checkout:', error)
    res.status(400).json({ error: error.message || 'Failed to create checkout session' })
  }
})

router.post('/billing-portal', requireRole('client'), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req)
    if (!clientId) return res.status(404).json({ error: 'Client not found' })

    const { returnUrl } = req.body
    const result = await stripeService.createBillingPortalSession(
      clientId,
      returnUrl || 'http://localhost:3000/client/billing'
    )
    res.json(result)
  } catch (error: any) {
    console.error('Error creating billing portal:', error)
    res.status(400).json({ error: error.message || 'Failed to open billing portal' })
  }
})

router.post('/change-plan', requireRole('client'), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req)
    if (!clientId) return res.status(404).json({ error: 'Client not found' })

    const { newTier } = req.body
    if (!newTier) {
      return res.status(400).json({ error: 'newTier is required' })
    }

    await stripeService.changePlan(clientId, newTier)
    res.json({ success: true, planTier: newTier })
  } catch (error: any) {
    console.error('Error changing plan:', error)
    res.status(400).json({ error: error.message || 'Failed to change plan' })
  }
})

router.post('/cancel', requireRole('client'), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req)
    if (!clientId) return res.status(404).json({ error: 'Client not found' })

    const atPeriodEnd = req.body.atPeriodEnd !== false // default true
    await stripeService.cancelSubscription(clientId, atPeriodEnd)
    res.json({ success: true, canceledAtPeriodEnd: atPeriodEnd })
  } catch (error: any) {
    console.error('Error canceling subscription:', error)
    res.status(400).json({ error: error.message || 'Failed to cancel subscription' })
  }
})

router.get('/invoices', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req)
    if (!clientId) return res.status(404).json({ error: 'Client not found' })

    const invoices = await stripeService.getInvoices(clientId)
    res.json({ invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

export default router
