import prisma from '../config/database.js'
import { stripeService } from './stripe.service.js'
import { pdfService } from './pdf.service.js'

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
  signerRole: 'client' | 'viraworkx' | 'candidate'
  signedName: string
  signatureImage?: string // base64 PNG data URL (optional for candidates)
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

    const clientOwnerId = application.job.client.clientUsers[0]?.userId
    if (!clientOwnerId) throw new Error('Client has no owner user')

    // Determine ViraWorkx signer: env var or fallback to client owner
    const viraworkxSignerId = process.env.VIRAWORKX_SIGNER_USER_ID || clientOwnerId

    const candidateName = `${application.candidate.firstName} ${application.candidate.lastName}`
    const companyName = application.job.client.companyName
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Render template placeholders
    const renderedContent = this.renderTemplate(template.content, {
      candidateName,
      candidateEmail: application.candidate.user.email,
      companyName,
      jobTitle: application.job.title,
      salary: input.terms?.salary?.toString() || 'TBD',
      startDate: input.terms?.startDate || 'TBD',
      duration: input.terms?.duration || 'Indefinite',
      location: application.job.location || 'Remote',
      date: dateStr,
    })

    // Generate PDF from the rendered content
    const pdfBuffer = await pdfService.generateContractPdf({
      title: `${template.name} - ${candidateName}`,
      date: dateStr,
      companyName,
      candidateName,
      jobTitle: application.job.title,
      bodyText: renderedContent,
    })

    // Create contract + two empty signature records in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      const c = await tx.contract.create({
        data: {
          templateId: input.templateId,
          applicationId: input.applicationId,
          clientId: application.job.clientId,
          candidateId: application.candidateId,
          title: `${template.name} - ${candidateName}`,
          content: renderedContent,
          status: 'draft',
          terms: input.terms || {},
          pdfData: pdfBuffer,
        },
      })

      // Create signature placeholders for ViraWorkx, Client, and Candidate
      await tx.contractSignature.createMany({
        data: [
          { contractId: c.id, userId: viraworkxSignerId, signerRole: 'viraworkx' },
          { contractId: c.id, userId: clientOwnerId, signerRole: 'client' },
          { contractId: c.id, userId: application.candidate.user.id, signerRole: 'candidate' },
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
      include: {
        application: {
          include: { candidate: { select: { userId: true } } },
        },
      },
    })
    if (!contract) throw new Error('Contract not found')
    if (contract.status !== 'draft') {
      throw new Error('Contract must be in draft status')
    }

    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'pending_signatures' },
      include: { signatures: true },
    })

    // Notify the candidate in-app
    const candidateUserId = contract.application?.candidate?.userId
    if (candidateUserId) {
      await prisma.notification.create({
        data: {
          userId: candidateUserId,
          type: 'contract_ready',
          title: 'Contract ready to sign',
          message: 'Your ViraWorkx Talent Agreement is ready. Please review and sign it to proceed.',
          data: { contractId },
          channel: 'in_app',
        },
      })
    }

    return updated
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

    // Embed signature image into PDF if provided (required for client/admin, optional for candidate)
    const currentPdf = contract.pdfData
    if (!currentPdf) {
      throw new Error('Contract PDF not found')
    }

    const signedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let signatureImageBuffer: Buffer | undefined
    let pdfToStore: Buffer = Buffer.from(currentPdf)

    if (input.signatureImage) {
      const base64Data = input.signatureImage.replace(/^data:image\/png;base64,/, '')
      signatureImageBuffer = Buffer.from(base64Data, 'base64')
      pdfToStore = await pdfService.embedSignatureInPdf({
        existingPdfBytes: Buffer.from(currentPdf),
        signatureImagePng: signatureImageBuffer,
        signerRole: input.signerRole,
        signedName: input.signedName,
        signedDate,
      })
    }

    // Record the signature and update PDF
    await prisma.contractSignature.update({
      where: { id: signatureRecord.id },
      data: {
        signedName: input.signedName,
        ...(signatureImageBuffer && { signatureImage: signatureImageBuffer }),
        signedAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })

    // Update contract PDF
    await prisma.contract.update({
      where: { id: input.contractId },
      data: { pdfData: pdfToStore },
    })

    // Check if both parties have signed
    const otherSignature = contract.signatures.find(
      (s) => s.signerRole !== input.signerRole
    )
    const allSigned = otherSignature?.signedAt != null

    if (allSigned) {
      // Copy final PDF to pdfSignedData
      await prisma.contract.update({
        where: { id: input.contractId },
        data: { pdfSignedData: pdfToStore },
      })
      await this.activateContract(input.contractId)
    }

    return prisma.contract.findUnique({
      where: { id: input.contractId },
      include: { signatures: true },
    })
  }

  async getContractPdf(contractId: string): Promise<Buffer | null> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { pdfSignedData: true, pdfData: true },
    })
    if (!contract) return null

    // Return signed PDF if available, otherwise the current PDF
    const pdfBytes = contract.pdfSignedData || contract.pdfData
    if (!pdfBytes) return null

    return Buffer.from(pdfBytes)
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
