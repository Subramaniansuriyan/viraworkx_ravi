import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface GenerateContractPdfParams {
  title: string
  date: string
  companyName: string
  candidateName: string
  jobTitle: string
  bodyText: string
}

interface EmbedSignatureParams {
  existingPdfBytes: Buffer
  signatureImagePng: Buffer
  signerRole: 'viraworkx' | 'client'
  signedName: string
  signedDate: string
}

class PdfService {
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  private wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    const lines: string[] = []
    const paragraphs = text.split('\n')

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push('')
        continue
      }

      const words = paragraph.split(/\s+/)
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }

      if (currentLine) {
        lines.push(currentLine)
      }
    }

    return lines
  }

  async generateContractPdf(params: GenerateContractPdfParams): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageWidth = 595.28 // A4
    const pageHeight = 841.89
    const margin = 60
    const contentWidth = pageWidth - margin * 2
    const lineHeight = 16
    const bodyFontSize = 10
    const titleFontSize = 18
    const headerFontSize = 12
    const signatureBlockHeight = 200

    const plainText = this.stripHtml(params.bodyText)
    const bodyLines = this.wrapText(plainText, contentWidth, helvetica, bodyFontSize)

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    // -- Header --
    currentPage.drawText(params.title, {
      x: margin, y, size: titleFontSize, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
    })
    y -= 28

    const headerLines = [
      `Date: ${params.date}`,
      `Company: ${params.companyName}`,
      `Candidate: ${params.candidateName}`,
      `Position: ${params.jobTitle}`,
    ]
    for (const line of headerLines) {
      currentPage.drawText(line, {
        x: margin, y, size: bodyFontSize, font: helvetica, color: rgb(0.3, 0.3, 0.3),
      })
      y -= 18
    }
    y -= 12

    currentPage.drawLine({
      start: { x: margin, y }, end: { x: pageWidth - margin, y },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    })
    y -= 20

    // -- Body text --
    for (const line of bodyLines) {
      if (y < margin + 20) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      if (line === '') {
        y -= lineHeight * 0.5
        continue
      }
      currentPage.drawText(line, {
        x: margin, y, size: bodyFontSize, font: helvetica, color: rgb(0.15, 0.15, 0.15),
      })
      y -= lineHeight
    }

    // -- Signature blocks --
    if (y < margin + signatureBlockHeight) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }

    y -= 30
    const yHr = y // Store for metadata

    currentPage.drawLine({
      start: { x: margin, y }, end: { x: pageWidth - margin, y },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    })
    y -= 30

    const leftX = margin
    const rightX = pageWidth / 2 + 20
    const sigBlockWidth = contentWidth / 2 - 20

    // Section headers
    currentPage.drawText('ViraWorkx.ai', {
      x: leftX, y, size: headerFontSize, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
    })
    currentPage.drawText(params.companyName, {
      x: rightX, y, size: headerFontSize, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
    })
    y -= 50

    // Signature lines
    const drawLineRow = (label: string) => {
      currentPage.drawLine({ start: { x: leftX, y }, end: { x: leftX + sigBlockWidth, y }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })
      currentPage.drawLine({ start: { x: rightX, y }, end: { x: rightX + sigBlockWidth, y }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })
      y -= 14
      currentPage.drawText(label, { x: leftX, y, size: 8, font: helvetica, color: rgb(0.5, 0.5, 0.5) })
      currentPage.drawText(label, { x: rightX, y, size: 8, font: helvetica, color: rgb(0.5, 0.5, 0.5) })
      y -= 30
    }

    drawLineRow('Signature')
    drawLineRow('Name')
    drawLineRow('Date')

    // Store signature block Y coordinate in PDF metadata for embedding later
    pdfDoc.setSubject(`sig_y:${yHr}`)
    pdfDoc.setTitle(params.title)

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
  }

  async embedSignatureInPdf(params: EmbedSignatureParams): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(params.existingPdfBytes)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width: pageWidth } = lastPage.getSize()

    const margin = 60
    const contentWidth = (pageWidth - margin * 2) / 2 - 20

    // Position: left for viraworkx, right for client
    const baseX = params.signerRole === 'viraworkx' ? margin : pageWidth / 2 + 20

    // Read the stored horizontal rule Y from metadata
    const sigBlockMeta = pdfDoc.getSubject()
    let yHr: number
    if (sigBlockMeta && sigBlockMeta.startsWith('sig_y:')) {
      yHr = parseFloat(sigBlockMeta.split(':')[1])
    } else {
      // Fallback estimate
      yHr = 250
    }

    // From the layout in generateContractPdf, offsets from yHr:
    //   yHr - 80: signature lines
    //   yHr - 124: name lines
    //   yHr - 168: date lines

    // Embed the signature PNG image above the signature line
    const sigImage = await pdfDoc.embedPng(params.signatureImagePng)
    const sigAspectRatio = sigImage.width / sigImage.height
    const sigDisplayHeight = 35
    const sigDisplayWidth = Math.min(sigDisplayHeight * sigAspectRatio, contentWidth)

    const sigLineY = yHr - 80
    lastPage.drawImage(sigImage, {
      x: baseX + 5,
      y: sigLineY + 2,
      width: sigDisplayWidth,
      height: sigDisplayHeight,
    })

    // Name text above the name line
    const nameLineY = yHr - 124
    lastPage.drawText(params.signedName, {
      x: baseX + 5,
      y: nameLineY + 4,
      size: 10,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    })

    // Date text above the date line
    const dateLineY = yHr - 168
    lastPage.drawText(params.signedDate, {
      x: baseX + 5,
      y: dateLineY + 4,
      size: 10,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    })

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
  }
}

export const pdfService = new PdfService()
