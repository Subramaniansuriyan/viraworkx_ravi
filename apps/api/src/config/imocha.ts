export const imochaConfig = {
  baseUrl: process.env.IMOCHA_API_URL || 'https://api.imocha.io/v1',
  apiKey: process.env.IMOCHA_API_KEY || '',
  tenantId: process.env.IMOCHA_TENANT_ID || '',
  webhookSecret: process.env.IMOCHA_WEBHOOK_SECRET || '',
  defaultExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  proctoring: {
    enabled: true,
    strictMode: false,
    webcamRequired: true,
    screenShareRequired: false,
  },
  // Badge level thresholds based on percentile
  badgeLevels: {
    expert: 90,      // 90th percentile and above
    advanced: 75,    // 75-89th percentile
    intermediate: 50, // 50-74th percentile
    beginner: 0,     // Below 50th percentile
  }
}

export type BadgeLevel = 'expert' | 'advanced' | 'intermediate' | 'beginner'

export function getBadgeLevel(percentile: number): BadgeLevel {
  if (percentile >= imochaConfig.badgeLevels.expert) return 'expert'
  if (percentile >= imochaConfig.badgeLevels.advanced) return 'advanced'
  if (percentile >= imochaConfig.badgeLevels.intermediate) return 'intermediate'
  return 'beginner'
}
