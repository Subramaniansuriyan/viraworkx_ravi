export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  priceIds: {
    startup: process.env.STRIPE_PRICE_STARTUP || '',
    growth: process.env.STRIPE_PRICE_GROWTH || '',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
  },
  planPricing: {
    startup: { amount: 49900, label: '$499/mo' },
    growth: { amount: 99900, label: '$999/mo' },
    enterprise: { amount: 249900, label: '$2,499/mo' },
  },
  trialDays: 0,
  currency: 'usd' as const,
}

export type PlanTier = 'startup' | 'growth' | 'enterprise'

export function isStripeConfigured(): boolean {
  return !!(stripeConfig.secretKey && stripeConfig.secretKey !== '')
}
