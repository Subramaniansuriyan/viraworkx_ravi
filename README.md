# ViraWorkx.ai

> AI-Powered Global Recruiting Platform connecting US-based startups with technical talent from India

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18.x-61dafb.svg)](https://reactjs.org/)

**Live URL:** https://www.viraworkx.ai/

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [AI Agents](#ai-agents)
- [iMocha Integration](#imocha-integration)
- [Real-time Features](#real-time-features)
- [Background Jobs](#background-jobs)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

ViraWorkx.ai is a comprehensive AI-powered recruiting platform that streamlines the hiring process between US-based startups and technical talent from India. The platform features:

- **Agentic AI Capabilities** - Automated screening, matching, and scheduling
- **Human-in-the-Loop (HITL)** - Admin oversight for AI decisions
- **iMocha Integration** - Skill assessments and verified badges
- **Dual Portals** - Separate experiences for candidates and clients
- **Real-time Updates** - WebSocket-powered notifications

---

## Key Features

### For Candidates
- Profile builder with resume parsing
- AI-powered job matching
- Skill assessments via iMocha
- Verified skill badges
- Application tracking
- Interview scheduling

### For Clients (Employers)
- Job posting with AI-generated descriptions
- Candidate pipeline management (Kanban)
- AI-ranked candidate recommendations
- Assessment management
- Interview scheduling
- Analytics dashboard

### For Admins (ViraWorkx Team)
- Human-in-the-Loop AI oversight
- Test allocation management
- Client and candidate management
- Audit logging
- Platform settings

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Candidate  │  │    Client    │  │    Admin     │                      │
│  │    Portal    │  │    Portal    │  │    Portal    │                      │
│  │  (React/TS)  │  │  (React/TS)  │  │  (React/TS)  │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
│         │                 │                 │                               │
│         └─────────────────┼─────────────────┘                               │
│                           │                                                 │
│                    ┌──────┴──────┐                                          │
│                    │   Vite Dev  │                                          │
│                    │   Server    │                                          │
│                    │  (Port 5000)│                                          │
│                    └──────┬──────┘                                          │
│                           │                                                 │
└───────────────────────────┼─────────────────────────────────────────────────┘
                            │ HTTP/WebSocket
┌───────────────────────────┼─────────────────────────────────────────────────┐
│                      API LAYER                                              │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                           │                                                 │
│                    ┌──────┴──────┐                                          │
│                    │   Express   │                                          │
│                    │   Server    │                                          │
│                    │  (Port 4000)│                                          │
│                    └──────┬──────┘                                          │
│                           │                                                 │
│         ┌─────────────────┼─────────────────┐                               │
│         │                 │                 │                               │
│  ┌──────┴──────┐  ┌───────┴──────┐  ┌──────┴──────┐                        │
│  │  REST API   │  │   GraphQL    │  │  Socket.io  │                        │
│  │  /api/v1/*  │  │   /graphql   │  │  WebSocket  │                        │
│  └──────┬──────┘  └───────┬──────┘  └──────┬──────┘                        │
│         │                 │                 │                               │
│         └─────────────────┼─────────────────┘                               │
│                           │                                                 │
│                    ┌──────┴──────┐                                          │
│                    │   BullMQ    │                                          │
│                    │ Job Queues  │                                          │
│                    └──────┬──────┘                                          │
│                           │                                                 │
└───────────────────────────┼─────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────────┐
│                      DATA LAYER                                             │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                           │                                                 │
│    ┌──────────────┐ ┌─────┴─────┐ ┌──────────────┐ ┌──────────────┐        │
│    │  PostgreSQL  │ │   Redis   │ │Elasticsearch │ │   AWS S3     │        │
│    │   (Primary)  │ │  (Cache)  │ │   (Search)   │ │  (Storage)   │        │
│    │  Port 5432   │ │ Port 6379 │ │  Port 9200   │ │              │        │
│    └──────────────┘ └───────────┘ └──────────────┘ └──────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│    │   iMocha     │ │   Claude     │ │   SendGrid   │ │    Zoom      │     │
│    │ Assessments  │ │  AI (LLM)    │ │   (Email)    │ │  (Meetings)  │     │
│    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CANDIDATE APPLICATION FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

  Candidate          Frontend           API              AI Engine        iMocha
     │                  │                │                   │               │
     │ Apply to Job     │                │                   │               │
     ├─────────────────>│                │                   │               │
     │                  │ POST /apply    │                   │               │
     │                  ├───────────────>│                   │               │
     │                  │                │ Screen Candidate  │               │
     │                  │                ├──────────────────>│               │
     │                  │                │                   │               │
     │                  │                │<── Match Score ───┤               │
     │                  │                │                   │               │
     │                  │                │ [If HITL Required]│               │
     │                  │                │ Queue for Review  │               │
     │                  │                ├──────────┐        │               │
     │                  │                │          │        │               │
     │                  │                │<─────────┘        │               │
     │                  │                │                   │               │
     │                  │                │ [Admin Approves]  │               │
     │                  │                │                   │               │
     │                  │                │ Send Assessment   │               │
     │                  │                ├───────────────────┼──────────────>│
     │                  │                │                   │               │
     │ Receive Invite   │                │<──────────────────┼───────────────┤
     │<─────────────────┼────────────────┤                   │               │
     │                  │                │                   │               │
     │ Complete Test    │                │                   │               │
     ├─────────────────────────────────────────────────────────────────────>│
     │                  │                │                   │               │
     │                  │                │ Webhook: Complete │               │
     │                  │                │<──────────────────┼───────────────┤
     │                  │                │                   │               │
     │                  │                │ Update Score &    │               │
     │                  │                │ Generate Badges   │               │
     │                  │                ├──────────┐        │               │
     │                  │                │          │        │               │
     │                  │                │<─────────┘        │               │
     │                  │                │                   │               │
     │ View Results     │                │                   │               │
     │<─────────────────┼────────────────┤                   │               │
     │                  │                │                   │               │
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Zustand | State Management |
| TanStack Query | Data Fetching |
| React Hook Form | Form Handling |
| Zod | Validation |
| Lucide React | Icons |
| Recharts | Charts |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20+ | Runtime |
| Express.js | Web Framework |
| TypeScript | Type Safety |
| Prisma | ORM |
| GraphQL (Apollo) | Query API |
| Socket.io | WebSockets |
| BullMQ | Job Queues |
| JWT | Authentication |
| Zod | Validation |

### Database & Storage
| Technology | Purpose |
|------------|---------|
| PostgreSQL 15 | Primary Database |
| Redis 7 | Cache & Queues |
| Elasticsearch 8 | Search Engine |
| AWS S3 | File Storage |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Claude API | LLM for AI Agents |
| LangChain | AI Orchestration |
| spaCy | NLP Processing |

### External Services
| Service | Purpose |
|---------|---------|
| iMocha | Skill Assessments |
| SendGrid | Email Delivery |
| Twilio | SMS/WhatsApp |
| Zoom | Video Interviews |

---

## Project Structure

```
viraworkx/
├── apps/
│   ├── web/                          # React Frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Shared UI components
│   │   │   │   ├── candidate/        # Candidate portal components
│   │   │   │   ├── client/           # Client portal components
│   │   │   │   ├── admin/            # Admin portal components
│   │   │   │   └── shared/           # Shared components
│   │   │   ├── pages/
│   │   │   │   ├── auth/             # Login, Register
│   │   │   │   ├── candidate/        # Candidate pages
│   │   │   │   ├── client/           # Client pages
│   │   │   │   ├── admin/            # Admin pages
│   │   │   │   └── jobs/             # Public job pages
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── services/             # API services
│   │   │   ├── types/                # TypeScript types
│   │   │   └── utils/                # Utilities
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── api/                          # Node.js Backend
│   │   ├── src/
│   │   │   ├── routes/               # API routes
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── candidate.routes.ts
│   │   │   │   ├── client.routes.ts
│   │   │   │   ├── job.routes.ts
│   │   │   │   ├── application.routes.ts
│   │   │   │   ├── assessment.routes.ts
│   │   │   │   ├── interview.routes.ts
│   │   │   │   ├── notification.routes.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   └── ai.routes.ts
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── imocha.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   └── ai.service.ts
│   │   │   ├── middleware/           # Express middleware
│   │   │   ├── graphql/              # GraphQL schema
│   │   │   ├── jobs/                 # BullMQ workers
│   │   │   ├── websocket/            # Socket.io handlers
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── ai-engine/                    # Python AI Services (Future)
│       ├── agents/
│       ├── services/
│       └── requirements.txt
│
├── packages/
│   ├── shared/                       # Shared types/utilities
│   └── db/                           # Prisma schema
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── package.json
│
├── infrastructure/                   # IaC (Future)
│   ├── terraform/
│   ├── kubernetes/
│   └── docker/
│
├── docker-compose.yml                # Local development
├── package.json                      # Root package.json
├── e2e-test.sh                      # E2E test script
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/viraworkx/platform.git
   cd viraworkx
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start databases**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Seed the database**
   ```bash
   npm run db:seed
   ```

7. **Start development servers**
   ```bash
   npm run dev
   ```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5000 |
| API | http://localhost:4000 |
| GraphQL Playground | http://localhost:4000/graphql |
| API Health | http://localhost:4000/health |

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@viraworkx.ai` | `password123` |
| Client | `hiring@techflow.ai` | `password123` |
| Client | `recruiter@payscale.finance` | `password123` |
| Client | `hr@medconnect.io` | `password123` |
| Candidate | `rahul.sharma@gmail.com` | `password123` |
| Candidate | `priya.patel@outlook.com` | `password123` |
| Candidate | `amit.kumar@yahoo.com` | `password123` |
| Candidate | `sneha.reddy@gmail.com` | `password123` |
| Candidate | `vikram.singh@gmail.com` | `password123` |

---

## Environment Variables

```bash
# Application
NODE_ENV=development
APP_URL=http://localhost:5000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://viraworkx:viraworkx123@localhost:5432/viraworkx

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
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

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=viraworkx-files
AWS_REGION=us-west-2

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │  candidates │       │   clients   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │───┬───│ id (PK)     │       │ id (PK)     │
│ email       │   │   │ user_id(FK) │       │ company_name│
│ user_type   │   │   │ first_name  │       │ plan_tier   │
│ status      │   │   │ last_name   │       │ industry    │
└─────────────┘   │   │ skills[]    │       └──────┬──────┘
                  │   │ resume_url  │              │
                  │   └──────┬──────┘              │
                  │          │                     │
                  │          │                     │
                  │   ┌──────┴──────┐       ┌──────┴──────┐
                  │   │applications │       │    jobs     │
                  │   ├─────────────┤       ├─────────────┤
                  │   │ id (PK)     │───────│ id (PK)     │
                  │   │candidate_id │       │ client_id   │
                  │   │ job_id (FK) │       │ title       │
                  │   │ stage       │       │ status      │
                  │   │ match_score │       │ skills_req[]│
                  │   └──────┬──────┘       └─────────────┘
                  │          │
                  │   ┌──────┴──────┐       ┌─────────────┐
                  │   │ assessments │       │skill_badges │
                  │   ├─────────────┤       ├─────────────┤
                  │   │ id (PK)     │       │ id (PK)     │
                  │   │application_id       │candidate_id │
                  │   │ imocha_id   │       │ skill_name  │
                  │   │ score       │       │ badge_level │
                  │   │ status      │       │ percentile  │
                  │   └─────────────┘       └─────────────┘
                  │
                  │   ┌─────────────┐       ┌─────────────┐
                  └───│client_users │       │ ai_actions  │
                      ├─────────────┤       ├─────────────┤
                      │ id (PK)     │       │ id (PK)     │
                      │ client_id   │       │ agent_type  │
                      │ user_id     │       │ action_type │
                      │ role        │       │ status      │
                      └─────────────┘       │ match_score │
                                            └─────────────┘
```

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | All user accounts (candidates, clients, admins) |
| `candidates` | Candidate profiles and details |
| `clients` | Company/employer accounts |
| `client_users` | Team members of client companies |
| `jobs` | Job postings |
| `applications` | Job applications |
| `assessments` | iMocha test assignments |
| `skill_badges` | Verified skill badges |
| `interviews` | Interview schedules |
| `interview_feedback` | Interview evaluations |
| `ai_actions` | AI agent action audit log |
| `notifications` | User notifications |

---

## API Documentation

### REST API Endpoints

#### Authentication
```
POST   /api/v1/auth/register      # Register new user
POST   /api/v1/auth/login         # Login
POST   /api/v1/auth/logout        # Logout
POST   /api/v1/auth/refresh       # Refresh token
GET    /api/v1/auth/me            # Get current user
```

#### Candidates
```
GET    /api/v1/candidates                    # List candidates (admin)
GET    /api/v1/candidates/:id                # Get candidate
GET    /api/v1/candidates/me/profile         # Get my profile
PUT    /api/v1/candidates/me/profile         # Update my profile
POST   /api/v1/candidates/me/resume          # Upload resume
GET    /api/v1/candidates/me/applications    # My applications
GET    /api/v1/candidates/me/job-matches     # AI job recommendations
```

#### Jobs
```
GET    /api/v1/jobs                  # List jobs
GET    /api/v1/jobs/:id              # Get job details
POST   /api/v1/jobs                  # Create job (client)
PUT    /api/v1/jobs/:id              # Update job
DELETE /api/v1/jobs/:id              # Delete job
POST   /api/v1/jobs/:id/publish      # Publish job
GET    /api/v1/jobs/:id/applications # Job applications
GET    /api/v1/jobs/:id/candidates   # AI-ranked candidates
```

#### Applications
```
GET    /api/v1/applications              # List applications
GET    /api/v1/applications/:id          # Get application
POST   /api/v1/applications              # Create application
PUT    /api/v1/applications/:id/stage    # Update stage
POST   /api/v1/applications/:id/shortlist # Shortlist
POST   /api/v1/applications/:id/reject   # Reject
```

#### Assessments (iMocha)
```
GET    /api/v1/assessments                           # List assessments
GET    /api/v1/assessments/tests                     # Available tests
POST   /api/v1/assessments/invite                    # Send invitation
GET    /api/v1/assessments/:id/report                # Get report
POST   /api/v1/assessments/webhook                   # iMocha webhook
GET    /api/v1/assessments/admin/pending-allocation  # Pending allocations
POST   /api/v1/assessments/admin/allocate            # Allocate test
```

#### AI Endpoints
```
POST   /api/v1/ai/screen-candidate    # AI screening
POST   /api/v1/ai/match-jobs          # Job matching
POST   /api/v1/ai/rank-candidates     # Rank candidates
POST   /api/v1/ai/parse-resume        # Parse resume
```

### GraphQL API

Access GraphQL Playground at `http://localhost:4000/graphql`

```graphql
# Example Queries
query GetJobs {
  jobs(filter: { status: "active" }, pagination: { page: 1, limit: 10 }) {
    jobs {
      id
      title
      location
      client {
        companyName
      }
    }
    total
  }
}

query GetCandidate($id: ID!) {
  candidate(id: $id) {
    firstName
    lastName
    skills
    applications {
      job {
        title
      }
      stage
      matchScore
    }
  }
}

# Example Mutations
mutation CreateApplication($input: CreateApplicationInput!) {
  createApplication(input: $input) {
    id
    stage
    matchScore
  }
}
```

---

## Authentication

### JWT Token Flow

```
┌─────────┐          ┌─────────┐          ┌─────────┐
│ Client  │          │   API   │          │   DB    │
└────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │
     │ POST /auth/login   │                    │
     │ {email, password}  │                    │
     ├───────────────────>│                    │
     │                    │ Verify credentials │
     │                    ├───────────────────>│
     │                    │<───────────────────┤
     │                    │                    │
     │  {accessToken,     │                    │
     │   refreshToken}    │                    │
     │<───────────────────┤                    │
     │                    │                    │
     │ GET /api/resource  │                    │
     │ Authorization:     │                    │
     │ Bearer <token>     │                    │
     ├───────────────────>│                    │
     │                    │ Verify JWT         │
     │                    ├──┐                 │
     │                    │<─┘                 │
     │                    │                    │
     │   {data}           │                    │
     │<───────────────────┤                    │
     │                    │                    │
```

### Role-Based Access Control

| Role | Access |
|------|--------|
| `admin` | Full platform access, HITL oversight |
| `client` | Company jobs, applications, candidates |
| `candidate` | Own profile, applications, assessments |

---

## AI Agents

### Screening Agent

Analyzes candidate profiles against job requirements:

```typescript
// Input
{
  candidate: { profile, resume, skills },
  job: { requirements, skills_required }
}

// Output
{
  matchScore: 85,
  strengths: ["5+ years React", "AWS certified"],
  concerns: ["No GraphQL experience"],
  recommendation: "proceed",
  summary: "Strong frontend candidate..."
}
```

### Human-in-the-Loop Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI Agent    │────>│  Review      │────>│   Action     │
│  Decision    │     │  Queue       │     │   Executed   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │    Admin     │
                     │   Approval   │
                     └──────────────┘
```

Conditions requiring HITL review:
- Match score between 60-75% (borderline)
- Missing critical skills
- Unusual patterns detected
- First-time client/job

---

## iMocha Integration

### Assessment Flow

1. **Test Allocation** (Admin)
   - Admin reviews matched candidate
   - Selects appropriate iMocha test
   - Sets expiration and notes

2. **Invitation Sent**
   - Candidate receives email with test link
   - Assessment record created in database

3. **Test Completion**
   - Candidate completes test on iMocha
   - Webhook received with results

4. **Results Processing**
   - Score and skill breakdown stored
   - Skill badges generated
   - Application stage updated

### Webhook Handler

```typescript
POST /api/v1/assessments/webhook

// Payload from iMocha
{
  event: "test.completed",
  attempt_id: "abc123",
  candidate_email: "user@example.com",
  score: 85,
  max_score: 100,
  skills: [
    { name: "JavaScript", score: 90, percentile: 85 },
    { name: "React", score: 80, percentile: 75 }
  ]
}
```

---

## Real-time Features

### WebSocket Events

```typescript
// Client connection
socket.on('connect', () => {
  socket.emit('authenticate', { token: accessToken })
})

// Subscribe to updates
socket.emit('subscribe:applications', { jobId })
socket.emit('subscribe:notifications')

// Receive events
socket.on('application:updated', (data) => { ... })
socket.on('notification:new', (data) => { ... })
socket.on('candidate:new', (data) => { ... })
```

### Event Types

| Event | Description |
|-------|-------------|
| `application:created` | New application submitted |
| `application:updated` | Application stage changed |
| `assessment:completed` | Assessment finished |
| `interview:scheduled` | Interview scheduled |
| `notification:new` | New notification |

---

## Background Jobs

### Job Queues (BullMQ)

| Queue | Purpose |
|-------|---------|
| `email` | Send emails via SendGrid |
| `assessment` | Process assessment results |
| `ai-screening` | Run AI candidate screening |
| `notifications` | Send push/in-app notifications |

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `cleanup-expired-assessments` | Daily | Mark expired assessments |
| `send-reminder-emails` | Hourly | Send pending reminders |
| `sync-imocha-results` | Every 15min | Sync assessment results |
| `generate-analytics` | Daily | Compute analytics |

---

## Testing

### Run E2E Tests

```bash
# Run full E2E test suite
./e2e-test.sh
```

### Test Coverage

| Category | Tests |
|----------|-------|
| Infrastructure | API health, Frontend |
| Authentication | Login (all roles), Token refresh |
| Admin Portal | Clients, Candidates, Allocations |
| Client Portal | Jobs CRUD, Applications, Analytics |
| Candidate Portal | Profile, Applications, Assessments |
| Integrations | iMocha, GraphQL, WebSocket |

### Manual Testing URLs

```
# Admin Portal
http://localhost:5000/admin/dashboard
http://localhost:5000/admin/clients
http://localhost:5000/admin/candidates
http://localhost:5000/admin/test-allocation
http://localhost:5000/admin/audit-log
http://localhost:5000/admin/settings

# Client Portal
http://localhost:5000/client/dashboard
http://localhost:5000/client/jobs
http://localhost:5000/client/jobs/new

# Candidate Portal
http://localhost:5000/dashboard
http://localhost:5000/profile
http://localhost:5000/applications
http://localhost:5000/jobs
```

---

## Deployment

### Docker Compose (Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Checklist

- [ ] Set up production PostgreSQL (RDS/Cloud SQL)
- [ ] Configure Redis cluster
- [ ] Set up Elasticsearch cluster
- [ ] Configure S3 bucket with proper permissions
- [ ] Set up SSL certificates
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipelines
- [ ] Configure monitoring (DataDog/Prometheus)
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Load testing
- [ ] Security audit
- [ ] GDPR/SOC2 compliance review

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Update documentation as needed

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For questions or support, contact the ViraWorkx engineering team at engineering@viraworkx.ai

---

Built with ❤️ by ViraWorkx
