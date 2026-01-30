import { Redis } from 'ioredis'

export const SKIP_REDIS = process.env.SKIP_REDIS === 'true'

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10)

// Create Redis connection options
export const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db: REDIS_DB,
  maxRetriesPerRequest: null, // Required for BullMQ
}

// Create a Redis client for general use
let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (SKIP_REDIS) {
    throw new Error('Redis is disabled (SKIP_REDIS=true)')
  }
  if (!redisClient) {
    redisClient = new Redis(redisConnection)

    redisClient.on('connect', () => {
      console.log('Redis client connected')
    })

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err)
    })
  }
  return redisClient
}

// Close Redis connection gracefully
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
