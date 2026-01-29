import prisma from '../config/database.js'
import { stripeService } from './stripe.service.js'

interface GenerateContractInput {
  applicationId: string
  templateId: string
  terms?: {
    salary?: number
    startDate?: string
    duration?: string
    [key: string]: any
  }
}

interface SignContractInput {
  contractId: string
  userId: string
  signerRole: 'client' | 'candidate'
  signedName: string
  ipAddress?: string
  userAgent?: string
}

class ContractService {
  // ---- Template CRUD (admin) ----

  async createTemplate(data: {
    name: string
    description?: string
    content: string
    templateType: string
    planTier?: string
    createdBy?: string
  }) {
    return prisma.contractTemplate.create({ data })
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string
      description?: string
      content?: string
      templateType?: string
      planTier?: string
      isActive?: boolean
    }
  ) {
    return prisma.contractTemplate.update({
      where: { id },
      data,
    })
  }

  async getTemplates(filters?: { templateType?: string; isActive?: boolean }) {
    return prisma.contractTemplate.findMany({
      where: {
        ...(filters?.templateType && { templateType: filters.templateType }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getTemplateById(id: string) {
    return prisma.contractTemplate.findUnique({ where: { id } })
  }

  // ---- Contract lifecycle ----

  async generateContract(input: GenerateContractInput) {
    const template = await prisma.contractTemplate.findUnique({
      where: { id: input.templateId },
    })
    if (!template) throw new Error('Template not found')

    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: {
        candidate: {
          include: { user: { select: { id: true, email: true } } },
        },
        job: {
          include: { client: { include: { clientUsers: { where: { role: 'owner' }, take: 1 } } } },
        },
      },
    })
    if (!application) throw new Error('Application not found')

    const candidateUserId = application.candidate.userId
    const clientOwnerId = application.job.client.clientUsers[0]?.userId
    if (!clientOwnerId) throw new Error('Client has no owner user')

    // Render template placeholders
    const renderedContent = this.renderTemplate(template.content, {
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      companyName: application.job.client.companyName,
      jobTitle: application.job.title,
      salary: input.terms?.salary?.toString() || 'TBD',
      startDate: input.terms?.startDate || 'TBD',
      duration: input.terms?.duration || 'Indefinite',
      location: application.job.location || 'Remote',
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    })

    // Create contract + two empty signature records in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      const c = await tx.contract.create({
        data: {
          templateId: input.templateId,
          applicationId: input.applicationId,
          clientId: application.job.clientId,
          candidateId: application.candidateId,
          title: `${template.name} - ${application.candidate.firstName} ${application.candidate.lastName}`,
          content: renderedContent,
          status: 'draft',
          terms: input.terms || {},
        },
      })

      // Create signature placeholders for both parties
      await tx.contractSignature.createMany({
        data: [
          { contractId: c.id, userId: clientOwnerId, signerRole: 'client' },
          { contractId: c.id, userId: candidateUserId, signerRole: 'candidate' },
        ],
      })

      return c
    })

    return prisma.contract.findUnique({
      where: { id: contract.id },
      include: { signatures: true, template: true },
    })
  }

  async getContractById(id: string) {
    return prisma.contract.findUnique({
      where: { id },
      include: {
        signatures: {
          include: { user: { select: { id: true, email: true } } },
        },
        template: true,
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            job: {
              select: {
                title: true,
                client: { select: { companyName: true } },
              },
            },
          },
        },
      },
    })
  }

  async getContractsByClient(clientId: string) {
    return prisma.contract.findMany({
      where: { clientId },
      include: {
        signatures: true,
        template: { select: { name: true, templateType: true } },
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            job: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getContractsByCandidate(candidateId: string) {
    return prisma.contract.findMany({
      where: { candidateId },
      include: {
        signatures: true,
        template: { select: { name: true, templateType: true } },
        application: {
          include: {
            job: {
              select: {
                title: true,
                client: { select: { companyName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateContract(
    id: string,
    data: { content?: string; terms?: any; title?: string }
  ) {
    const contract = await prisma.contract.findUnique({ where: { id } })
    if (!contract) throw new Error('Contract not found')
    if (contract.status !== 'draft') {
      throw new Error('Can only update draft contracts')
    }

    return prisma.contract.update({
      where: { id },
      data,
      include: { signatures: true },
    })
  }

  async sendForSignatures(contractId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    })
    if (!contract) throw new Error('Contract not found')
    if (contract.status !== 'draft') {
      throw new Error('Contract must be in draft status')
    }

    return prisma.contract.update({
      where: { id: contractId },
      data: { status: 'pending_signatures' },
      include: { signatures: true },
    })
  }

  async signContract(input: SignContractInput) {
    const contract = await prisma.contract.findUnique({
      where: { id: input.contractId },
      include: { signatures: true },
    })

    if (!contract) throw new Error('Contract not found')
    if (contract.status !== 'pending_signatures') {
      throw new Error('Contract is not ready for signatures')
    }

    // Verify the signer matches the expected signature record
    const signatureRecord = contract.signatures.find(
      (s) => s.signerRole === input.signerRole && s.userId === input.userId
    )
    if (!signatureRecord) {
      throw new Error('You are not authorized to sign this contract')
    }
    if (signatureRecord.signedAt) {
      throw new Error('You have already signed this contract')
    }

    // Record the signature
    await prisma.contractSignature.update({
      where: { id: signatureRecord.id },
      data: {
        signedName: input.signedName,
        signedAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })

    // Check if both parties have signed
    const otherSignature = contract.signatures.find(
      (s) => s.signerRole !== input.signerRole
    )
    const allSigned = otherSignature?.signedAt != null

    if (allSigned) {
      await this.activateContract(input.contractId)
    }

    return prisma.contract.findUnique({
      where: { id: input.contractId },
      include: { signatures: true },
    })
  }

  private async activateContract(contractId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        application: {
          include: { job: true },
        },
      },
    })

    if (!contract) return

    // Activate contract
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'active',
        activatedAt: new Date(),
      },
    })

    // Trigger Stripe subscription creation
    try {
      // Look up the client's plan tier
      const client = await prisma.client.findUnique({
        where: { id: contract.clientId },
      })

      const tier = (client?.planTier || 'startup') as 'startup' | 'growth' | 'enterprise'

      // Check if subscription already exists
      const existingSub = await prisma.subscription.findUnique({
        where: { clientId: contract.clientId },
      })

      if (!existingSub || existingSub.status !== 'active') {
        await stripeService.createSubscription(contract.clientId, tier)
        console.log(
          `[ContractService] Subscription created for client ${contract.clientId} (${tier})`
        )
      }
    } catch (err) {
      console.error('[ContractService] Failed to create subscription after contract activation:', err)
    }
  }

  async terminateContract(contractId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    })
    if (!contract) throw new Error('Contract not found')
    if (contract.status !== 'active') {
      throw new Error('Can only terminate active contracts')
    }

    return prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'terminated',
        terminatedAt: new Date(),
      },
      include: { signatures: true },
    })
  }

  private renderTemplate(
    content: string,
    data: Record<string, string>
  ): string {
    let rendered = content
    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        value
      )
    }
    return rendered
  }
}

export const contractService = new ContractService()
