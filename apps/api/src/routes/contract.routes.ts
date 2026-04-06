import { Router } from 'express'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js'
import { contractService } from '../services/contract.service.js'
import prisma from '../config/database.js'

const router = Router()

// All routes require auth
router.use(authenticateToken)

// ---- Template routes (admin only) ----

router.get('/templates', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { templateType, isActive } = req.query
    const templates = await contractService.getTemplates({
      templateType: templateType as string | undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    })
    res.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})

router.get('/templates/:id', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const template = await contractService.getTemplateById(req.params.id)
    if (!template) return res.status(404).json({ error: 'Template not found' })
    res.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    res.status(500).json({ error: 'Failed to fetch template' })
  }
})

router.post('/templates', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, description, content, templateType, planTier } = req.body
    if (!name || !content || !templateType) {
      return res.status(400).json({ error: 'name, content, and templateType are required' })
    }
    const template = await contractService.createTemplate({
      name,
      description,
      content,
      templateType,
      planTier,
      createdBy: req.user?.userId,
    })
    res.status(201).json({ template })
  } catch (error) {
    console.error('Error creating template:', error)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

router.put('/templates/:id', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const template = await contractService.updateTemplate(req.params.id, req.body)
    res.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    res.status(500).json({ error: 'Failed to update template' })
  }
})

// ---- Contract routes ----

router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

    if (req.user.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({
        where: { userId: req.user.userId },
      })
      if (!clientUser) return res.status(404).json({ error: 'Client not found' })
      const contracts = await contractService.getContractsByClient(clientUser.clientId)
      return res.json({ contracts })
    }

    if (req.user.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: req.user.userId },
      })
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' })
      const contracts = await contractService.getContractsByCandidate(candidate.id)
      return res.json({ contracts })
    }

    if (req.user.userType === 'admin') {
      // Admin sees all contracts — include candidate directly as fallback
      const contracts = await prisma.contract.findMany({
        include: {
          signatures: true,
          template: { select: { name: true, templateType: true } },
          candidate: { select: { firstName: true, lastName: true } },
          application: {
            include: {
              candidate: { select: { firstName: true, lastName: true } },
              job: { select: { title: true, client: { select: { companyName: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return res.json({ contracts })
    }

    res.status(403).json({ error: 'Forbidden' })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    res.status(500).json({ error: 'Failed to fetch contracts' })
  }
})

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    const contract = await contractService.getContractById(req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })

    // Access control: candidates can only see their own contracts
    if (req.user.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({ where: { userId: req.user.userId } })
      if (!candidate || contract.candidateId !== candidate.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }
    // Clients can only see contracts belonging to their company
    if (req.user.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({ where: { userId: req.user.userId } })
      if (!clientUser || contract.clientId !== clientUser.clientId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    res.json({ contract })
  } catch (error) {
    console.error('Error fetching contract:', error)
    res.status(500).json({ error: 'Failed to fetch contract' })
  }
})

// PDF download endpoint
router.get('/:id/pdf', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

    // Access control: same as GET /:id
    const contract = await contractService.getContractById(req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })

    if (req.user.userType === 'candidate') {
      const candidate = await prisma.candidate.findUnique({ where: { userId: req.user.userId } })
      if (!candidate || contract.candidateId !== candidate.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }
    if (req.user.userType === 'client') {
      const clientUser = await prisma.clientUser.findFirst({ where: { userId: req.user.userId } })
      if (!clientUser || contract.clientId !== clientUser.clientId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const pdfBuffer = await contractService.getContractPdf(req.params.id)
    if (!pdfBuffer) {
      return res.status(404).json({ error: 'Contract PDF not found' })
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contract-${req.params.id}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'ETag': `"${Date.now()}"`,
    })
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error fetching contract PDF:', error)
    res.status(500).json({ error: 'Failed to fetch contract PDF' })
  }
})

router.post('/generate', requireRole('client', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { applicationId, templateId, terms } = req.body
    if (!applicationId || !templateId) {
      return res.status(400).json({ error: 'applicationId and templateId are required' })
    }
    const contract = await contractService.generateContract({
      applicationId,
      templateId,
      terms,
    })
    res.status(201).json({ contract })
  } catch (error: any) {
    console.error('Error generating contract:', error)
    res.status(400).json({ error: error.message || 'Failed to generate contract' })
  }
})

router.put('/:id', requireRole('client', 'admin'), async (req: AuthRequest, res) => {
  try {
    const contract = await contractService.updateContract(req.params.id, req.body)
    res.json({ contract })
  } catch (error: any) {
    console.error('Error updating contract:', error)
    res.status(400).json({ error: error.message || 'Failed to update contract' })
  }
})

router.post('/:id/send-for-signatures', requireRole('client', 'admin'), async (req: AuthRequest, res) => {
  try {
    const contract = await contractService.sendForSignatures(req.params.id)
    res.json({ contract })
  } catch (error: any) {
    console.error('Error sending for signatures:', error)
    res.status(400).json({ error: error.message || 'Failed to send for signatures' })
  }
})

router.post('/:id/sign', async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

    const { signedName, signatureImage } = req.body
    if (!signedName) {
      return res.status(400).json({ error: 'signedName is required' })
    }
    // signatureImage is optional for candidates (typed name is their signature)
    if (!signatureImage && req.user.userType !== 'candidate') {
      return res.status(400).json({ error: 'signatureImage is required' })
    }

    // Determine signer role from user type
    let signerRole: 'client' | 'viraworkx' | 'candidate'
    if (req.user.userType === 'client') {
      signerRole = 'client'
    } else if (req.user.userType === 'admin') {
      signerRole = 'viraworkx'
    } else if (req.user.userType === 'candidate') {
      signerRole = 'candidate'
    } else {
      return res.status(403).json({ error: 'Unauthorized to sign contracts' })
    }

    const contract = await contractService.signContract({
      contractId: req.params.id,
      userId: req.user.userId,
      signerRole,
      signedName,
      signatureImage,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.json({ contract })
  } catch (error: any) {
    console.error('Error signing contract:', error)
    res.status(400).json({ error: error.message || 'Failed to sign contract' })
  }
})

router.post('/:id/terminate', requireRole('client', 'admin'), async (req: AuthRequest, res) => {
  try {
    const contract = await contractService.terminateContract(req.params.id)
    res.json({ contract })
  } catch (error: any) {
    console.error('Error terminating contract:', error)
    res.status(400).json({ error: error.message || 'Failed to terminate contract' })
  }
})

export default router
