import Stripe from 'stripe'
import prisma from '../config/database.js'
import { stripeConfig, isStripeConfigured, PlanTier } from '../config/stripe.js'

class StripeService {
  private stripe: Stripe | null = null
  private mockMode: boolean

  constructor() {
    this.mockMode = !isStripeConfigured()
    if (!this.mockMode) {
      this.stripe = new Stripe(stripeConfig.secretKey)
    } else {
      console.log('[StripeService] Running in mock mode (no Stripe keys configured)')
    }
  }

  async getOrCreateCustomer(clientId: string): Promise<string> {
    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
    })

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        clientUsers: {
          where: { role: 'owner' },
          include: { user: { select: { email: true } } },
          take: 1,
        },
      },
    })

    if (!client) throw new Error('Client not found')

    let stripeCustomerId: string

    if (this.mockMode) {
      stripeCustomerId = `cus_mock_${clientId.slice(0, 8)}`
    } else {
      const customer = await this.stripe!.customers.create({
        name: client.companyName,
        email: client.clientUsers[0]?.user.email,
        metadata: { clientId },
      })
      stripeCustomerId = customer.id
    }

    await prisma.subscription.upsert({
      where: { clientId },
      create: {
        clientId,
        stripeCustomerId,
        planTier: client.planTier || 'startup',
        status: 'incomplete',
      },
      update: { stripeCustomerId },
    })

    return stripeCustomerId
  }

  async createSubscription(clientId: string, planTier: PlanTier): Promise<{
    subscriptionId: string
    status: string
  }> {
    const customerId = await this.getOrCreateCustomer(clientId)
    const priceId = stripeConfig.priceIds[planTier]

    if (this.mockMode) {
      const mockSubId = `sub_mock_${Date.now()}`
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await prisma.subscription.update({
        where: { clientId },
        data: {
          stripeSubscriptionId: mockSubId,
          stripePriceId: priceId || `price_mock_${planTier}`,
          planTier,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      })

      // Create mock payment record
      const sub = await prisma.subscription.findUnique({ where: { clientId } })
      if (sub) {
        await prisma.payment.create({
          data: {
            subscriptionId: sub.id,
            stripeInvoiceId: `inv_mock_${Date.now()}`,
            amount: stripeConfig.planPricing[planTier].amount,
            currency: stripeConfig.currency,
            status: 'paid',
            periodStart: now,
            periodEnd,
            paidAt: now,
          },
        })
      }

      return { subscriptionId: mockSubId, status: 'active' }
    }

    const subscription = await this.stripe!.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { clientId, planTier },
    })

    // In Stripe v20, period dates are on the first item
    const firstItem = subscription.items.data[0]

    await prisma.subscription.update({
      where: { clientId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        planTier,
        status: subscription.status,
        currentPeriodStart: firstItem ? new Date(firstItem.current_period_start * 1000) : undefined,
        currentPeriodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : undefined,
      },
    })

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
    }
  }

  async createCheckoutSession(
    clientId: string,
    planTier: PlanTier,
    returnUrl: string
  ): Promise<{ url: string }> {
    const customerId = await this.getOrCreateCustomer(clientId)
    const priceId = stripeConfig.priceIds[planTier]

    if (this.mockMode) {
      // In mock mode, directly create the subscription
      await this.createSubscription(clientId, planTier)
      return { url: `${returnUrl}?mock=true&plan=${planTier}` }
    }

    const session = await this.stripe!.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: { clientId, planTier },
    })

    return { url: session.url! }
  }

  async createBillingPortalSession(
    clientId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
    })

    if (!subscription?.stripeCustomerId) {
      throw new Error('No billing account found')
    }

    if (this.mockMode) {
      return { url: `${returnUrl}?portal=mock` }
    }

    const session = await this.stripe!.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    })

    return { url: session.url }
  }

  async cancelSubscription(
    clientId: string,
    atPeriodEnd: boolean = true
  ): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
    })

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription')
    }

    if (this.mockMode) {
      if (atPeriodEnd) {
        await prisma.subscription.update({
          where: { clientId },
          data: { cancelAtPeriodEnd: true },
        })
      } else {
        await prisma.subscription.update({
          where: { clientId },
          data: { status: 'canceled', cancelAtPeriodEnd: false },
        })
      }
      return
    }

    await this.stripe!.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    })

    await prisma.subscription.update({
      where: { clientId },
      data: { cancelAtPeriodEnd: atPeriodEnd },
    })
  }

  async changePlan(clientId: string, newTier: PlanTier): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
    })

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription')
    }

    const newPriceId = stripeConfig.priceIds[newTier]

    if (this.mockMode) {
      await prisma.subscription.update({
        where: { clientId },
        data: {
          planTier: newTier,
          stripePriceId: newPriceId || `price_mock_${newTier}`,
        },
      })
      return
    }

    const stripeSub = await this.stripe!.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    )

    await this.stripe!.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: stripeSub.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: { planTier: newTier },
    })

    await prisma.subscription.update({
      where: { clientId },
      data: {
        planTier: newTier,
        stripePriceId: newPriceId,
      },
    })
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string
  ): Promise<void> {
    if (this.mockMode) {
      console.log('[StripeService] Webhook received in mock mode, ignoring')
      return
    }

    let event: Stripe.Event
    try {
      event = this.stripe!.webhooks.constructEvent(
        rawBody,
        signature,
        stripeConfig.webhookSecret
      )
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${(err as Error).message}`)
    }

    switch (event.type) {
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    })

    if (!subscription) return

    await prisma.payment.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: (invoice as any).payment_intent
          ? String((invoice as any).payment_intent?.id || (invoice as any).payment_intent)
          : undefined,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        invoicePdf: invoice.invoice_pdf || undefined,
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
        paidAt: new Date(),
      },
      update: {
        status: 'paid',
        paidAt: new Date(),
      },
    })

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'active' },
    })
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    })

    if (!subscription) return

    await prisma.payment.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
      },
      update: { status: 'failed' },
    })

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due' },
    })
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: sub.id },
    })

    if (!subscription) return

    // In Stripe v20, period dates are on subscription items
    const firstItem = sub.items.data[0]

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: sub.status,
        currentPeriodStart: firstItem ? new Date(firstItem.current_period_start * 1000) : undefined,
        currentPeriodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : undefined,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    })
  }

  private async handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: sub.id },
    })

    if (!subscription) return

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'canceled' },
    })
  }

  async getSubscriptionStatus(clientId: string): Promise<{
    subscription: any
    planPricing: typeof stripeConfig.planPricing
  } | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    return {
      subscription,
      planPricing: stripeConfig.planPricing,
    }
  }

  async hasActiveSubscription(clientId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
    })

    return subscription?.status === 'active' || subscription?.status === 'trialing'
  }

  async getInvoices(clientId: string): Promise<any[]> {
    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
    })

    if (!subscription) return []

    return prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const stripeService = new StripeService()
