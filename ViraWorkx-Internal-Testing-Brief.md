# ViraWorkx.ai - Internal Testing Brief

**Date:** January 29, 2026 | **Environment:** GCP Production (us-central1) | **Status:** Alpha

---

## Access

| Service | URL |
|---------|-----|
| Web App | https://viraworkx-web-668077541916.us-central1.run.app |
| API     | https://viraworkx-api-668077541916.us-central1.run.app |

---

## Test Accounts

**Password for all accounts:** `V1r@W0rkx#2026!`

| Role | Email | Context |
|------|-------|---------|
| **Admin** | admin@viraworkx.ai | Platform admin (Rahul Ramachandran, CEO) |
| **Client** | hiring@techflow.ai | TechFlow AI - Owner (Growth tier) |
| **Client** | recruiter@payscale.finance | PayScale Finance - Hiring Manager (Enterprise tier) |
| **Client** | hr@medconnect.io | MedConnect - Admin (Startup tier) |
| **Candidate** | rahul.sharma@gmail.com | Full Stack Developer, 6 yrs, Bangalore |
| **Candidate** | priya.patel@outlook.com | ML Engineer, 4 yrs, Mumbai |
| **Candidate** | vikram.singh@gmail.com | Backend/Staff Engineer, 7 yrs, Delhi |

---

## What's Working Now

- **Authentication** - Login, registration, JWT-based sessions, role-based access (admin/client/candidate)
- **Admin Console** - Dashboard overview, candidate management, client management, audit log
- **Candidate Portal** - Profile viewing, job browsing, application tracking
- **Client Portal** - Job posting management, candidate pipeline view, application review
- **Job Listings** - 5 active jobs across 3 companies (Full Stack, ML, Backend, DevOps, Frontend)
- **Application Pipeline** - Applications at various stages (new, screening, assessment, interview, shortlisted, offer)
- **Assessment Results** - Completed iMocha-style assessments with skill scores and tier rankings
- **Skill Badges** - Verified skill badges for candidates (Python, TensorFlow, Kubernetes, AWS, NLP)
- **Contract Generation** - PDF contract creation with dual-party digital signatures
- **GraphQL API** - Full query/mutation support alongside REST endpoints
- **Database** - Cloud SQL (PostgreSQL 15), SSL-only, no public network access

---

## In Progress / Not Yet Available

| Feature | Status | Notes |
|---------|--------|-------|
| **AI Screening Agent** | Planned | Claude-powered candidate screening and ranking (requires Anthropic API key) |
| **AI Resume Parser** | Planned | Automated resume extraction via Python AI engine |
| **iMocha Live Integration** | Stubbed | Assessment data is seeded; live API integration pending iMocha credentials |
| **Real-time Notifications** | Planned | Socket.io infrastructure exists but WebSocket not enabled on Cloud Run |
| **Background Job Processing** | Disabled | BullMQ/Redis workers disabled in this deployment (no Redis) |
| **Email Notifications** | Planned | SendGrid integration not configured |
| **File Uploads (Resume/Video)** | Planned | S3/GCS bucket not provisioned |
| **Elasticsearch Search** | Planned | Full-text search not deployed; basic DB search active |
| **Interview Scheduling** | Partial | Data model ready; calendar/Zoom integration pending |
| **Analytics Dashboard** | Partial | UI exists; real-time metrics require background aggregation |
| **Custom Domain & SSL** | Pending | Currently on Cloud Run default URLs |

---

## Testing Checklist

1. [ ] Login as admin (`admin@viraworkx.ai`) - verify dashboard loads with stats
2. [ ] Navigate to Candidates page - verify 5 candidates listed with scores and tiers
3. [ ] Navigate to Clients page - verify 3 companies with tier badges
4. [ ] Logout, login as client (`hiring@techflow.ai`) - verify client dashboard
5. [ ] View job postings - verify 2 jobs for TechFlow AI
6. [ ] View candidate pipeline for a job - verify applications at different stages
7. [ ] Logout, login as candidate (`vikram.singh@gmail.com`) - verify candidate portal
8. [ ] Browse available jobs - verify job listings load
9. [ ] View application status - verify offer stage for Backend Engineer role
10. [ ] Test contract generation and signature flow (if available in UI)

---

## Infrastructure

| Component | Service | Spec |
|-----------|---------|------|
| API Server | Cloud Run | 512Mi / 1 vCPU, 0-3 instances, scale-to-zero |
| Web Server | Cloud Run | 256Mi / 1 vCPU, 0-3 instances, nginx + React SPA |
| Database | Cloud SQL | PostgreSQL 15, db-f1-micro, SSL required |
| Container Registry | Artifact Registry | us-central1 |
| **Est. Monthly Cost** | | **~$7-12/month** (scale-to-zero + micro DB) |

---

*Please report issues or feedback to the engineering team. This is an alpha deployment for internal validation only.*
