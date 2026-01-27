import gql from 'graphql-tag'

export const typeDefs = gql`
  # Scalars
  scalar DateTime
  scalar JSON

  # Enums
  enum UserType {
    candidate
    client
    admin
  }

  enum ApplicationStage {
    new
    screening
    assessment
    assessment_complete
    shortlisted
    interview
    offer
    hired
    rejected
    withdrawn
  }

  enum JobStatus {
    draft
    active
    paused
    closed
    filled
  }

  enum RemotePolicy {
    remote
    hybrid
    onsite
  }

  enum EmploymentType {
    full_time
    part_time
    contract
    internship
  }

  enum InterviewType {
    ai_screening
    phone
    video
    onsite
    technical
    panel
    final
  }

  enum InterviewStatus {
    scheduled
    confirmed
    in_progress
    completed
    cancelled
    no_show
    rescheduled
  }

  enum AssessmentStatus {
    pending
    invited
    started
    completed
    expired
    cancelled
  }

  enum BadgeLevel {
    beginner
    intermediate
    advanced
    expert
  }

  enum Recommendation {
    strong_hire
    hire
    no_hire
    strong_no_hire
    undecided
  }

  # Input Types
  input PaginationInput {
    limit: Int
    offset: Int
  }

  input DateRangeInput {
    startDate: DateTime
    endDate: DateTime
  }

  input CandidateFilterInput {
    skills: [String!]
    location: String
    experienceMin: Int
    experienceMax: Int
    searchTerm: String
  }

  input JobFilterInput {
    clientId: ID
    status: JobStatus
    remotePolicy: RemotePolicy
    skills: [String!]
    location: String
    searchTerm: String
  }

  input ApplicationFilterInput {
    jobId: ID
    candidateId: ID
    stage: ApplicationStage
  }

  input CreateApplicationInput {
    jobId: ID!
    coverLetter: String
    source: String
  }

  input AIScheduleInput {
    applicationId: ID!
    interviewType: InterviewType!
    durationMinutes: Int
    preferredDates: [DateTime!]
  }

  # Types
  type User {
    id: ID!
    email: String!
    phone: String
    userType: UserType!
    status: String
    emailVerified: Boolean
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Candidate {
    id: ID!
    user: User
    firstName: String!
    lastName: String!
    fullName: String!
    headline: String
    summary: String
    location: String
    experienceYears: Int
    currentCompany: String
    currentTitle: String
    expectedSalaryMin: Int
    expectedSalaryMax: Int
    salaryCurrency: String
    noticePeriodDays: Int
    resumeUrl: String
    resumeParsedJson: JSON
    linkedinUrl: String
    githubUrl: String
    portfolioUrl: String
    profileScore: Int
    skills: [String!]
    preferredRoles: [String!]
    preferredLocations: [String!]
    workAuthorization: String
    willingToRelocate: Boolean
    applications: [Application!]
    assessments: [Assessment!]
    skillBadges: [SkillBadge!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Client {
    id: ID!
    companyName: String!
    companyWebsite: String
    companyLogoUrl: String
    industry: String
    companySize: String
    headquartersLocation: String
    description: String
    planTier: String
    jobs: [Job!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Job {
    id: ID!
    client: Client
    createdBy: User
    title: String!
    description: String
    requirements: String
    responsibilities: String
    department: String
    employmentType: EmploymentType
    experienceMin: Int
    experienceMax: Int
    salaryMin: Int
    salaryMax: Int
    salaryCurrency: String
    location: String
    remotePolicy: RemotePolicy
    skillsRequired: [String!]
    skillsPreferred: [String!]
    benefits: [String!]
    status: JobStatus!
    visibility: String
    imochaTestId: String
    postedAt: DateTime
    closesAt: DateTime
    applications: [Application!]
    applicationCount: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Application {
    id: ID!
    candidate: Candidate
    job: Job
    stage: ApplicationStage!
    matchScore: Int
    matchDetails: JSON
    aiSummary: String
    coverLetter: String
    source: String
    notes: String
    rejectionReason: String
    appliedAt: DateTime!
    stageUpdatedAt: DateTime
    interviews: [Interview!]
    assessments: [Assessment!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Assessment {
    id: ID!
    application: Application
    candidate: Candidate
    job: Job
    imochaTestId: String!
    imochaInvitationId: String
    imochaAttemptId: String
    status: AssessmentStatus!
    score: Int
    maxScore: Int
    percentile: Int
    skillScores: JSON
    reportUrl: String
    proctoringFlags: JSON
    invitedAt: DateTime
    startedAt: DateTime
    completedAt: DateTime
    expiresAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SkillBadge {
    id: ID!
    candidate: Candidate
    skillName: String!
    badgeLevel: BadgeLevel
    score: Int
    percentile: Int
    assessment: Assessment
    verifiedAt: DateTime!
    expiresAt: DateTime
    createdAt: DateTime!
  }

  type Interview {
    id: ID!
    application: Application
    interviewType: InterviewType!
    title: String
    description: String
    scheduledAt: DateTime
    durationMinutes: Int
    timezone: String
    meetingUrl: String
    meetingProvider: String
    location: String
    status: InterviewStatus!
    recordingUrl: String
    transcript: String
    aiSummary: String
    participants: [InterviewParticipant!]
    feedback: [InterviewFeedback!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type InterviewParticipant {
    id: ID!
    interview: Interview
    user: User
    participantType: String!
    responseStatus: String
    attended: Boolean
    createdAt: DateTime!
  }

  type InterviewFeedback {
    id: ID!
    interview: Interview
    interviewer: User
    overallRating: Int
    recommendation: Recommendation
    strengths: String
    concerns: String
    notes: String
    scorecard: JSON
    submittedAt: DateTime!
    createdAt: DateTime!
  }

  type Notification {
    id: ID!
    user: User
    type: String!
    title: String!
    message: String
    data: JSON
    channel: String
    read: Boolean!
    readAt: DateTime
    sentAt: DateTime
    createdAt: DateTime!
  }

  type AIAction {
    id: ID!
    agentType: String!
    actionType: String!
    entityType: String
    entityId: ID
    inputPayload: JSON
    outputPayload: JSON
    status: String!
    errorMessage: String
    requiresApproval: Boolean
    approvedBy: User
    approvedAt: DateTime
    executedAt: DateTime
    createdAt: DateTime!
  }

  # Connection Types (for pagination)
  type CandidateConnection {
    items: [Candidate!]!
    total: Int!
    hasMore: Boolean!
  }

  type JobConnection {
    items: [Job!]!
    total: Int!
    hasMore: Boolean!
  }

  type ApplicationConnection {
    items: [Application!]!
    total: Int!
    hasMore: Boolean!
  }

  # Analytics Types
  type PipelineStage {
    stage: ApplicationStage!
    count: Int!
  }

  type PipelineAnalytics {
    pipeline: [PipelineStage!]!
    total: Int!
    conversionRates: JSON
  }

  type HiringMetrics {
    totalApplications: Int!
    totalHired: Int!
    averageTimeToHire: Int
    sourceBreakdown: JSON
    stageConversion: JSON
  }

  # Match Types
  type JobMatch {
    job: Job!
    matchScore: Int!
    matchReasons: [String!]!
  }

  type CandidateMatch {
    candidate: Candidate!
    matchScore: Int!
    matchReasons: [String!]!
  }

  # AI Result Types
  type AIScreeningResult {
    matchScore: Int!
    strengths: [String!]!
    concerns: [String!]!
    recommendation: String!
    summary: String!
  }

  # Root Types
  type Query {
    # Current User
    me: User
    myProfile: Candidate

    # Candidates
    candidate(id: ID!): Candidate
    candidates(filter: CandidateFilterInput, pagination: PaginationInput): CandidateConnection!
    candidateJobMatches(candidateId: ID!, limit: Int): [JobMatch!]!

    # Jobs
    job(id: ID!): Job
    jobs(filter: JobFilterInput, pagination: PaginationInput): JobConnection!
    jobCandidates(jobId: ID!, ranked: Boolean): [CandidateMatch!]!

    # Applications
    application(id: ID!): Application
    applications(filter: ApplicationFilterInput, pagination: PaginationInput): ApplicationConnection!

    # Interviews
    interview(id: ID!): Interview
    interviews(applicationId: ID): [Interview!]!

    # Assessments
    assessment(id: ID!): Assessment
    assessments(candidateId: ID, applicationId: ID): [Assessment!]!

    # Clients
    client(id: ID!): Client

    # Notifications
    notifications(unreadOnly: Boolean): [Notification!]!
    unreadNotificationCount: Int!

    # AI Actions
    aiActions(status: String, limit: Int): [AIAction!]!

    # Analytics
    pipelineAnalytics(jobId: ID, dateRange: DateRangeInput): PipelineAnalytics!
    hiringMetrics(clientId: ID!, dateRange: DateRangeInput): HiringMetrics!
  }

  type Mutation {
    # Applications
    createApplication(input: CreateApplicationInput!): Application!
    updateApplicationStage(id: ID!, stage: ApplicationStage!, notes: String): Application!
    rejectApplication(id: ID!, reason: String, notes: String): Application!
    withdrawApplication(id: ID!): Application!

    # Interviews
    scheduleInterview(
      applicationId: ID!
      interviewType: InterviewType!
      title: String
      scheduledAt: DateTime!
      durationMinutes: Int
      meetingUrl: String
      description: String
    ): Interview!
    cancelInterview(id: ID!, reason: String): Interview!
    submitInterviewFeedback(
      interviewId: ID!
      overallRating: Int!
      recommendation: Recommendation!
      strengths: String
      concerns: String
      notes: String
    ): InterviewFeedback!

    # Assessments
    sendAssessmentInvite(applicationId: ID!, testId: String!): Assessment!

    # AI Actions
    runAIScreening(applicationId: ID!): AIScreeningResult!
    approveAIAction(id: ID!): AIAction!
    rejectAIAction(id: ID!, reason: String): AIAction!

    # Notifications
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Int!

    # Candidate Profile
    updateCandidateProfile(
      firstName: String
      lastName: String
      headline: String
      summary: String
      location: String
      skills: [String!]
      linkedinUrl: String
      githubUrl: String
      portfolioUrl: String
      expectedSalaryMin: Int
      expectedSalaryMax: Int
      noticePeriodDays: Int
    ): Candidate!
  }

  type Subscription {
    applicationUpdated(jobId: ID!): Application!
    newNotification(userId: ID!): Notification!
    aiActionCompleted(clientId: ID!): AIAction!
  }
`
