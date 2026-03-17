import axios from 'axios'
import type {
  CandidateProfile, Assessment, SkillBadge, IMochaTest, Job, Application,
  Client as ClientType, ContractTemplate, Contract, Subscription, PaymentInvoice,
} from '../types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const authData = localStorage.getItem('viraworkx-auth')
        if (authData) {
          const { state } = JSON.parse(authData)
          const refreshToken = state?.refreshToken

          if (refreshToken) {
            const response = await axios.post('/api/v1/auth/refresh', { refreshToken })
            const { accessToken } = response.data
            localStorage.setItem('token', accessToken)
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        localStorage.removeItem('token')
        localStorage.removeItem('viraworkx-auth')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: {
    email: string
    password: string
    userType: 'candidate' | 'client'
    firstName?: string
    lastName?: string
    companyName?: string
  }) => api.post('/auth/register', data),

  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  updatePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
}

// Candidate API
export const candidateApi = {
  getAll: () => api.get<{ candidates: CandidateProfile[] }>('/candidates'),
  getById: (id: string) => api.get<{ candidate: CandidateProfile }>(`/candidates/${id}`),
  getProfile: () => api.get<{ profile: CandidateProfile }>('/candidates/me/profile'),

  updateProfile: (data: Partial<CandidateProfile>) =>
    api.put<{ profile: CandidateProfile }>('/candidates/me/profile', data),

  uploadResume: (file: File) => {
    const formData = new FormData()
    formData.append('resume', file)
    // Remove default Content-Type so browser sets multipart/form-data with correct boundary
    return api.post<{ resumeUrl: string; parsedData?: any }>('/candidates/me/resume', formData, {
      headers: { 'Content-Type': undefined },
    })
  },

  uploadVideo: (file: File) => {
    const formData = new FormData()
    formData.append('video', file)
    return api.post<{ videoUrl: string }>('/candidates/me/video', formData, {
      headers: { 'Content-Type': undefined },
    })
  },

  uploadPanCard: (file: File) => {
    const formData = new FormData()
    formData.append('document', file)
    return api.post<{ panCardUrl: string }>('/candidates/me/pan-card', formData, {
      headers: { 'Content-Type': undefined },
    })
  },

  uploadAadhaarFront: (file: File) => {
    const formData = new FormData()
    formData.append('document', file)
    return api.post<{ aadhaarFrontUrl: string }>('/candidates/me/aadhaar-front', formData, {
      headers: { 'Content-Type': undefined },
    })
  },

  uploadAadhaarBack: (file: File) => {
    const formData = new FormData()
    formData.append('document', file)
    return api.post<{ aadhaarBackUrl: string }>('/candidates/me/aadhaar-back', formData, {
      headers: { 'Content-Type': undefined },
    })
  },

  getSkillBadges: (candidateId: string) =>
    api.get<{ badges: SkillBadge[] }>(`/assessments/candidate/${candidateId}/badges`),

  getApplications: () =>
    api.get<{ applications: Application[] }>('/candidates/me/applications'),

  getJobMatches: () =>
    api.get<{ jobs: Job[]; matchScores: Record<string, number> }>('/candidates/me/job-matches'),
}

// Job API
export const jobApi = {
  getAll: (params?: { status?: string; skills?: string[]; remotePolicy?: string; employmentType?: string }) =>
    api.get<{ jobs: Job[] }>('/jobs', { params }),
  getById: (id: string) => api.get<{ job: Job }>(`/jobs/${id}`),
  create: (data: Partial<Job>) => api.post<{ job: Job }>('/jobs', data),
  update: (id: string, data: Partial<Job>) => api.put<{ job: Job }>(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
  publish: (id: string) => api.post<{ job: Job }>(`/jobs/${id}/publish`),
  close: (id: string) => api.post<{ job: Job }>(`/jobs/${id}/close`),
  getApplications: (id: string) => api.get<{ applications: Application[] }>(`/jobs/${id}/applications`),
  apply: (jobId: string, data?: { coverLetter?: string }) =>
    api.post<{ application: Application }>(`/jobs/${jobId}/apply`, data),
}

// Application API
export const applicationApi = {
  getAll: (params?: { jobId?: string; stage?: string }) =>
    api.get<{ applications: Application[] }>('/applications', { params }),
  getById: (id: string) => api.get<{ application: Application }>(`/applications/${id}`),
  advance: (id: string, stage?: string) =>
    api.post<{ application: Application }>(`/applications/${id}/advance`, { stage }),
  reject: (id: string, reason?: string) =>
    api.post<{ application: Application }>(`/applications/${id}/reject`, { reason }),
  shortlist: (id: string) =>
    api.post<{ application: Application }>(`/applications/${id}/shortlist`),
  getPipeline: (jobId: string) =>
    api.get<{ pipeline: Record<string, Application[]> }>(`/applications/pipeline/${jobId}`),
}

// Client API
export const clientApi = {
  getProfile: (id: string) => api.get<{ client: Client }>(`/clients/${id}`),
  updateProfile: (id: string, data: Partial<Client>) =>
    api.put<{ client: Client }>(`/clients/${id}`, data),
  getDashboard: (id: string) =>
    api.get<{ stats: DashboardStats; recentApplications: Application[]; activeJobs: Job[] }>(`/clients/${id}/dashboard`),
  getTeam: (id: string) => api.get<{ users: TeamMember[] }>(`/clients/${id}/users`),
  addTeamMember: (id: string, data: { email: string; role: string }) =>
    api.post(`/clients/${id}/users`, data),
  removeTeamMember: (id: string, userId: string) =>
    api.delete(`/clients/${id}/users/${userId}`),
}

// Interview API
export const interviewApi = {
  getAll: (params?: { applicationId?: string }) =>
    api.get<{ interviews: Interview[] }>('/interviews', { params }),
  getById: (id: string) => api.get<{ interview: Interview }>(`/interviews/${id}`),
  create: (data: Partial<Interview>) =>
    api.post<{ interview: Interview }>('/interviews', data),
  update: (id: string, data: Partial<Interview>) =>
    api.put<{ interview: Interview }>(`/interviews/${id}`, data),
  cancel: (id: string) => api.post(`/interviews/${id}/cancel`),
  reschedule: (id: string, scheduledAt: string) =>
    api.post<{ interview: Interview }>(`/interviews/${id}/reschedule`, { scheduledAt }),
  submitFeedback: (id: string, feedback: InterviewFeedback) =>
    api.post(`/interviews/${id}/feedback`, feedback),
}

// AI API
export const aiApi = {
  screenCandidate: (applicationId: string) =>
    api.post<{ screening: AIScreeningResult }>('/ai/screen-candidate', { applicationId }),
  matchJobs: (candidateId: string) =>
    api.post<{ matches: JobMatch[] }>('/ai/match-jobs', { candidateId }),
  rankCandidates: (jobId: string) =>
    api.post<{ rankings: CandidateRanking[] }>('/ai/rank-candidates', { jobId }),
  generateOutreach: (data: { candidateId: string; jobId: string; type: string }) =>
    api.post<{ message: string }>('/ai/generate-outreach', data),
}

// Types for client API
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
}

export interface DashboardStats {
  activeJobs: number
  totalCandidates: number
  interviewsToday: number
  avgTimeToHire: number
}

export interface TeamMember {
  id: string
  userId: string
  role: string
  user: { email: string; profile?: { firstName?: string; lastName?: string } }
}

export interface Interview {
  id: string
  applicationId: string
  interviewType?: string
  title?: string
  scheduledAt: string
  durationMinutes?: number
  meetingUrl?: string
  status: string
  application?: Application
}

export interface InterviewFeedback {
  overallRating: number
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | 'undecided'
  strengths?: string
  concerns?: string
  notes?: string
}

export interface AIScreeningResult {
  matchScore: number
  strengths: string[]
  concerns: string[]
  recommendation: string
  summary: string
}

export interface JobMatch {
  job: Job
  matchScore: number
  matchDetails: { skillMatch: number; experienceMatch: number; locationMatch: number }
}

export interface CandidateRanking {
  candidate: CandidateProfile
  matchScore: number
  aiSummary: string
}

// Assessment API
export const assessmentApi = {
  getAll: (params?: { status?: string; candidateId?: string }) =>
    api.get<{ assessments: Assessment[] }>('/assessments', { params }),

  getById: (id: string) =>
    api.get<{ assessment: Assessment }>(`/assessments/${id}`),

  getReport: (id: string) =>
    api.get<{ report: AssessmentReport }>(`/assessments/${id}/report`),

  getTests: () =>
    api.get<{ tests: IMochaTest[] }>('/assessments/tests'),

  invite: (data: { testId: string; candidateId: string; applicationId?: string }) =>
    api.post<{ assessment: Assessment; testUrl: string }>('/assessments/invite', data),

  // For testing purposes
  simulateComplete: (id: string, data?: { score?: number; percentile?: number }) =>
    api.post<{ assessment: Assessment }>(`/assessments/${id}/simulate-complete`, data),
}

export interface AssessmentReport {
  assessmentId: string
  candidateName: string
  testName: string
  score: number
  maxScore: number
  percentile: number
  skillScores: Array<{
    skillName: string
    score: number
    maxScore: number
    percentile: number
  }>
  badges: Array<{
    skill: string
    level: string
    percentile: number
  }>
  reportUrl?: string
  completedAt: string
  proctoringFlags?: {
    tabSwitched: boolean
    multipleFaces: boolean
    faceNotDetected: boolean
    copyPasteDetected: boolean
  }
}

// Contract API
export const contractApi = {
  // Templates (admin)
  getTemplates: () =>
    api.get<{ templates: ContractTemplate[] }>('/contracts/templates'),
  getTemplateById: (id: string) =>
    api.get<{ template: ContractTemplate }>(`/contracts/templates/${id}`),
  createTemplate: (data: Partial<ContractTemplate>) =>
    api.post<{ template: ContractTemplate }>('/contracts/templates', data),
  updateTemplate: (id: string, data: Partial<ContractTemplate>) =>
    api.put<{ template: ContractTemplate }>(`/contracts/templates/${id}`, data),

  // Contracts
  getAll: () =>
    api.get<{ contracts: Contract[] }>('/contracts'),
  getById: (id: string) =>
    api.get<{ contract: Contract }>(`/contracts/${id}`),
  generate: (data: { applicationId: string; templateId: string; terms?: any }) =>
    api.post<{ contract: Contract }>('/contracts/generate', data),
  update: (id: string, data: Partial<Contract>) =>
    api.put<{ contract: Contract }>(`/contracts/${id}`, data),
  sendForSignatures: (id: string) =>
    api.post<{ contract: Contract }>(`/contracts/${id}/send-for-signatures`),
  sign: (id: string, signedName: string, signatureImage: string) =>
    api.post<{ contract: Contract }>(`/contracts/${id}/sign`, { signedName, signatureImage }),
  terminate: (id: string) =>
    api.post<{ contract: Contract }>(`/contracts/${id}/terminate`),
  getPdfUrl: (id: string) => `/api/v1/contracts/${id}/pdf`,
}

// Payment API
export const paymentApi = {
  getSubscription: () =>
    api.get<{ subscription: Subscription | null; planPricing: Record<string, { amount: number; label: string }> }>('/payments/subscription'),
  createCheckout: (planTier: string, returnUrl?: string) =>
    api.post<{ url: string }>('/payments/checkout', { planTier, returnUrl }),
  openBillingPortal: (returnUrl?: string) =>
    api.post<{ url: string }>('/payments/billing-portal', { returnUrl }),
  changePlan: (newTier: string) =>
    api.post<{ success: boolean; planTier: string }>('/payments/change-plan', { newTier }),
  cancelSubscription: (atPeriodEnd?: boolean) =>
    api.post<{ success: boolean }>('/payments/cancel', { atPeriodEnd }),
  getInvoices: () =>
    api.get<{ invoices: PaymentInvoice[] }>('/payments/invoices'),
}

export default api
