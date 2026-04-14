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
  signatureImagePng?: Buffer // optional — text-only signature when omitted
  signerRole: 'viraworkx' | 'candidate'
  signedName: string
  signedDate: string
}

// Layout constants shared between generate and embed
// Talent Agreement is bilateral: ViraWorkx ↔ Candidate (client has a separate services agreement)
const MARGIN = 60
const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const GUTTER = 30
const COL_WIDTH = (PAGE_WIDTH - MARGIN * 2 - GUTTER) / 2 // ~217 pt
const COL_X: Record<'viraworkx' | 'candidate', number> = {
  viraworkx: MARGIN,
  candidate: MARGIN + COL_WIDTH + GUTTER,
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

    const margin = MARGIN
    const pageWidth = PAGE_WIDTH
    const pageHeight = PAGE_HEIGHT
    const contentWidth = pageWidth - margin * 2
    const lineHeight = 16
    const bodyFontSize = 10
    const titleFontSize = 18
    const headerFontSize = 11
    const signatureBlockHeight = 220

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
      if (y < margin + signatureBlockHeight + 20) {
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

    // -- Signature blocks (3 columns: ViraWorkx | Client | Candidate) --
    if (y < margin + signatureBlockHeight) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }

    y -= 30
    const yHr = y

    currentPage.drawLine({
      start: { x: margin, y }, end: { x: pageWidth - margin, y },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    })
    y -= 25

    const colHeaders: Array<{ role: keyof typeof COL_X; label: string }> = [
      { role: 'viraworkx', label: 'ViraWorkx.ai' },
      { role: 'candidate', label: 'Candidate' },
    ]

    for (const { role, label } of colHeaders) {
      const x = COL_X[role]
      // Truncate label if too wide
      const maxLabelChars = Math.floor(COL_WIDTH / (headerFontSize * 0.55))
      const displayLabel = label.length > maxLabelChars ? label.slice(0, maxLabelChars - 1) + '…' : label
      currentPage.drawText(displayLabel, {
        x, y, size: headerFontSize, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
      })
    }
    y -= 45

    // Signature line rows
    const drawRow = (label: string) => {
      for (const role of Object.keys(COL_X) as Array<keyof typeof COL_X>) {
        const x = COL_X[role]
        currentPage.drawLine({
          start: { x, y }, end: { x: x + COL_WIDTH, y },
          thickness: 0.5, color: rgb(0.4, 0.4, 0.4),
        })
        currentPage.drawText(label, {
          x: x + 2, y: y - 12, size: 8, font: helvetica, color: rgb(0.5, 0.5, 0.5),
        })
      }
      y -= 40
    }

    drawRow('Signature')
    drawRow('Name')
    drawRow('Date')

    // Store signature block Y in metadata for embedSignatureInPdf
    pdfDoc.setSubject(`sig_y:${yHr}`)
    pdfDoc.setTitle(params.title)

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
  }

  async embedSignatureInPdf(params: EmbedSignatureParams): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(params.existingPdfBytes)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]

    const baseX = COL_X[params.signerRole]

    // Read the stored HR Y from metadata
    const sigBlockMeta = pdfDoc.getSubject()
    let yHr: number
    if (sigBlockMeta && sigBlockMeta.startsWith('sig_y:')) {
      yHr = parseFloat(sigBlockMeta.split(':')[1])
    } else {
      yHr = 250
    }

    // Offsets from yHr matching the layout in generateContractPdf:
    //   yHr - 25: col headers drawn
    //   yHr - 70: top of first row (signature line)
    //   yHr - 110: top of second row (name line)
    //   yHr - 150: top of third row (date line)

    const sigLineY  = yHr - 70
    const nameLineY = yHr - 110
    const dateLineY = yHr - 150

    if (params.signatureImagePng) {
      // Embed signature image above the signature line
      const sigImage = await pdfDoc.embedPng(params.signatureImagePng)
      const aspectRatio = sigImage.width / sigImage.height
      const imgH = 30
      const imgW = Math.min(imgH * aspectRatio, COL_WIDTH - 10)
      lastPage.drawImage(sigImage, {
        x: baseX + 2,
        y: sigLineY,
        width: imgW,
        height: imgH,
      })
    } else {
      // No image — draw signed name in italics as a text signature
      lastPage.drawText(params.signedName, {
        x: baseX + 4,
        y: sigLineY + 4,
        size: 13,
        font: helveticaOblique,
        color: rgb(0.05, 0.05, 0.45), // dark ink blue
      })
    }

    // Name text above the name line
    lastPage.drawText(params.signedName, {
      x: baseX + 4,
      y: nameLineY + 4,
      size: 10,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    })

    // Date text above the date line
    lastPage.drawText(params.signedDate, {
      x: baseX + 4,
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
