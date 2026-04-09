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
  companyWebsite?: string
  industry?: string
  contactRole?: string
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
  async register(input: RegisterInput): Promise<{ user: UserResponse; requiresVerification: true }> {
    const { email, password, userType, firstName, lastName, companyName, companyWebsite, industry } = input

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

    // If client, create client record and link via client_users
    if (userType === 'client' && companyName) {
      const client = await prisma.client.create({
        data: {
          companyName,
          ...(companyWebsite && { companyWebsite }),
          ...(industry && { industry }),
        }
      })
      await prisma.clientUser.create({
        data: {
          clientId: client.id,
          userId: user.id,
          role: 'owner',
        }
      })
    }

    // Send email verification (do not issue tokens until verified)
    await this.sendVerificationEmail(user.id, email, firstName || email.split('@')[0])

    return {
      user: this.formatUserResponse(user),
      requiresVerification: true,
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

    // Admin accounts must use a @viraworkx.ai email
    if (user.userType === 'admin' && !email.toLowerCase().endsWith('@viraworkx.ai')) {
      throw new Error('Invalid email or password')
    }

    // Verify password — guard against null hash (e.g. OAuth-only accounts)
    if (!user.passwordHash) {
      throw new Error('Invalid email or password')
    }
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }

    // Admin accounts bypass email verification
    // Enforce email verification for non-admin accounts created after 2026-03-18
    // Users registered before this date are grandfathered (auto-verified)
    if (!user.emailVerified && user.userType !== 'admin') {
      const grandfatherDate = new Date('2026-03-18T00:00:00Z')
      if (user.createdAt < grandfatherDate) {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
      } else {
        throw new Error('EMAIL_NOT_VERIFIED')
      }
    }

    const tokens = this.generateTokens(user.id, user.email, user.userType)

    return {
      user: this.formatUserResponse(user),
      tokens
    }
  }

  async verifyEmail(token: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    let decoded: { userId: string; email: string; purpose: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET + '-verify') as typeof decoded
    } catch {
      throw new Error('Invalid or expired verification link')
    }

    if (decoded.purpose !== 'email-verify') {
      throw new Error('Invalid verification token')
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        candidate: true,
        clientUsers: { include: { client: true }, take: 1 }
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })

    // Auto-enroll new candidates into the vetting pipeline
    if (user.userType === 'candidate' && user.candidate) {
      const activeJob = await prisma.job.findFirst({
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (activeJob) {
        await prisma.application.upsert({
          where: { candidateId_jobId: { candidateId: user.candidate.id, jobId: activeJob.id } },
          update: {},
          create: { candidateId: user.candidate.id, jobId: activeJob.id, stage: 'new' },
        })
      }
    }

    const tokens = this.generateTokens(user.id, user.email, user.userType)
    return { user: this.formatUserResponse(user), tokens }
  }

  async resendVerification(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.emailVerified) return // Silently ignore unknown/already-verified

    const firstName = (user as any).candidate?.firstName || email.split('@')[0]
    await this.sendVerificationEmail(user.id, email, firstName)
  }

  private async sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
    const appUrl = process.env.APP_URL || 'https://www.viraworkx.ai'
    const token = jwt.sign(
      { userId, email, purpose: 'email-verify' },
      JWT_SECRET + '-verify',
      { expiresIn: '24h' }
    )
    const verifyUrl = `${appUrl}/verify-email?token=${token}`
    const { emailService } = await import('./email.service.js')
    await emailService.sendEmailVerification(email, { userName: name, verifyUrl })
      .catch(err => console.error('Failed to send verification email:', err))
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

  async forgotPassword(email: string, appUrl: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } })
    // Always return silently — don't reveal if email exists
    if (!user) return

    const token = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password-reset' },
      JWT_SECRET + '-reset',
      { expiresIn: '1h' }
    )

    const resetUrl = `${appUrl}/reset-password?token=${token}`
    const userName = email.split('@')[0]

    const { emailService } = await import('./email.service.js')
    const sent = await emailService.sendPasswordReset(email, {
      userName,
      resetUrl,
      expiresIn: '1 hour',
    })
    if (!sent) {
      console.error(`Failed to send password reset email to ${email}`)
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let decoded: { userId: string; email: string; purpose: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET + '-reset') as typeof decoded
    } catch {
      throw new Error('Invalid or expired reset link')
    }

    if (decoded.purpose !== 'password-reset') {
      throw new Error('Invalid reset token')
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      throw new Error('User not found')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash }
    })
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

    if (user.userType === 'candidate' && user.candidate) {
      profile = {
        firstName: user.candidate.firstName,
        lastName: user.candidate.lastName,
      }
    } else if (user.userType === 'client' && user.clientUsers?.length > 0) {
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
