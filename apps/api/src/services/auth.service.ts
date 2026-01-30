import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'viraworkx-dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'

export interface RegisterInput {
  email: string
  password: string
  userType: 'candidate' | 'client'
  firstName?: string
  lastName?: string
  companyName?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface UserResponse {
  id: string
  email: string
  userType: string
  profile?: {
    firstName?: string
    lastName?: string
    companyName?: string
  }
}

class AuthService {
  async register(input: RegisterInput): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const { email, password, userType, firstName, lastName, companyName } = input

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new Error('Email already registered')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        userType,
        ...(userType === 'candidate' && firstName && lastName ? {
          candidate: {
            create: {
              firstName,
              lastName,
            }
          }
        } : {})
      },
      include: {
        candidate: true,
      }
    })

    // If client, create client record separately (since schema doesn't have direct relation)
    if (userType === 'client' && companyName) {
      await prisma.client.create({
        data: {
          companyName,
        }
      })
    }

    const tokens = this.generateTokens(user.id, user.email, user.userType)

    return {
      user: this.formatUserResponse(user),
      tokens
    }
  }

  async login(input: LoginInput): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const { email, password } = input

    // Find user with profile data (candidate or client)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        candidate: true,
        clientUsers: {
          include: { client: true },
          take: 1
        }
      }
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }

    const tokens = this.generateTokens(user.id, user.email, user.userType)

    return {
      user: this.formatUserResponse(user),
      tokens
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET + '-refresh') as {
        userId: string
        email: string
        userType: string
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
      if (!user) {
        throw new Error('User not found')
      }

      return this.generateTokens(user.id, user.email, user.userType)
    } catch {
      throw new Error('Invalid refresh token')
    }
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        candidate: true,
        clientUsers: {
          include: { client: true },
          take: 1
        }
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    return this.formatUserResponse(user)
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('User not found')
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })
  }

  private generateTokens(userId: string, email: string, userType: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId, email, userType },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    )

    const refreshToken = jwt.sign(
      { userId, email, userType },
      JWT_SECRET + '-refresh',
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    )

    // Parse expiry for response
    const expiresIn = this.parseExpiry(JWT_EXPIRES_IN)

    return { accessToken, refreshToken, expiresIn }
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/)
    if (!match) return 7 * 24 * 60 * 60 // default 7 days in seconds

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 60 * 60
      case 'd': return value * 24 * 60 * 60
      default: return 7 * 24 * 60 * 60
    }
  }

  private formatUserResponse(user: any): UserResponse {
    let profile: UserResponse['profile'] = undefined

    if (user.candidate) {
      profile = {
        firstName: user.candidate.firstName,
        lastName: user.candidate.lastName,
      }
    } else if (user.clientUsers?.length > 0) {
      profile = {
        companyName: user.clientUsers[0].client.companyName,
      }
    }

    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      profile
    }
  }
}

export const authService = new AuthService()
