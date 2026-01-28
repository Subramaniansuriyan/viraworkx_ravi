export const imochaConfig = {
  baseUrl: process.env.IMOCHA_API_URL || 'https://api.imocha.io/v1',
  apiKey: process.env.IMOCHA_API_KEY || '',
  tenantId: process.env.IMOCHA_TENANT_ID || '',
  webhookSecret: process.env.IMOCHA_WEBHOOK_SECRET || '',
  defaultExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

  // Connection settings
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second

  // Proctoring settings
  proctoring: {
    enabled: true,
    strictMode: false,
    webcamRequired: true,
    screenShareRequired: false,
    identityVerification: false,
  },

  // Badge level thresholds based on percentile
  badgeLevels: {
    expert: 90,      // 90th percentile and above
    advanced: 75,    // 75-89th percentile
    intermediate: 50, // 50-74th percentile
    beginner: 0,     // Below 50th percentile
  },

  // Test categories for filtering
  testCategories: [
    'Frontend',
    'Backend',
    'Full Stack',
    'DevOps',
    'Data Science',
    'Mobile',
    'QA/Testing',
    'Database',
  ],

  // Webhook event types we handle
  webhookEvents: [
    'test.started',
    'test.completed',
    'test.expired',
    'test.cancelled',
    'proctoring.violation',
  ],
}

/**
 * Check if iMocha is configured for live API calls
 */
export function isIMochaConfigured(): boolean {
  return !!(imochaConfig.apiKey && imochaConfig.tenantId)
}

export type BadgeLevel = 'expert' | 'advanced' | 'intermediate' | 'beginner'

export function getBadgeLevel(percentile: number): BadgeLevel {
  if (percentile >= imochaConfig.badgeLevels.expert) return 'expert'
  if (percentile >= imochaConfig.badgeLevels.advanced) return 'advanced'
  if (percentile >= imochaConfig.badgeLevels.intermediate) return 'intermediate'
  return 'beginner'
}
