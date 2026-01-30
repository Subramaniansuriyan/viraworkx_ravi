# ViraWorkx.ai - AI-Powered Global Recruiting Platform

## Project Overview

ViraWorkx.ai is an AI-powered recruiting platform connecting US-based startups with technical talent from India. The platform features agentic AI capabilities, iMocha assessment integration, and dual portals for candidates and clients.

**Live URL:** https://www.viraworkx.ai/

---

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **State Management:** Zustand
- **Data Fetching:** React Query (TanStack Query)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **API:** GraphQL (Apollo Server) + REST
- **Queue:** Bull MQ (Redis-based)
- **WebSockets:** Socket.io

### AI/ML Layer
- **Framework:** Python + LangChain
- **LLM:** Claude API (Anthropic)
- **Embeddings:** Sentence Transformers
- **NLP:** spaCy
- **Resume Parsing:** Custom ML model + Claude

### Database
- **Primary:** PostgreSQL 15
- **Cache:** Redis 7
- **Search:** Elasticsearch 8
- **File Storage:** AWS S3 / GCP Cloud Storage

### Infrastructure
- **Cloud:** AWS or GCP
- **Container Orchestration:** Kubernetes (EKS/GKE)
- **IaC:** Terraform
- **CI/CD:** GitHub Actions
- **Monitoring:** DataDog / Prometheus + Grafana

---

## Project Structure

```
viraworkx/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Shared UI components
│   │   │   │   ├── candidate/  # Candidate portal components
│   │   │   │   ├── client/     # Client portal components
│   │   │   │   └── admin/      # Admin portal components
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── services/       # API services
│   │   │   ├── utils/
│   │   │   └── types/
│   │   └── package.json
│   │
│   ├── api/                    # Node.js backend
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── middleware/
│   │   │   ├── graphql/
│   │   │   │   ├── schema/
│   │   │   │   └── resolvers/
│   │   │   ├── jobs/           # Background jobs
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── ai-engine/              # Python AI services
│       ├── agents/
│       │   ├── sourcing_agent.py
│       │   ├── screening_agent.py
│       │   ├── scheduling_agent.py
│       │   ├── communication_agent.py
│       │   └── analytics_agent.py
│       ├── services/
│       │   ├── resume_parser.py
│       │   ├── job_matcher.py
│       │   └── interview_analyzer.py
│       ├── models/
│       └── requirements.txt
│
├── packages/
│   ├── shared/                 # Shared types and utilities
│   └── db/                     # Database schemas and migrations
│
├── infrastructure/
│   ├── terraform/
│   ├── kubernetes/
│   └── docker/
│
└── docs/
    ├── api/
    └── architecture/
```

---

## Database Schema

### Core Tables

```sql
-- Users (polymorphic for candidates, clients, admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('candidate', 'client', 'admin')),
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Candidates
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    headline VARCHAR(255),
    summary TEXT,
    location VARCHAR(255),
    experience_years INTEGER,
    current_company VARCHAR(255),
    current_title VARCHAR(255),
    expected_salary_min INTEGER,
    expected_salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    notice_period_days INTEGER,
    resume_url VARCHAR(500),
    resume_parsed_json JSONB,
    video_profile_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    profile_score INTEGER DEFAULT 0,
    skills TEXT[],
    preferred_roles TEXT[],
    preferred_locations TEXT[],
    work_authorization VARCHAR(50),
    willing_to_relocate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients (Companies)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_website VARCHAR(500),
    company_logo_url VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    headquarters_location VARCHAR(255),
    description TEXT,
    plan_tier VARCHAR(20) DEFAULT 'startup' CHECK (plan_tier IN ('startup', 'growth', 'enterprise')),
    settings_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Client Users (team members)
CREATE TABLE client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'hiring_manager', 'recruiter', 'member')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, user_id)
);

-- Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    responsibilities TEXT,
    department VARCHAR(100),
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),
    experience_min INTEGER,
    experience_max INTEGER,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    location VARCHAR(255),
    remote_policy VARCHAR(50) CHECK (remote_policy IN ('remote', 'hybrid', 'onsite')),
    skills_required TEXT[],
    skills_preferred TEXT[],
    benefits TEXT[],
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'filled')),
    visibility VARCHAR(20) DEFAULT 'public',
    imocha_test_id VARCHAR(100),
    imocha_test_config JSONB,
    ai_screening_config JSONB,
    posted_at TIMESTAMP,
    closes_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    stage VARCHAR(50) DEFAULT 'new' CHECK (stage IN (
        'new', 'screening', 'assessment', 'assessment_complete',
        'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'
    )),
    match_score INTEGER,
    match_details JSONB,
    ai_summary TEXT,
    cover_letter TEXT,
    source VARCHAR(50),
    referrer_id UUID REFERENCES candidates(id),
    notes TEXT,
    rejection_reason VARCHAR(255),
    applied_at TIMESTAMP DEFAULT NOW(),
    stage_updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

-- Assessments (iMocha integration)
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id),
    job_id UUID REFERENCES jobs(id),
    imocha_test_id VARCHAR(100) NOT NULL,
    imocha_invitation_id VARCHAR(100),
    imocha_attempt_id VARCHAR(100),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'invited', 'started', 'completed', 'expired', 'cancelled'
    )),
    score INTEGER,
    max_score INTEGER,
    percentile INTEGER,
    skill_scores JSONB,
    report_url VARCHAR(500),
    proctoring_flags JSONB,
    invited_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Skill Badges (verified skills from iMocha)
CREATE TABLE skill_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    badge_level VARCHAR(20) CHECK (badge_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    score INTEGER,
    percentile INTEGER,
    assessment_id UUID REFERENCES assessments(id),
    verified_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(candidate_id, skill_name)
);

-- Interviews
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    interview_type VARCHAR(50) CHECK (interview_type IN (
        'ai_screening', 'phone', 'video', 'onsite', 'technical', 'panel', 'final'
    )),
    title VARCHAR(255),
    description TEXT,
    scheduled_at TIMESTAMP,
    duration_minutes INTEGER DEFAULT 60,
    timezone VARCHAR(50),
    meeting_url VARCHAR(500),
    meeting_provider VARCHAR(50),
    location VARCHAR(255),
    status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'
    )),
    recording_url VARCHAR(500),
    transcript TEXT,
    ai_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Interview Participants
CREATE TABLE interview_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    participant_type VARCHAR(20) CHECK (participant_type IN ('candidate', 'interviewer', 'observer')),
    response_status VARCHAR(20) DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
    attended BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Interview Feedback
CREATE TABLE interview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES users(id),
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    recommendation VARCHAR(30) CHECK (recommendation IN ('strong_hire', 'hire', 'no_hire', 'strong_no_hire', 'undecided')),
    strengths TEXT,
    concerns TEXT,
    notes TEXT,
    scorecard JSONB,
    submitted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Agent Actions (audit log)
CREATE TABLE ai_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN (
        'sourcing', 'screening', 'scheduling', 'communication', 'analytics', 'interview'
    )),
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    input_payload JSONB,
    output_payload JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    channel VARCHAR(20) DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp', 'push')),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidates_user_id ON candidates(user_id);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_candidates_location ON candidates(location);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_skills ON jobs USING GIN(skills_required);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_stage ON applications(stage);
CREATE INDEX idx_assessments_candidate_id ON assessments(candidate_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX idx_ai_actions_agent_type ON ai_actions(agent_type);
CREATE INDEX idx_ai_actions_status ON ai_actions(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
```

---

## API Endpoints

### REST API

```yaml
# Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
GET    /api/v1/auth/me

# Candidates
GET    /api/v1/candidates
GET    /api/v1/candidates/:id
POST   /api/v1/candidates
PUT    /api/v1/candidates/:id
DELETE /api/v1/candidates/:id
POST   /api/v1/candidates/:id/resume          # Upload resume
POST   /api/v1/candidates/:id/video           # Upload video profile
GET    /api/v1/candidates/:id/applications
GET    /api/v1/candidates/:id/assessments
GET    /api/v1/candidates/:id/badges
GET    /api/v1/candidates/:id/job-matches     # AI-powered job recommendations

# Jobs
GET    /api/v1/jobs
GET    /api/v1/jobs/:id
POST   /api/v1/jobs
PUT    /api/v1/jobs/:id
DELETE /api/v1/jobs/:id
POST   /api/v1/jobs/:id/publish
POST   /api/v1/jobs/:id/close
GET    /api/v1/jobs/:id/applications
GET    /api/v1/jobs/:id/candidates            # AI-ranked candidates
POST   /api/v1/jobs/:id/ai-description        # Generate job description with AI

# Applications
GET    /api/v1/applications
GET    /api/v1/applications/:id
POST   /api/v1/applications
PUT    /api/v1/applications/:id
POST   /api/v1/applications/:id/advance       # Move to next stage
POST   /api/v1/applications/:id/reject
POST   /api/v1/applications/:id/shortlist

# Assessments (iMocha)
GET    /api/v1/assessments
GET    /api/v1/assessments/:id
POST   /api/v1/assessments/invite             # Send assessment invitation
GET    /api/v1/assessments/:id/report
GET    /api/v1/assessments/tests              # List available iMocha tests
POST   /api/v1/assessments/webhook            # iMocha webhook handler

# Interviews
GET    /api/v1/interviews
GET    /api/v1/interviews/:id
POST   /api/v1/interviews
PUT    /api/v1/interviews/:id
DELETE /api/v1/interviews/:id
POST   /api/v1/interviews/:id/reschedule
POST   /api/v1/interviews/:id/cancel
POST   /api/v1/interviews/:id/feedback
GET    /api/v1/interviews/:id/feedback

# AI Agents
POST   /api/v1/ai/screen-candidate            # Run AI screening
POST   /api/v1/ai/match-jobs                  # Find matching jobs for candidate
POST   /api/v1/ai/rank-candidates             # Rank candidates for a job
POST   /api/v1/ai/schedule-interview          # AI-powered scheduling
POST   /api/v1/ai/generate-outreach           # Generate personalized outreach
POST   /api/v1/ai/parse-resume                # Parse and extract resume data
GET    /api/v1/ai/actions                     # Get AI action history
POST   /api/v1/ai/actions/:id/approve         # Approve pending AI action

# Analytics
GET    /api/v1/analytics/overview
GET    /api/v1/analytics/pipeline
GET    /api/v1/analytics/time-to-hire
GET    /api/v1/analytics/source-quality
GET    /api/v1/analytics/conversion-rates

# Clients
GET    /api/v1/clients/:id
PUT    /api/v1/clients/:id
GET    /api/v1/clients/:id/users
POST   /api/v1/clients/:id/users
DELETE /api/v1/clients/:id/users/:userId

# Notifications
GET    /api/v1/notifications
PUT    /api/v1/notifications/:id/read
PUT    /api/v1/notifications/read-all
```

### GraphQL Schema (Key Types)

```graphql
type Query {
  # Candidates
  candidate(id: ID!): Candidate
  candidates(filter: CandidateFilter, pagination: Pagination): CandidateConnection
  candidateJobMatches(candidateId: ID!, limit: Int): [JobMatch!]!
  
  # Jobs
  job(id: ID!): Job
  jobs(filter: JobFilter, pagination: Pagination): JobConnection
  jobCandidates(jobId: ID!, ranked: Boolean): [CandidateMatch!]!
  
  # Applications
  application(id: ID!): Application
  applications(filter: ApplicationFilter, pagination: Pagination): ApplicationConnection
  
  # Analytics
  pipelineAnalytics(clientId: ID!, dateRange: DateRange): PipelineAnalytics
  hiringMetrics(clientId: ID!, dateRange: DateRange): HiringMetrics
}

type Mutation {
  # Applications
  createApplication(input: CreateApplicationInput!): Application
  updateApplicationStage(id: ID!, stage: ApplicationStage!): Application
  
  # AI Actions
  runAIScreening(applicationId: ID!): AIScreeningResult
  scheduleWithAI(input: AIScheduleInput!): Interview
  
  # Assessments
  sendAssessmentInvite(applicationId: ID!, testId: String!): Assessment
}

type Subscription {
  applicationUpdated(jobId: ID!): Application
  newCandidate(jobId: ID!): Candidate
  aiActionCompleted(clientId: ID!): AIAction
}
```

---

## iMocha Integration

### Configuration

```typescript
// config/imocha.ts
export const imochaConfig = {
  baseUrl: process.env.IMOCHA_API_URL || 'https://api.imocha.io/v1',
  apiKey: process.env.IMOCHA_API_KEY,
  tenantId: process.env.IMOCHA_TENANT_ID,
  webhookSecret: process.env.IMOCHA_WEBHOOK_SECRET,
  defaultExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days
  proctoring: {
    enabled: true,
    strictMode: false,
  }
};
```

### iMocha Service

```typescript
// services/imocha.service.ts
import axios from 'axios';
import { imochaConfig } from '../config/imocha';

export class IMochaService {
  private client = axios.create({
    baseURL: imochaConfig.baseUrl,
    headers: {
      'Authorization': `Bearer ${imochaConfig.apiKey}`,
      'X-Tenant-Id': imochaConfig.tenantId,
    }
  });

  // Get available tests
  async getTests(category?: string): Promise<IMochaTest[]> {
    const response = await this.client.get('/tests', {
      params: { category }
    });
    return response.data.tests;
  }

  // Send test invitation
  async inviteCandidate(params: {
    testId: string;
    candidateEmail: string;
    candidateName: string;
    expiresAt?: Date;
    callbackUrl?: string;
  }): Promise<IMochaInvitation> {
    const response = await this.client.post('/invitations', {
      test_id: params.testId,
      candidate: {
        email: params.candidateEmail,
        name: params.candidateName,
      },
      expires_at: params.expiresAt?.toISOString(),
      callback_url: params.callbackUrl,
      proctoring: imochaConfig.proctoring,
    });
    return response.data;
  }

  // Get assessment results
  async getResults(attemptId: string): Promise<IMochaResult> {
    const response = await this.client.get(`/attempts/${attemptId}/results`);
    return response.data;
  }

  // Get detailed skill breakdown
  async getSkillReport(attemptId: string): Promise<IMochaSkillReport> {
    const response = await this.client.get(`/attempts/${attemptId}/skill-report`);
    return response.data;
  }

  // Webhook handler
  async handleWebhook(payload: IMochaWebhookPayload): Promise<void> {
    switch (payload.event) {
      case 'test.started':
        await this.handleTestStarted(payload);
        break;
      case 'test.completed':
        await this.handleTestCompleted(payload);
        break;
      case 'test.expired':
        await this.handleTestExpired(payload);
        break;
    }
  }

  private async handleTestCompleted(payload: IMochaWebhookPayload) {
    const results = await this.getResults(payload.attempt_id);
    const skillReport = await this.getSkillReport(payload.attempt_id);
    
    // Update assessment in database
    await db.assessment.update({
      where: { imocha_attempt_id: payload.attempt_id },
      data: {
        status: 'completed',
        score: results.score,
        max_score: results.max_score,
        percentile: results.percentile,
        skill_scores: skillReport.skills,
        report_url: results.report_url,
        completed_at: new Date(),
      }
    });

    // Generate skill badges
    await this.generateSkillBadges(payload.candidate_id, skillReport);
    
    // Update application stage
    await this.updateApplicationStage(payload.attempt_id);
  }
}
```

---

## AI Agents Implementation

### Base Agent

```python
# agents/base_agent.py
from abc import ABC, abstractmethod
from langchain.chat_models import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
import logging

class BaseAgent(ABC):
    def __init__(self):
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            temperature=0.3,
            max_tokens=4096
        )
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @abstractmethod
    async def execute(self, input_data: dict) -> dict:
        pass
    
    async def log_action(self, action_type: str, input_data: dict, output_data: dict):
        # Log to database for audit trail
        pass
```

### Screening Agent

```python
# agents/screening_agent.py
from .base_agent import BaseAgent
from langchain.prompts import ChatPromptTemplate

class ScreeningAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert technical recruiter screening candidates.
            Analyze the candidate's profile against the job requirements.
            Provide:
            1. Match score (0-100)
            2. Key strengths (list)
            3. Potential concerns (list)
            4. Recommendation (proceed/review/reject)
            5. Summary (2-3 sentences)
            
            Be objective and focus on skills, experience, and role fit."""),
            ("human", """
            Job Requirements:
            {job_requirements}
            
            Candidate Profile:
            {candidate_profile}
            
            Resume Content:
            {resume_content}
            
            iMocha Assessment Results (if available):
            {assessment_results}
            """)
        ])
    
    async def execute(self, input_data: dict) -> dict:
        chain = self.prompt | self.llm
        
        response = await chain.ainvoke({
            "job_requirements": input_data["job_requirements"],
            "candidate_profile": input_data["candidate_profile"],
            "resume_content": input_data["resume_content"],
            "assessment_results": input_data.get("assessment_results", "Not available")
        })
        
        result = self.parse_response(response.content)
        
        await self.log_action(
            action_type="candidate_screening",
            input_data=input_data,
            output_data=result
        )
        
        return result
```

### Scheduling Agent

```python
# agents/scheduling_agent.py
from .base_agent import BaseAgent
from datetime import datetime, timedelta
import pytz

class SchedulingAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.india_tz = pytz.timezone('Asia/Kolkata')
        self.us_timezones = {
            'PST': pytz.timezone('America/Los_Angeles'),
            'MST': pytz.timezone('America/Denver'),
            'CST': pytz.timezone('America/Chicago'),
            'EST': pytz.timezone('America/New_York'),
        }
    
    async def execute(self, input_data: dict) -> dict:
        candidate_availability = input_data["candidate_availability"]
        interviewer_availability = input_data["interviewer_availability"]
        interview_duration = input_data.get("duration_minutes", 60)
        preferred_us_timezone = input_data.get("us_timezone", "PST")
        
        # Find overlapping slots considering timezones
        optimal_slots = self.find_optimal_slots(
            candidate_availability,
            interviewer_availability,
            interview_duration,
            preferred_us_timezone
        )
        
        if not optimal_slots:
            return {
                "success": False,
                "message": "No overlapping availability found",
                "suggested_action": "expand_availability"
            }
        
        # Select best slot (prefer candidate's working hours)
        best_slot = self.select_best_slot(optimal_slots)
        
        return {
            "success": True,
            "scheduled_time": best_slot["utc"],
            "candidate_local": best_slot["india"],
            "interviewer_local": best_slot["us"],
            "timezone_note": f"Candidate: IST, Interviewer: {preferred_us_timezone}"
        }
    
    def find_optimal_slots(self, candidate_avail, interviewer_avail, 
                           duration, us_tz_name):
        # Implementation for finding overlapping time slots
        # considering India and US timezone differences
        pass
```

### Resume Parser Service

```python
# services/resume_parser.py
from langchain.chat_models import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
import json

class ResumeParser:
    def __init__(self):
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            temperature=0
        )
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume parser. Extract structured data from resumes.
            Return a JSON object with the following structure:
            {
                "personal": {
                    "name": "",
                    "email": "",
                    "phone": "",
                    "location": "",
                    "linkedin": "",
                    "github": "",
                    "portfolio": ""
                },
                "summary": "",
                "experience": [
                    {
                        "company": "",
                        "title": "",
                        "location": "",
                        "start_date": "",
                        "end_date": "",
                        "current": false,
                        "description": "",
                        "achievements": []
                    }
                ],
                "education": [
                    {
                        "institution": "",
                        "degree": "",
                        "field": "",
                        "graduation_date": "",
                        "gpa": null
                    }
                ],
                "skills": {
                    "technical": [],
                    "soft": [],
                    "languages": [],
                    "certifications": []
                },
                "total_experience_years": 0
            }
            """),
            ("human", "Parse this resume:\n\n{resume_text}")
        ])
    
    async def parse(self, resume_text: str) -> dict:
        chain = self.prompt | self.llm
        response = await chain.ainvoke({"resume_text": resume_text})
        return json.loads(response.content)
```

---

## Frontend Components

### Key Components to Build

```
components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Tooltip.tsx
│   ├── Toast.tsx
│   ├── Skeleton.tsx
│   ├── DataTable.tsx
│   └── KanbanBoard.tsx
│
├── candidate/
│   ├── ProfileBuilder.tsx
│   ├── ResumeUploader.tsx
│   ├── SkillBadges.tsx
│   ├── JobMatchCard.tsx
│   ├── ApplicationTracker.tsx
│   ├── InterviewScheduler.tsx
│   ├── AssessmentWidget.tsx
│   └── VideoProfileRecorder.tsx
│
├── client/
│   ├── Dashboard.tsx
│   ├── JobComposer.tsx
│   ├── CandidatePipeline.tsx
│   ├── CandidateCard.tsx
│   ├── CandidateProfile.tsx
│   ├── InterviewScheduler.tsx
│   ├── FeedbackForm.tsx
│   ├── OfferManager.tsx
│   ├── AnalyticsCharts.tsx
│   └── AIAgentFeed.tsx
│
└── shared/
    ├── Header.tsx
    ├── Sidebar.tsx
    ├── NotificationBell.tsx
    ├── SearchBar.tsx
    └── ThemeToggle.tsx
```

---

## Environment Variables

```bash
# .env.example

# App
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/viraworkx
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-...

# iMocha
IMOCHA_API_URL=https://api.imocha.io/v1
IMOCHA_API_KEY=your-imocha-api-key
IMOCHA_TENANT_ID=your-tenant-id
IMOCHA_WEBHOOK_SECRET=your-webhook-secret

# Email (SendGrid)
SENDGRID_API_KEY=SG...
EMAIL_FROM=noreply@viraworkx.ai

# SMS/WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TWILIO_WHATSAPP_NUMBER=+1...

# Video (Zoom or similar)
ZOOM_API_KEY=...
ZOOM_API_SECRET=...

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=viraworkx-files
AWS_REGION=us-west-2

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Monitoring
DATADOG_API_KEY=...
SENTRY_DSN=...
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Local Development

```bash
# Clone repository
git clone https://github.com/viraworkx/platform.git
cd platform

# Install dependencies
npm install
cd apps/ai-engine && pip install -r requirements.txt && cd ../..

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start databases
docker-compose up -d postgres redis elasticsearch

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start development servers
npm run dev          # Starts all services
# OR individually:
npm run dev:web      # Frontend on :3000
npm run dev:api      # Backend on :4000
npm run dev:ai       # AI engine on :5000
```

---

## Deployment Checklist

- [ ] Set up production database (RDS/Cloud SQL)
- [ ] Configure Redis cluster
- [ ] Set up Elasticsearch cluster
- [ ] Configure S3 bucket with proper permissions
- [ ] Set up SSL certificates
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipelines
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Load testing
- [ ] Security audit
- [ ] GDPR/SOC2 compliance review

---

## Contact

For questions about this specification, contact the ViraWorkx engineering team.
