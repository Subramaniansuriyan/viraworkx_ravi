export const imochaConfig = {
  baseUrl: process.env.IMOCHA_API_URL || 'https://apiv3.imocha.io/v3',
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

  // Tier level thresholds based on overall score percentage
  tierLevels: {
    tier1: 85,  // score > 85% → Tier 1 (85–100%)
    tier2: 70,  // score > 70% → Tier 2 (70–85%)
    tier3: 60,  // score > 60% → Tier 3 (60–70%)
    // < 60%: failed — no tier assigned
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
  return !!imochaConfig.apiKey
}

export type BadgeLevel = 'expert' | 'advanced' | 'intermediate' | 'beginner'

export type TierLevel = 'Tier 1' | 'Tier 2' | 'Tier 3'

export function getTierLevel(score: number, maxScore: number): TierLevel | null {
  const percentage = (score / maxScore) * 100
  if (percentage > imochaConfig.tierLevels.tier1) return 'Tier 1'
  if (percentage > imochaConfig.tierLevels.tier2) return 'Tier 2'
  if (percentage > imochaConfig.tierLevels.tier3) return 'Tier 3'
  return null
}

export function getBadgeLevel(percentile: number): BadgeLevel {
  if (percentile >= imochaConfig.badgeLevels.expert) return 'expert'
  if (percentile >= imochaConfig.badgeLevels.advanced) return 'advanced'
  if (percentile >= imochaConfig.badgeLevels.intermediate) return 'intermediate'
  return 'beginner'
}
