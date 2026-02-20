import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from root directory
config({ path: resolve(process.cwd(), '../../.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear all tables using TRUNCATE CASCADE to handle FK constraints
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      notifications, interview_feedback, interview_participants, interviews,
      skill_badges, assessments, contract_signatures, contracts,
      pipeline_history, candidate_notes, email_logs, applications,
      jobs, client_users, subscriptions, payments, clients,
      candidates, ai_actions, email_templates, users
    RESTART IDENTITY CASCADE
  `)

  console.log('🗑️  Cleared existing data')

  // Hash password for all seed users
  const seedPassword = process.env.SEED_PASSWORD || 'V1r@W0rkx#2026!'
  const passwordHash = await bcrypt.hash(seedPassword, 10)

  // ============ CREATE ADMIN USER (ViraWorkx CEO - Rahul Ramachandran) ============
  const VIRAWORKX_CEO_ID = '00000000-0000-4000-a000-000000000001'
  const adminUser = await prisma.user.create({
    data: {
      id: VIRAWORKX_CEO_ID,
      email: 'admin@viraworkx.ai',
      passwordHash,
      userType: 'admin',
    }
  })
  console.log('👑 Created admin user: admin@viraworkx.ai (Rahul Ramachandran, CEO)')

  // ============ CREATE CLIENT COMPANIES ============
  const techStartup = await prisma.client.create({
    data: {
      companyName: 'TechFlow AI',
      companyWebsite: 'https://techflow.ai',
      industry: 'Technology',
      companySize: '50-200',
      headquartersLocation: 'San Francisco, CA',
      description: 'AI-powered workflow automation for modern teams',
      planTier: 'growth',
    }
  })

  const fintech = await prisma.client.create({
    data: {
      companyName: 'PayScale Finance',
      companyWebsite: 'https://payscale.finance',
      industry: 'Fintech',
      companySize: '200-500',
      headquartersLocation: 'New York, NY',
      description: 'Next-generation payment solutions',
      planTier: 'enterprise',
    }
  })

  const healthTech = await prisma.client.create({
    data: {
      companyName: 'MedConnect',
      companyWebsite: 'https://medconnect.io',
      industry: 'Healthcare',
      companySize: '10-50',
      headquartersLocation: 'Boston, MA',
      description: 'Telehealth platform connecting patients with doctors',
      planTier: 'startup',
    }
  })

  console.log('🏢 Created 3 client companies')

  // ============ CREATE CLIENT USERS ============
  const clientUser1 = await prisma.user.create({
    data: {
      email: 'hiring@techflow.ai',
      passwordHash,
      userType: 'client',
    }
  })
  await prisma.clientUser.create({
    data: {
      clientId: techStartup.id,
      userId: clientUser1.id,
      role: 'owner',
    }
  })

  const clientUser2 = await prisma.user.create({
    data: {
      email: 'recruiter@payscale.finance',
      passwordHash,
      userType: 'client',
    }
  })
  await prisma.clientUser.create({
    data: {
      clientId: fintech.id,
      userId: clientUser2.id,
      role: 'hiring_manager',
    }
  })

  const clientUser3 = await prisma.user.create({
    data: {
      email: 'hr@medconnect.io',
      passwordHash,
      userType: 'client',
    }
  })
  await prisma.clientUser.create({
    data: {
      clientId: healthTech.id,
      userId: clientUser3.id,
      role: 'admin',
    }
  })

  console.log('👔 Created 3 client users')

  // ============ CREATE CANDIDATE USERS ============
  const candidateData = [
    {
      email: 'rahul.sharma@gmail.com',
      firstName: 'Rahul',
      lastName: 'Sharma',
      headline: 'Senior Full Stack Developer | React | Node.js | AWS',
      summary: 'Passionate full-stack developer with 6+ years of experience building scalable web applications.',
      location: 'Bangalore, India',
      experienceYears: 6,
      currentCompany: 'Infosys',
      currentTitle: 'Senior Software Engineer',
      expectedSalaryMin: 80000,
      expectedSalaryMax: 120000,
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL'],
      preferredRoles: ['Full Stack Developer', 'Backend Engineer', 'Tech Lead'],
      preferredLocations: ['Remote', 'San Francisco', 'New York'],
      workAuthorization: 'H1B Required',
      willingToRelocate: true,
      profileScore: 85,
    },
    {
      email: 'priya.patel@outlook.com',
      firstName: 'Priya',
      lastName: 'Patel',
      headline: 'Machine Learning Engineer | Python | TensorFlow | MLOps',
      summary: 'ML engineer specializing in NLP and computer vision with experience at startups and enterprises.',
      location: 'Mumbai, India',
      experienceYears: 4,
      currentCompany: 'TCS',
      currentTitle: 'ML Engineer',
      expectedSalaryMin: 100000,
      expectedSalaryMax: 150000,
      skills: ['Python', 'TensorFlow', 'PyTorch', 'Kubernetes', 'MLOps', 'AWS SageMaker', 'NLP'],
      preferredRoles: ['Machine Learning Engineer', 'AI Engineer', 'Data Scientist'],
      preferredLocations: ['Remote', 'Boston', 'Seattle'],
      workAuthorization: 'H1B Required',
      willingToRelocate: true,
      profileScore: 78,
    },
    {
      email: 'amit.kumar@yahoo.com',
      firstName: 'Amit',
      lastName: 'Kumar',
      headline: 'DevOps Engineer | Kubernetes | Terraform | CI/CD',
      summary: 'DevOps specialist focused on cloud infrastructure and automation. AWS certified.',
      location: 'Hyderabad, India',
      experienceYears: 5,
      currentCompany: 'Wipro',
      currentTitle: 'DevOps Lead',
      expectedSalaryMin: 90000,
      expectedSalaryMax: 130000,
      skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'GCP', 'Jenkins', 'GitHub Actions', 'Prometheus'],
      preferredRoles: ['DevOps Engineer', 'SRE', 'Platform Engineer'],
      preferredLocations: ['Remote', 'Austin', 'Denver'],
      workAuthorization: 'H1B Required',
      willingToRelocate: false,
      profileScore: 82,
    },
    {
      email: 'sneha.reddy@gmail.com',
      firstName: 'Sneha',
      lastName: 'Reddy',
      headline: 'Frontend Developer | React | Next.js | Design Systems',
      summary: 'Frontend developer passionate about creating beautiful, accessible user interfaces.',
      location: 'Chennai, India',
      experienceYears: 3,
      currentCompany: 'Zoho',
      currentTitle: 'Software Developer',
      expectedSalaryMin: 70000,
      expectedSalaryMax: 100000,
      skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Figma', 'Storybook', 'Jest'],
      preferredRoles: ['Frontend Developer', 'UI Engineer', 'Full Stack Developer'],
      preferredLocations: ['Remote', 'San Francisco', 'Los Angeles'],
      workAuthorization: 'H1B Required',
      willingToRelocate: true,
      profileScore: 72,
    },
    {
      email: 'vikram.singh@gmail.com',
      firstName: 'Vikram',
      lastName: 'Singh',
      headline: 'Backend Engineer | Go | Microservices | System Design',
      summary: 'Backend engineer with expertise in building high-performance distributed systems.',
      location: 'Delhi, India',
      experienceYears: 7,
      currentCompany: 'Flipkart',
      currentTitle: 'Staff Engineer',
      expectedSalaryMin: 120000,
      expectedSalaryMax: 180000,
      skills: ['Go', 'Python', 'Kafka', 'Redis', 'PostgreSQL', 'gRPC', 'Microservices', 'System Design'],
      preferredRoles: ['Backend Engineer', 'Staff Engineer', 'Principal Engineer'],
      preferredLocations: ['Remote', 'Seattle', 'New York'],
      workAuthorization: 'H1B Required',
      willingToRelocate: true,
      profileScore: 91,
    },
  ]

  const candidates: any[] = []
  for (const data of candidateData) {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        userType: 'candidate',
      }
    })

    const candidate = await prisma.candidate.create({
      data: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        headline: data.headline,
        summary: data.summary,
        location: data.location,
        experienceYears: data.experienceYears,
        currentCompany: data.currentCompany,
        currentTitle: data.currentTitle,
        expectedSalaryMin: data.expectedSalaryMin,
        expectedSalaryMax: data.expectedSalaryMax,
        skills: data.skills,
        preferredRoles: data.preferredRoles,
        preferredLocations: data.preferredLocations,
        workAuthorization: data.workAuthorization,
        willingToRelocate: data.willingToRelocate,
        profileScore: data.profileScore,
      }
    })
    candidates.push(candidate)
  }

  console.log('👨‍💻 Created 5 candidate users')

  // ============ CREATE JOBS ============
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        clientId: techStartup.id,
        title: 'Senior Full Stack Engineer',
        description: 'Join our team to build the next generation of AI-powered workflow tools.',
        requirements: '5+ years of experience with React and Node.js. Strong understanding of cloud services.',
        responsibilities: 'Design and implement features, mentor junior developers, participate in architecture decisions.',
        department: 'Engineering',
        employmentType: 'contractor',
        experienceMin: 5,
        experienceMax: 10,
        salaryMin: 100000,
        salaryMax: 150000,
        location: 'San Francisco, CA',
        remotePolicy: 'hybrid',
        skillsRequired: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
        skillsPreferred: ['AWS', 'GraphQL', 'Docker'],
        benefits: ['Health Insurance', '401k', 'Unlimited PTO', 'Remote Work'],
        status: 'active',
        postedAt: new Date(),
        imochaTestId: 'react-senior',
      }
    }),
    prisma.job.create({
      data: {
        clientId: techStartup.id,
        title: 'Machine Learning Engineer',
        description: 'Build ML models to power our intelligent automation features.',
        requirements: '3+ years of ML experience. Strong Python skills.',
        responsibilities: 'Develop ML models, deploy to production, optimize for performance.',
        department: 'AI/ML',
        employmentType: 'freelancer',
        experienceMin: 3,
        experienceMax: 7,
        salaryMin: 120000,
        salaryMax: 180000,
        location: 'San Francisco, CA',
        remotePolicy: 'remote',
        skillsRequired: ['Python', 'TensorFlow', 'MLOps'],
        skillsPreferred: ['PyTorch', 'AWS SageMaker', 'NLP'],
        benefits: ['Health Insurance', '401k', 'Stock Options', 'Learning Budget'],
        status: 'active',
        postedAt: new Date(),
        imochaTestId: 'ml-python',
      }
    }),
    prisma.job.create({
      data: {
        clientId: fintech.id,
        title: 'Backend Engineer - Payments',
        description: 'Work on our core payment processing infrastructure.',
        requirements: '4+ years backend experience. Fintech experience preferred.',
        responsibilities: 'Build payment APIs, ensure security compliance, optimize transaction processing.',
        department: 'Payments',
        employmentType: 'contractor',
        experienceMin: 4,
        experienceMax: 8,
        salaryMin: 130000,
        salaryMax: 170000,
        location: 'New York, NY',
        remotePolicy: 'hybrid',
        skillsRequired: ['Go', 'PostgreSQL', 'Redis', 'Microservices'],
        skillsPreferred: ['Kafka', 'gRPC', 'AWS'],
        benefits: ['Health Insurance', '401k Match', 'Annual Bonus', 'Gym Membership'],
        status: 'active',
        postedAt: new Date(),
        imochaTestId: 'python-backend',
      }
    }),
    prisma.job.create({
      data: {
        clientId: fintech.id,
        title: 'DevOps Engineer',
        description: 'Manage our cloud infrastructure and deployment pipelines.',
        requirements: '3+ years DevOps experience. AWS or GCP certified preferred.',
        responsibilities: 'Maintain CI/CD pipelines, manage Kubernetes clusters, ensure system reliability.',
        department: 'Infrastructure',
        employmentType: 'freelancer',
        experienceMin: 3,
        experienceMax: 6,
        salaryMin: 110000,
        salaryMax: 150000,
        location: 'New York, NY',
        remotePolicy: 'remote',
        skillsRequired: ['Kubernetes', 'Terraform', 'AWS'],
        skillsPreferred: ['GCP', 'Prometheus', 'GitHub Actions'],
        benefits: ['Health Insurance', '401k', 'Remote Work', 'Conference Budget'],
        status: 'active',
        postedAt: new Date(),
        imochaTestId: 'devops-aws',
      }
    }),
    prisma.job.create({
      data: {
        clientId: healthTech.id,
        title: 'Frontend Developer',
        description: 'Build our patient-facing telehealth application.',
        requirements: '2+ years React experience. Healthcare experience a plus.',
        responsibilities: 'Develop UI components, ensure accessibility, optimize performance.',
        department: 'Product',
        employmentType: 'contractor',
        experienceMin: 2,
        experienceMax: 5,
        salaryMin: 80000,
        salaryMax: 120000,
        location: 'Boston, MA',
        remotePolicy: 'hybrid',
        skillsRequired: ['React', 'TypeScript', 'CSS'],
        skillsPreferred: ['Next.js', 'Tailwind CSS', 'Testing'],
        benefits: ['Health Insurance', 'Flexible Hours', 'Learning Budget'],
        status: 'active',
        postedAt: new Date(),
        imochaTestId: 'react-senior',
      }
    }),
  ])

  console.log('💼 Created 5 job postings')

  // ============ CREATE APPLICATIONS ============
  const applications = await Promise.all([
    // Rahul applies to Full Stack and Backend jobs
    prisma.application.create({
      data: {
        candidateId: candidates[0].id,
        jobId: jobs[0].id,
        stage: 'screening',
        matchScore: 87,
        aiSummary: 'Strong match with required skills. 6 years experience aligns well with requirements.',
        source: 'direct',
      }
    }),
    prisma.application.create({
      data: {
        candidateId: candidates[0].id,
        jobId: jobs[2].id,
        stage: 'new',
        source: 'direct',
      }
    }),
    // Priya applies to ML job
    prisma.application.create({
      data: {
        candidateId: candidates[1].id,
        jobId: jobs[1].id,
        stage: 'assessment',
        matchScore: 92,
        aiSummary: 'Excellent match for ML role. Strong NLP background aligns with team needs.',
        source: 'linkedin',
      }
    }),
    // Amit applies to DevOps job
    prisma.application.create({
      data: {
        candidateId: candidates[2].id,
        jobId: jobs[3].id,
        stage: 'interview',
        matchScore: 85,
        aiSummary: 'Good DevOps experience. AWS certification is a strong plus.',
        source: 'referral',
      }
    }),
    // Sneha applies to Frontend job
    prisma.application.create({
      data: {
        candidateId: candidates[3].id,
        jobId: jobs[4].id,
        stage: 'shortlisted',
        matchScore: 78,
        aiSummary: 'Solid frontend skills. Design system experience is valuable.',
        source: 'direct',
      }
    }),
    // Vikram applies to Backend job
    prisma.application.create({
      data: {
        candidateId: candidates[4].id,
        jobId: jobs[2].id,
        stage: 'offer',
        matchScore: 95,
        aiSummary: 'Exceptional backend expertise. System design skills are top-tier.',
        source: 'direct',
      }
    }),
  ])

  console.log('📝 Created 6 applications')

  // ============ CREATE ASSESSMENTS ============
  const assessments = await Promise.all([
    prisma.assessment.create({
      data: {
        candidateId: candidates[1].id,
        applicationId: applications[2].id,
        imochaTestId: 'ml-python',
        imochaInvitationId: 'inv-001',
        testName: 'Machine Learning with Python',
        status: 'completed',
        score: 88,
        maxScore: 100,
        percentile: 92,
        tier: 'Tier 1',
        invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        skillScores: [
          { skillName: 'Python', score: 90, maxScore: 100, percentile: 95 },
          { skillName: 'TensorFlow', score: 85, maxScore: 100, percentile: 88 },
          { skillName: 'NLP', score: 88, maxScore: 100, percentile: 91 },
        ],
      }
    }),
    prisma.assessment.create({
      data: {
        candidateId: candidates[2].id,
        applicationId: applications[3].id,
        imochaTestId: 'devops-aws',
        imochaInvitationId: 'inv-002',
        testName: 'DevOps & AWS',
        status: 'completed',
        score: 82,
        maxScore: 100,
        percentile: 85,
        tier: 'Tier 1',
        invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        skillScores: [
          { skillName: 'Kubernetes', score: 85, maxScore: 100, percentile: 88 },
          { skillName: 'AWS', score: 80, maxScore: 100, percentile: 82 },
          { skillName: 'Terraform', score: 82, maxScore: 100, percentile: 85 },
        ],
      }
    }),
  ])

  console.log('📋 Created 2 completed assessments')

  // ============ CREATE SKILL BADGES ============
  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  await Promise.all([
    // Priya's badges
    prisma.skillBadge.create({
      data: {
        candidateId: candidates[1].id,
        assessmentId: assessments[0].id,
        skillName: 'Python',
        badgeLevel: 'expert',
        score: 90,
        percentile: 95,
        expiresAt: oneYearFromNow,
      }
    }),
    prisma.skillBadge.create({
      data: {
        candidateId: candidates[1].id,
        assessmentId: assessments[0].id,
        skillName: 'TensorFlow',
        badgeLevel: 'advanced',
        score: 85,
        percentile: 88,
        expiresAt: oneYearFromNow,
      }
    }),
    prisma.skillBadge.create({
      data: {
        candidateId: candidates[1].id,
        assessmentId: assessments[0].id,
        skillName: 'NLP',
        badgeLevel: 'expert',
        score: 88,
        percentile: 91,
        expiresAt: oneYearFromNow,
      }
    }),
    // Amit's badges
    prisma.skillBadge.create({
      data: {
        candidateId: candidates[2].id,
        assessmentId: assessments[1].id,
        skillName: 'Kubernetes',
        badgeLevel: 'advanced',
        score: 85,
        percentile: 88,
        expiresAt: oneYearFromNow,
      }
    }),
    prisma.skillBadge.create({
      data: {
        candidateId: candidates[2].id,
        assessmentId: assessments[1].id,
        skillName: 'AWS',
        badgeLevel: 'advanced',
        score: 80,
        percentile: 82,
        expiresAt: oneYearFromNow,
      }
    }),
  ])

  console.log('🏅 Created 5 skill badges')

  // ============ CREATE INTERVIEWS ============
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 3)

  await prisma.interview.create({
    data: {
      applicationId: applications[3].id,
      interviewType: 'technical',
      title: 'Technical Interview - DevOps',
      description: 'Technical discussion about Kubernetes, CI/CD, and infrastructure design.',
      scheduledAt: futureDate,
      durationMinutes: 60,
      timezone: 'America/New_York',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      meetingProvider: 'google_meet',
      status: 'scheduled',
    }
  })

  console.log('📅 Created 1 scheduled interview')

  // ============ CREATE NOTIFICATIONS ============
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: candidates[0].userId,
        type: 'application_update',
        title: 'Application Under Review',
        message: 'Your application for Senior Full Stack Engineer at TechFlow AI is being reviewed.',
        channel: 'in_app',
        sentAt: new Date(),
      }
    }),
    prisma.notification.create({
      data: {
        userId: candidates[4].userId,
        type: 'offer_extended',
        title: 'Congratulations! You received an offer',
        message: 'PayScale Finance has extended an offer for Backend Engineer - Payments.',
        channel: 'in_app',
        sentAt: new Date(),
      }
    }),
  ])

  console.log('🔔 Created 2 notifications')

  // ============ SUMMARY ============
  console.log('\n✅ Seed completed successfully!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📧 TEST ACCOUNTS (Password: ${seedPassword})`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('👑 ADMIN:')
  console.log('   admin@viraworkx.ai')
  console.log('')
  console.log('👔 CLIENTS:')
  console.log('   hiring@techflow.ai (TechFlow AI - Owner)')
  console.log('   recruiter@payscale.finance (PayScale Finance - Hiring Manager)')
  console.log('   hr@medconnect.io (MedConnect - Admin)')
  console.log('')
  console.log('👨‍💻 CANDIDATES:')
  console.log('   rahul.sharma@gmail.com (Full Stack - 6 yrs)')
  console.log('   priya.patel@outlook.com (ML Engineer - 4 yrs)')
  console.log('   amit.kumar@yahoo.com (DevOps - 5 yrs)')
  console.log('   sneha.reddy@gmail.com (Frontend - 3 yrs)')
  console.log('   vikram.singh@gmail.com (Backend - 7 yrs)')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
