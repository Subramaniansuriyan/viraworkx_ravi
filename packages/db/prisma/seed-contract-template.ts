/**
 * One-time script: seed the ViraWorkX Talent Pool Onboarding Agreement as a contractor template.
 * Run with: npx ts-node --esm packages/db/prisma/seed-contract-template.ts
 * (from the repo root, with DATABASE_URL set)
 */
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

const TEMPLATE_NAME = 'Talent Pool Onboarding and Engagement Agreement'

const CONTENT = `VIRAWORKX LLC
START-UP READY TALENT

TALENT POOL ONBOARDING AND ENGAGEMENT AGREEMENT

17350 Texas 249 Access Road, Houston, TX 77064
www.viraworkx.com

CONFIDENTIAL

---

IMPORTANT DISCLAIMER

This Agreement has been prepared by ViraWorkX LLC for use in connection with its talent platform operations. This document does not constitute legal advice and is not a substitute for independent legal counsel.

Both Parties are strongly encouraged to seek independent legal advice before executing this Agreement. ViraWorkX LLC makes no representations or warranties regarding the legal sufficiency, enforceability, or completeness of this Agreement under any specific jurisdiction.

By signing this Agreement, each Party acknowledges that they have had the opportunity to review this document with legal counsel of their choosing and that they enter into this Agreement voluntarily and with full understanding of its terms and obligations.

This Agreement is governed by the laws of the State of Texas, United States. Talent acknowledges that certain provisions may be subject to the laws of their country of residence and should seek local legal guidance accordingly.

---

This Talent Pool Onboarding and Engagement Agreement ("Agreement") is entered into as of {{date}} (the "Effective Date"), by and between:

Company:
ViraWorkX LLC
Address: 17350 Texas 249 Access Road, Houston, TX 77064
Contact: Rahul Kurapati, Founder & CEO
("Company" or "ViraWorkX")

AND

Talent Name: {{candidateName}}
Email: {{candidateEmail}}
("Talent" or "Contractor")

Company and Talent are collectively referred to as the "Parties" and individually as a "Party."

WHEREAS, ViraWorkX operates a curated talent platform that connects pre-vetted engineering professionals with United States-based startup clients (each, a "Client"); and
WHEREAS, Talent desires to join ViraWorkX's talent pool to be considered for placement with Clients; and
WHEREAS, ViraWorkX desires to assess, vet, and onboard Talent into its platform, subject to the terms and conditions of this Agreement;

NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

---

PART A: TALENT POOL ONBOARDING

1. TALENT POOL MEMBERSHIP

1.1 Upon execution of this Agreement and successful completion of ViraWorkX's assessment process (as defined in Section 2), Talent shall be admitted to ViraWorkX's curated talent pool (the "Talent Pool").

1.2 Membership in the Talent Pool is free of charge. Talent shall not be required to pay any registration fee, assessment fee, or membership fee to join ViraWorkX's platform.

1.3 Membership in the Talent Pool does not guarantee placement with any Client. ViraWorkX shall use reasonable commercial efforts to match Talent with suitable Client opportunities based on Talent's skills, Tier classification, availability, and Client requirements.

1.4 While in the Talent Pool and not actively placed with a Client, Talent is free to work for other employers, clients, freelance platforms, or staffing agencies without restriction. No exclusivity obligations apply until Talent is placed with a Client under a Placement Addendum (as defined in Section 8).

1.5 ViraWorkX reserves the sole right to admit, retain, deprioritize, or remove any Talent from the Talent Pool at any time, for any reason, with or without notice.

---

2. ASSESSMENT AND VETTING

2.1 Prior to or concurrent with execution of this Agreement, Talent has completed or shall complete ViraWorkX's proprietary assessment process, which includes proctored evaluations covering:
- Technical coding ability and problem-solving skills;
- English communication fluency (written and verbal);
- Psychometric and behavioral evaluation; and
- Domain-specific technical competency assessments.

2.2 Talent's assessment results shall determine their Tier classification under ViraWorkX's three-tier scoring system: Tier 1 (80-100%), Tier 2 (70-80%), or Tier 3 (60-70%). ViraWorkX reserves the sole right to determine, adjust, or reassess Talent's Tier at any time.

2.3 Talent must achieve a minimum score of 60% to be admitted to the Talent Pool. Talent who score below 60% may reapply after ninety (90) days.

2.4 Talent represents and warrants that all information provided during the assessment process is true, accurate, and not misleading. Any misrepresentation shall constitute grounds for immediate removal from the Talent Pool and termination of this Agreement.

2.5 Talent shall not use artificial intelligence tools, proxy test-takers, or any other unauthorized assistance to complete assessments. Detection of such activity shall result in permanent disqualification.

---

3. BACKGROUND VERIFICATION AND CONSENT

3.1 Talent hereby provides full consent and authorization for ViraWorkX to conduct background verification checks including identity, education, employment history, criminal record, and client-specific compliance requirements.

3.2 Talent agrees to cooperate fully with any verification process within ten (10) business days of request.

3.3 ViraWorkX shall handle all verification data in accordance with applicable data protection laws.

---

4. PORTFOLIO AND MARKETING RIGHTS

4.1 Talent grants ViraWorkX a non-exclusive, royalty-free, worldwide license to use Talent's name, professional photograph, skills summary, assessment Tier classification, and relevant work experience for client matching, marketing, and platform management purposes.

4.2 ViraWorkX shall not disclose Talent's exact assessment scores, personal contact information, or compensation details to any Client without Talent's prior written consent.

---

5. CONFIDENTIALITY

5.1 Talent shall hold all ViraWorkX Confidential Information in strict confidence and shall not disclose it to any third party without ViraWorkX's prior written consent.

5.2 The obligations of confidentiality shall survive the termination of this Agreement for five (5) years, or indefinitely for trade secrets.

---

6. TALENT REPRESENTATIONS AND WARRANTIES

6.1 Talent represents and warrants that they are legally authorized to work as an independent contractor, are not bound by any conflicting obligations, and that all information provided is true and accurate.

---

PART B: PLACEMENT AND ENGAGEMENT TERMS

7. COMPENSATION AND PLATFORM FEE

7.1 ViraWorkX shall determine a Talent Rate (USD per hour) for each placement at its sole discretion.

7.5 ViraWorkX shall deduct a Platform Fee of ten percent (10%) from the Talent Rate before disbursing payment to Talent.

7.7 POST-TERMINATION PLATFORM FEE: If Talent continues to provide services to the Client after termination, ViraWorkX remains entitled to the 10% Platform Fee for twenty-four (24) months from the date of termination.

7.9 ViraWorkX shall pay Talent on a monthly basis within fifteen (15) business days of receiving a complete timesheet.

7.10 All payments shall be made in Indian Rupees (INR), converted from USD at the mid-market exchange rate on the date of timesheet submission.

7.12 Talent is solely responsible for all taxes applicable in their country of residence.

---

8. PLACEMENT ADDENDUM

8.1 Each placement shall be governed by a separate Placement Addendum specifying: role, responsibilities, Talent Rate, start date, duration, work schedule, and time zone overlap requirements.

---

9. EXCLUSIVITY AND MOONLIGHTING (DURING PLACEMENT)

9.1 During Short-Term (2-6 months) or Long-Term (6-11 months) placements, Talent shall work exclusively for ViraWorkX and the assigned Client.

During Freelance placements, Talent may accept External Work provided it does not interfere with Client deliverables or create conflicts of interest.

---

10. AVAILABILITY AND TIME ZONE REQUIREMENTS (DURING PLACEMENT)

10.1 During an active placement, Talent shall maintain a minimum daily overlap of three (3) to six (6) hours with United States business hours as specified in the Placement Addendum.

---

11. EQUIPMENT, TOOLS, AND SECURITY REQUIREMENTS (DURING PLACEMENT)

11.1 Talent shall provide, at their own cost, a personal computer, reliable high-speed internet, and a professional workspace meeting minimum security standards including full disk encryption, updated software, antivirus protection, MFA, and screen lock.

---

12. INTELLECTUAL PROPERTY (DURING PLACEMENT)

12.1 All Work Product created during a placement shall be the sole and exclusive property of ViraWorkX or its designated Client. Talent hereby irrevocably assigns all intellectual property rights in the Work Product to ViraWorkX.

---

13. CLIENT CONFIDENTIALITY (DURING PLACEMENT)

13.1 Talent shall hold all Client Confidential Information in strict confidence, use it solely for performing Services, and permanently destroy it upon termination of the placement. These obligations survive termination for five (5) years.

---

18. NON-SOLICITATION AND NON-CIRCUMVENTION

18.1 During the term and for twenty-four (24) months following termination, Talent shall not directly or indirectly engage with any ViraWorkX Client for services that bypass ViraWorkX.

18.3 DIRECT HIRE FEE: If any Client directly hires Talent as a full-time employee, the Client shall pay ViraWorkX a placement fee equal to twenty-five percent (25%) of Talent's first-year annualized compensation.

18.4 LIQUIDATED DAMAGES: Circumvention shall render Talent liable for the greater of twelve (12) months of Talent Rate at forty (40) hours/week or 25% of first-year compensation with the Client, denominated in USD.

---

22. RELATIONSHIP OF THE PARTIES

22.1 Talent is an independent contractor and NOT an employee, agent, partner, or joint venturer of ViraWorkX or any Client.

---

23. TERM AND TERMINATION

23.1 This Agreement commences on the Effective Date and continues until terminated. Either Party may terminate with seven (7) calendar days' written notice.

---

24. LIMITATION OF LIABILITY

24.1 ViraWorkX's total aggregate liability shall not exceed the total net compensation paid to Talent in the three (3) months preceding the claim.

---

25. DISPUTE RESOLUTION

25.1 Any dispute shall be submitted to binding arbitration under AAA rules in Houston, Texas. The arbitrator's decision shall be final and binding.

---

26. GENERAL PROVISIONS

26.1 Governing Law: State of Texas, United States.
26.6 Electronic signatures (DocuSign, Adobe Sign, or similar) shall be valid and binding.

---

27. PRIVACY NOTICE

ViraWorkX LLC collects and processes Talent's personal information for the purposes of assessment, placement, payment, and platform management, in accordance with applicable data protection laws. Talent data may be stored in the United States. Talent may request access, correction, or deletion of their data by contacting ViraWorkX in writing.

---

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

COMPANY: ViraWorkX LLC

Signature: _______________________
Name: Rahul Kurapati, Founder & CEO
Date: {{date}}

TALENT:

Signature: _______________________
Printed Name: {{candidateName}}
Date: {{date}}
`

async function main() {
  const existing = await prisma.contractTemplate.findFirst({
    where: { name: TEMPLATE_NAME },
  })

  if (existing) {
    console.log(`Template already exists (id: ${existing.id}) — updating content...`)
    await prisma.contractTemplate.update({
      where: { id: existing.id },
      data: { content: CONTENT, isActive: true, templateType: 'contractor' },
    })
    console.log('Template updated.')
  } else {
    const template = await prisma.contractTemplate.create({
      data: {
        name: TEMPLATE_NAME,
        description: 'ViraWorkX Talent Pool Onboarding and Engagement Agreement (amended)',
        content: CONTENT,
        templateType: 'contractor',
        isActive: true,
      },
    })
    console.log(`Template created with id: ${template.id}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
