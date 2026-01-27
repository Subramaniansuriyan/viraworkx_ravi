import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

// Export commonly used environment variables
export const JWT_SECRET = process.env.JWT_SECRET || 'viraworkx-dev-secret-change-in-production'
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
export const DATABASE_URL = process.env.DATABASE_URL
export const PORT = process.env.PORT || 4000
