# ViraWorkx.ai - AI-Powered Recruiting Platform

## Quick Start
```bash
npm run docker:up     # Start databases
npm install           # Install dependencies
npm run db:push       # Create tables
npm run dev           # Start web + api
```

## Architecture
- `apps/web` - React + TypeScript + Tailwind (port 3000)
- `apps/api` - Node.js + Express (port 4000)
- `apps/ai-engine` - Python + FastAPI (port 5000)
- `packages/db` - Prisma schema

## Key Features to Build
1. **Candidate Portal**: Profile, resume upload, job matching, applications
2. **Client Portal**: Job posting, candidate pipeline, interviews
3. **iMocha Integration**: Send assessments, receive scores
4. **AI Agents**: Screening, scheduling, communication

## Database
Schema in `packages/db/prisma/schema.prisma`

## API Endpoints
- `GET /api/v1/candidates` - List candidates
- `GET /api/v1/jobs` - List jobs
- `POST /api/v1/auth/login` - Authentication
- `POST /api/v1/ai/screen` - AI screening

## Environment
Edit `.env` for API keys (Anthropic, iMocha, etc.)
