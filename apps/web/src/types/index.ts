// User types
export interface User {
  id: string
  email: string
  userType: 'candidate' | 'client' | 'admin'
  profile?: {
    firstName?: string
    lastName?: string
    companyName?: string
  }
}

// Candidate types
export interface Candidate {
  id: string
  userId: string
  firstName: string
  lastName: string
  headline?: string
  summary?: string
  location?: string
  experienceYears?: number
  currentCompany?: string
  currentTitle?: string
  expectedSalaryMin?: number
  expectedSalaryMax?: number
  salaryCurrency?: string
  noticePeriodDays?: number
  resumeUrl?: string
  videoProfileUrl?: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  profileScore: number
  skills: string[]
  preferredRoles?: string[]
  preferredLocations?: string[]
  workAuthorization?: string
  willingToRelocate?: boolean
  panNumber?: string
  aadhaarNumber?: string
  panCardUrl?: string
  aadhaarFrontUrl?: string
  aadhaarBackUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CandidateProfile extends Candidate {
  user: { email: string }
  applications?: Application[]
  assessments?: Assessment[]
  skillBadges?: SkillBadge[]
}

// Client types
export interface Client {
  id: string
  companyName: string
  companyWebsite?: string
  companyLogoUrl?: string
  industry?: string
  companySize?: string
  headquartersLocation?: string
  description?: string
  planTier?: 'startup' | 'growth' | 'enterprise'
  createdAt: string
  updatedAt: string
}

// Job types
export interface Job {
  id: string
  clientId: string
  title: string
  description?: string
  requirements?: string
  responsibilities?: string
  department?: string
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship'
  experienceMin?: number
  experienceMax?: number
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  location?: string
  remotePolicy?: 'remote' | 'hybrid' | 'onsite'
  skillsRequired: string[]
  skillsPreferred?: string[]
  benefits?: string[]
  status: 'draft' | 'active' | 'paused' | 'closed' | 'filled'
  imochaTestId?: string
  postedAt?: string
  closesAt?: string
  client?: Client
  _count?: { applications: number }
  createdAt: string
}

// Application types
export interface Application {
  id: string
  candidateId: string
  jobId: string
  stage: ApplicationStage
  matchScore?: number
  aiSummary?: string
  coverLetter?: string
  appliedAt: string
  job?: Job
  candidate?: Candidate
}

export type ApplicationStage =
  | 'new'
  | 'screening'
  | 'assessment'
  | 'assessment_complete'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

// Assessment types
export interface Assessment {
  id: string
  candidateId: string
  applicationId?: string
  imochaTestId: string
  imochaInvitationId?: string
  imochaAttemptId?: string
  testName?: string
  status: AssessmentStatus
  score?: number
  maxScore?: number
  percentile?: number
  skillScores?: SkillScore[]
  reportUrl?: string
  proctoringFlags?: ProctoringFlags
  invitedAt?: string
  startedAt?: string
  completedAt?: string
  expiresAt?: string
  createdAt: string
  application?: Application
  skillBadges?: SkillBadge[]
}

export type AssessmentStatus =
  | 'pending'
  | 'invited'
  | 'started'
  | 'completed'
  | 'expired'
  | 'cancelled'

export interface SkillScore {
  skillName: string
  score: number
  maxScore: number
  percentile: number
}

export interface ProctoringFlags {
  faceNotDetected: boolean
  multipleFaces: boolean
  tabSwitched: boolean
  copyPasteDetected: boolean
}

// Skill Badge types
export interface SkillBadge {
  id: string
  candidateId: string
  assessmentId?: string
  skillName: string
  badgeLevel: BadgeLevel
  score?: number
  percentile?: number
  verifiedAt: string
  expiresAt?: string
}

export type BadgeLevel = 'expert' | 'advanced' | 'intermediate' | 'beginner'

// Interview types
export interface Interview {
  id: string
  applicationId: string
  interviewType?: 'ai_screening' | 'phone' | 'video' | 'onsite' | 'technical' | 'panel' | 'final'
  title?: string
  description?: string
  scheduledAt: string
  durationMinutes?: number
  timezone?: string
  meetingUrl?: string
  location?: string
  status: InterviewStatus
  application?: Application
}

export type InterviewStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Test type from iMocha
export interface IMochaTest {
  id: string
  name: string
  category: string
  duration: number
  skills: string[]
  difficulty: string
}
