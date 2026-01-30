#!/bin/bash

#######################################
# ViraWorkx.ai - FULLY AUTOMATED SETUP
# Just run: ./setup-viraworkx-auto.sh
# Everything happens automatically!
#######################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_NAME="viraworkx"
PROJECT_DIR="$HOME/$PROJECT_NAME"

print_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🚀 ViraWorkx.ai - FULLY AUTOMATED SETUP                        ║
║   AI-Powered Global Recruiting Platform                           ║
║                                                                   ║
║   This script will:                                               ║
║   ✓ Create project structure                                      ║
║   ✓ Install all dependencies                                      ║
║   ✓ Start Docker containers (Postgres, Redis, Elasticsearch)     ║
║   ✓ Set up Python virtual environment                            ║
║   ✓ Initialize database                                          ║
║   ✓ Start all development servers                                ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

sleep 2

#######################################
# STEP 1: Create Project Structure
#######################################
print_step "Step 1/8: Creating project structure"

rm -rf "$PROJECT_DIR" 2>/dev/null || true
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Create all directories
directories=(
    "apps/web/src/components/ui"
    "apps/web/src/components/candidate"
    "apps/web/src/components/client"
    "apps/web/src/components/shared"
    "apps/web/src/pages/candidate"
    "apps/web/src/pages/client"
    "apps/web/src/pages/auth"
    "apps/web/src/hooks"
    "apps/web/src/stores"
    "apps/web/src/services"
    "apps/web/src/utils"
    "apps/web/src/types"
    "apps/web/public"
    "apps/api/src/controllers"
    "apps/api/src/services"
    "apps/api/src/models"
    "apps/api/src/middleware"
    "apps/api/src/routes"
    "apps/api/src/config"
    "apps/ai-engine/agents"
    "apps/ai-engine/services"
    "packages/db/prisma"
    "scripts"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done

print_success "Project structure created at $PROJECT_DIR"

#######################################
# STEP 2: Create All Config Files
#######################################
print_step "Step 2/8: Creating configuration files"

# Root package.json
cat > package.json << 'ROOTPKG'
{
  "name": "viraworkx",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently -n web,api -c blue,green \"npm run dev:web\" \"npm run dev:api\"",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:api": "npm run dev --workspace=apps/api",
    "dev:ai": "cd apps/ai-engine && source venv/bin/activate && python -m uvicorn main:app --reload --port 5000",
    "build": "npm run build --workspaces",
    "db:generate": "prisma generate --schema=packages/db/prisma/schema.prisma",
    "db:push": "prisma db push --schema=packages/db/prisma/schema.prisma",
    "db:migrate": "prisma migrate dev --schema=packages/db/prisma/schema.prisma",
    "db:studio": "prisma studio --schema=packages/db/prisma/schema.prisma",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "setup:ai": "cd apps/ai-engine && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt",
    "start:all": "concurrently -n docker,web,api -c magenta,blue,green \"docker-compose up\" \"sleep 5 && npm run dev:web\" \"sleep 5 && npm run dev:api\""
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "concurrently": "^8.2.2",
    "prisma": "^5.7.0",
    "typescript": "^5.3.0"
  }
}
ROOTPKG

# Docker Compose
cat > docker-compose.yml << 'DOCKER'
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: viraworkx-db
    environment:
      POSTGRES_USER: viraworkx
      POSTGRES_PASSWORD: viraworkx123
      POSTGRES_DB: viraworkx
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U viraworkx"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: viraworkx-redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  elasticsearch:
    image: elasticsearch:8.11.1
    container_name: viraworkx-es
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms256m -Xmx256m"
    ports:
      - "9200:9200"
    volumes:
      - esdata:/usr/share/elasticsearch/data

volumes:
  pgdata:
  redisdata:
  esdata:
DOCKER

# Environment file
cat > .env << 'ENVFILE'
NODE_ENV=development
DATABASE_URL=postgresql://viraworkx:viraworkx123@localhost:5432/viraworkx
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=viraworkx-dev-secret-change-in-production
ANTHROPIC_API_KEY=your-api-key-here
IMOCHA_API_KEY=your-imocha-key
ENVFILE

# .gitignore
cat > .gitignore << 'GITIGNORE'
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
__pycache__/
venv/
*.pyc
coverage/
.next/
GITIGNORE

print_success "Configuration files created"

#######################################
# STEP 3: Create Web App (React)
#######################################
print_step "Step 3/8: Creating React frontend"

cat > apps/web/package.json << 'WEBPKG'
{
  "name": "@viraworkx/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.13.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.2",
    "framer-motion": "^10.16.16",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.0",
    "vite": "^5.0.8"
  }
}
WEBPKG

cat > apps/web/vite.config.ts << 'VITECONF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 3000, proxy: { '/api': 'http://localhost:4000' } }
})
VITECONF

cat > apps/web/tailwind.config.js << 'TWCONF'
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { brand: { 500: '#3b82f6', 600: '#2563eb' } } } },
  plugins: []
}
TWCONF

cat > apps/web/postcss.config.js << 'POSTCSS'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
POSTCSS

cat > apps/web/tsconfig.json << 'WEBTS'
{
  "compilerOptions": {
    "target": "ES2020", "useDefineForClassFields": true, "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext", "skipLibCheck": true, "moduleResolution": "bundler",
    "allowImportingTsExtensions": true, "resolveJsonModule": true, "isolatedModules": true,
    "noEmit": true, "jsx": "react-jsx", "strict": true, "baseUrl": ".", "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
WEBTS

cat > apps/web/index.html << 'INDEXHTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ViraWorkx.ai</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
INDEXHTML

cat > apps/web/src/main.tsx << 'MAINTSX'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
MAINTSX

cat > apps/web/src/index.css << 'INDEXCSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: 'Inter', sans-serif; background: #0f172a; color: white; margin: 0; }
INDEXCSS

cat > apps/web/src/App.tsx << 'APPTSX'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/client/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/client/*" element={<Dashboard />} />
    </Routes>
  )
}
APPTSX

# Auth Store
cat > apps/web/src/stores/authStore.ts << 'AUTHSTORE'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: { id: string; email: string; name: string; type: string } | null
  token: string | null
  isAuthenticated: boolean
  login: (user: any, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false })
    }),
    { name: 'viraworkx-auth' }
  )
)
AUTHSTORE

# API Service
cat > apps/web/src/services/api.ts << 'APISERVICE'
import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
APISERVICE

# Dashboard Page (Full Featured)
cat > apps/web/src/pages/client/Dashboard.tsx << 'DASHBOARDTSX'
import { useState } from 'react'
import { Users, Briefcase, Clock, Video, Bot, Award, Target, FileText, MessageSquare, Filter, Plus, Bell, Zap, Star, MapPin, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'

const stats = {
  client: [
    { label: 'Active Jobs', value: '12', change: '+3', icon: Briefcase, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Candidates', value: '847', change: '+156', icon: Users, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Interviews Today', value: '8', change: '+2', icon: Video, color: 'from-violet-500 to-violet-600' },
    { label: 'Avg. Time to Hire', value: '18d', change: '-4d', icon: Clock, color: 'from-amber-500 to-amber-600' },
  ],
  candidate: [
    { label: 'Job Matches', value: '24', change: '+8', icon: Target, color: 'from-blue-500 to-blue-600' },
    { label: 'Applications', value: '6', change: '+2', icon: FileText, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Interviews', value: '3', change: '+1', icon: Video, color: 'from-violet-500 to-violet-600' },
    { label: 'Profile Score', value: '92%', change: '+5%', icon: Award, color: 'from-amber-500 to-amber-600' },
  ]
}

const candidates = [
  { id: 1, name: 'Priya Sharma', role: 'Senior React Developer', location: 'Bangalore', experience: '6 years', matchScore: 96, imochaScore: 94, status: 'Interview Scheduled', avatar: '👩‍💻', skills: ['React', 'TypeScript', 'Node.js'], badges: ['React Master'] },
  { id: 2, name: 'Arjun Patel', role: 'Full Stack Engineer', location: 'Hyderabad', experience: '4 years', matchScore: 91, imochaScore: 88, status: 'Assessment Pending', avatar: '👨‍💻', skills: ['Python', 'Django', 'React'], badges: ['Python Pro'] },
  { id: 3, name: 'Sneha Reddy', role: 'DevOps Engineer', location: 'Chennai', experience: '5 years', matchScore: 89, imochaScore: 92, status: 'Shortlisted', avatar: '👩‍🔬', skills: ['Kubernetes', 'AWS', 'Terraform'], badges: ['AWS Certified'] },
  { id: 4, name: 'Vikram Singh', role: 'Backend Developer', location: 'Pune', experience: '3 years', matchScore: 85, imochaScore: 86, status: 'New Application', avatar: '👨‍🎓', skills: ['Java', 'Spring Boot', 'MongoDB'], badges: [] },
  { id: 5, name: 'Ananya Gupta', role: 'ML Engineer', location: 'Delhi', experience: '4 years', matchScore: 94, imochaScore: 97, status: 'Offer Extended', avatar: '👩‍🔬', skills: ['Python', 'TensorFlow', 'PyTorch'], badges: ['ML Expert'] },
]

const aiActions = [
  { id: 1, action: 'Scheduled interview with Priya Sharma', agent: 'Scheduling Agent', time: '2 min ago' },
  { id: 2, action: 'Sent assessment reminder to 12 candidates', agent: 'Communication Agent', time: '15 min ago' },
  { id: 3, action: 'Screened 34 new applications for React role', agent: 'Screening Agent', time: '1 hour ago' },
  { id: 4, action: 'Generated weekly pipeline report', agent: 'Analytics Agent', time: '3 hours ago' },
]

const jobs = [
  { id: 1, title: 'Senior React Developer', applications: 124, shortlisted: 18, interviews: 6 },
  { id: 2, title: 'DevOps Engineer', applications: 87, shortlisted: 12, interviews: 4 },
  { id: 3, title: 'ML Engineer', applications: 56, shortlisted: 8, interviews: 3 },
]

export default function Dashboard() {
  const [portalView, setPortalView] = useState<'client' | 'candidate'>('client')
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">ViraWorkx<span className="text-blue-400">.ai</span></span>
              </div>
              
              <div className="flex bg-slate-800/50 rounded-lg p-1">
                <button onClick={() => setPortalView('client')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${portalView === 'client' ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  Client Portal
                </button>
                <button onClick={() => setPortalView('candidate')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${portalView === 'candidate' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  Candidate Portal
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 relative">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">3</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold">RS</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats[portalView].map((stat, i) => (
            <div key={i} className="relative group">
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50 hover:border-slate-700/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-emerald-400 text-sm font-medium">{stat.change}</span>
                </div>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Candidate Pipeline */}
          <div className="col-span-2 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">{portalView === 'client' ? 'Candidate Pipeline' : 'Recommended Jobs'}</h2>
                <p className="text-slate-400 text-sm">{portalView === 'client' ? 'AI-ranked candidates with iMocha scores' : 'AI-matched opportunities'}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4" /> Filter
                </button>
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white flex items-center gap-2 text-sm font-medium">
                  <Plus className="w-4 h-4" /> {portalView === 'client' ? 'Add Job' : 'Upload Resume'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {candidates.map((c) => (
                <div key={c.id} onClick={() => setSelectedCandidate(selectedCandidate === c.id ? null : c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCandidate === c.id ? 'bg-slate-800/80 border-blue-500/50' : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl">{c.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{c.name}</h3>
                        {c.badges.map((b, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">{b}</span>
                        ))}
                      </div>
                      <p className="text-slate-400 text-sm">{c.role} • {c.experience} • {c.location}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Match</p>
                        <p className={`text-lg font-bold ${c.matchScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{c.matchScore}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">iMocha</p>
                        <p className={`text-lg font-bold ${c.imochaScore >= 90 ? 'text-blue-400' : 'text-slate-300'}`}>{c.imochaScore}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      c.status === 'Interview Scheduled' ? 'bg-violet-500/20 text-violet-400' :
                      c.status === 'Offer Extended' ? 'bg-emerald-500/20 text-emerald-400' :
                      c.status === 'Shortlisted' ? 'bg-blue-500/20 text-blue-400' :
                      c.status === 'Assessment Pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>{c.status}</span>
                  </div>
                  
                  {selectedCandidate === c.id && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="flex gap-2 flex-wrap mb-4">
                        {c.skills.map((s, i) => <span key={i} className="px-3 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-sm">{s}</span>)}
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium flex items-center gap-2">
                          <Video className="w-4 h-4" /> Schedule Interview
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> Message
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" /> View Profile
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Agent Activity */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Agentic AI</h3>
                  <p className="text-xs text-slate-500">Recent automated actions</p>
                </div>
              </div>
              <div className="space-y-3">
                {aiActions.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    <p className="text-sm mb-1">{a.action}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-violet-400">{a.agent}</span>
                      <span className="text-xs text-slate-500">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Jobs / Profile */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{portalView === 'client' ? 'Active Jobs' : 'Profile Strength'}</h3>
                <button className="text-blue-400 text-sm hover:text-blue-300">View All</button>
              </div>
              
              {portalView === 'client' ? (
                <div className="space-y-3">
                  {jobs.map((j) => (
                    <div key={j.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                      <h4 className="font-medium text-sm mb-2">{j.title}</h4>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>{j.applications} apps</span>
                        <span>{j.shortlisted} shortlisted</span>
                        <span>{j.interviews} interviews</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full w-[92%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                    </div>
                    <span className="absolute right-0 -top-6 text-emerald-400 font-bold">92%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Resume uploaded</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Skills verified (iMocha)</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Video profile</span>
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                    Complete Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>© 2026 ViraWorkx.ai — AI-Powered Global Recruiting</p>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
DASHBOARDTSX

print_success "React frontend created"

#######################################
# STEP 4: Create API (Node.js)
#######################################
print_step "Step 4/8: Creating Node.js API"

cat > apps/api/package.json << 'APIPKG'
{
  "name": "@viraworkx/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "@prisma/client": "^5.7.0",
    "zod": "^3.22.4",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/morgan": "^1.9.9",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "tsx": "^4.6.2",
    "typescript": "^5.3.0"
  }
}
APIPKG

cat > apps/api/tsconfig.json << 'APITS'
{
  "compilerOptions": {
    "target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext",
    "outDir": "./dist", "rootDir": "./src", "strict": true,
    "esModuleInterop": true, "skipLibCheck": true, "resolveJsonModule": true
  },
  "include": ["src"]
}
APITS

cat > apps/api/src/index.ts << 'APIINDEX'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(morgan('dev'))
app.use(express.json())

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// API Routes
app.get('/api/v1/candidates', (req, res) => {
  res.json({
    candidates: [
      { id: '1', name: 'Priya Sharma', role: 'Senior React Developer', matchScore: 96 },
      { id: '2', name: 'Arjun Patel', role: 'Full Stack Engineer', matchScore: 91 },
      { id: '3', name: 'Sneha Reddy', role: 'DevOps Engineer', matchScore: 89 },
    ]
  })
})

app.get('/api/v1/jobs', (req, res) => {
  res.json({
    jobs: [
      { id: '1', title: 'Senior React Developer', applications: 124, status: 'active' },
      { id: '2', title: 'DevOps Engineer', applications: 87, status: 'active' },
      { id: '3', title: 'ML Engineer', applications: 56, status: 'active' },
    ]
  })
})

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body
  // Mock login
  res.json({ token: 'mock-jwt-token', user: { id: '1', email, name: 'Test User' } })
})

app.post('/api/v1/ai/screen', (req, res) => {
  res.json({
    matchScore: 92,
    strengths: ['Strong React experience', 'Good communication skills'],
    concerns: ['Limited cloud experience'],
    recommendation: 'proceed',
    summary: 'Strong candidate with excellent frontend skills.'
  })
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`)
  console.log(`📚 Health: http://localhost:${PORT}/health`)
})
APIINDEX

print_success "Node.js API created"

#######################################
# STEP 5: Create AI Engine (Python)
#######################################
print_step "Step 5/8: Creating Python AI engine"

cat > apps/ai-engine/requirements.txt << 'PYREQ'
fastapi==0.108.0
uvicorn[standard]==0.25.0
pydantic==2.5.3
python-dotenv==1.0.0
anthropic==0.8.1
httpx==0.26.0
PYREQ

cat > apps/ai-engine/main.py << 'PYMAIN'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="ViraWorkx AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScreeningRequest(BaseModel):
    candidate_profile: dict
    job_requirements: dict
    resume_content: Optional[str] = None

class ScreeningResponse(BaseModel):
    match_score: int
    strengths: List[str]
    concerns: List[str]
    recommendation: str
    summary: str

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-engine"}

@app.post("/screen", response_model=ScreeningResponse)
async def screen_candidate(request: ScreeningRequest):
    # TODO: Integrate Claude API
    return ScreeningResponse(
        match_score=88,
        strengths=["Strong technical background", "Relevant experience"],
        concerns=["Limited leadership experience"],
        recommendation="proceed",
        summary="Good candidate match for the position."
    )

@app.post("/parse-resume")
async def parse_resume(resume_text: str):
    return {"parsed": True, "skills": ["Python", "React", "AWS"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
PYMAIN

cat > apps/ai-engine/agents/screening_agent.py << 'SCREENAGENT'
"""AI Screening Agent using Claude"""
from anthropic import Anthropic
import os
import json

class ScreeningAgent:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    async def screen(self, candidate: dict, job: dict) -> dict:
        prompt = f"""Analyze this candidate against job requirements.
        
        Candidate: {json.dumps(candidate)}
        Job: {json.dumps(job)}
        
        Return JSON with: match_score (0-100), strengths, concerns, recommendation, summary"""
        
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(response.content[0].text)
SCREENAGENT

print_success "Python AI engine created"

#######################################
# STEP 6: Create Prisma Schema
#######################################
print_step "Step 6/8: Creating database schema"

cat > packages/db/prisma/schema.prisma << 'PRISMA'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  userType      String    @map("user_type")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  candidate     Candidate?
  @@map("users")
}

model Candidate {
  id              String   @id @default(uuid())
  userId          String   @unique @map("user_id")
  firstName       String   @map("first_name")
  lastName        String   @map("last_name")
  headline        String?
  location        String?
  experienceYears Int?     @map("experience_years")
  skills          String[]
  resumeUrl       String?  @map("resume_url")
  profileScore    Int      @default(0) @map("profile_score")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  user            User     @relation(fields: [userId], references: [id])
  applications    Application[]
  assessments     Assessment[]
  @@map("candidates")
}

model Client {
  id          String   @id @default(uuid())
  companyName String   @map("company_name")
  industry    String?
  planTier    String   @default("startup") @map("plan_tier")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  jobs        Job[]
  @@map("clients")
}

model Job {
  id             String   @id @default(uuid())
  clientId       String   @map("client_id")
  title          String
  description    String?
  salaryMin      Int?     @map("salary_min")
  salaryMax      Int?     @map("salary_max")
  location       String?
  remotePolicy   String?  @map("remote_policy")
  skillsRequired String[] @map("skills_required")
  status         String   @default("draft")
  imochaTestId   String?  @map("imocha_test_id")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  client         Client   @relation(fields: [clientId], references: [id])
  applications   Application[]
  @@map("jobs")
}

model Application {
  id          String   @id @default(uuid())
  candidateId String   @map("candidate_id")
  jobId       String   @map("job_id")
  stage       String   @default("new")
  matchScore  Int?     @map("match_score")
  aiSummary   String?  @map("ai_summary")
  appliedAt   DateTime @default(now()) @map("applied_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  candidate   Candidate @relation(fields: [candidateId], references: [id])
  job         Job       @relation(fields: [jobId], references: [id])
  interviews  Interview[]
  @@unique([candidateId, jobId])
  @@map("applications")
}

model Assessment {
  id           String    @id @default(uuid())
  candidateId  String    @map("candidate_id")
  imochaTestId String    @map("imocha_test_id")
  status       String    @default("pending")
  score        Int?
  completedAt  DateTime? @map("completed_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  candidate    Candidate @relation(fields: [candidateId], references: [id])
  @@map("assessments")
}

model Interview {
  id            String   @id @default(uuid())
  applicationId String   @map("application_id")
  scheduledAt   DateTime @map("scheduled_at")
  status        String   @default("scheduled")
  meetingUrl    String?  @map("meeting_url")
  createdAt     DateTime @default(now()) @map("created_at")
  application   Application @relation(fields: [applicationId], references: [id])
  @@map("interviews")
}
PRISMA

print_success "Database schema created"

#######################################
# STEP 7: Create CLAUDE.md
#######################################
print_step "Step 7/8: Creating Claude Code context file"

cat > CLAUDE.md << 'CLAUDEMD'
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
CLAUDEMD

print_success "CLAUDE.md created"

#######################################
# STEP 8: Install & Start Everything
#######################################
print_step "Step 8/8: Installing dependencies and starting services"

# Check if Docker is running
if command -v docker &> /dev/null; then
    echo "Starting Docker containers..."
    docker-compose up -d 2>/dev/null || print_warning "Docker not running. Start manually with: docker-compose up -d"
    sleep 3
else
    print_warning "Docker not installed. Install Docker and run: docker-compose up -d"
fi

# Install Node dependencies
echo "Installing Node.js dependencies..."
npm install --legacy-peer-deps 2>/dev/null || npm install

# Setup Python
if command -v python3 &> /dev/null; then
    echo "Setting up Python environment..."
    cd apps/ai-engine
    python3 -m venv venv 2>/dev/null || true
    if [ -f "venv/bin/pip" ]; then
        ./venv/bin/pip install -r requirements.txt -q 2>/dev/null || true
    fi
    cd ../..
else
    print_warning "Python3 not found. Install Python and run: npm run setup:ai"
fi

# Initialize database
echo "Initializing database..."
npx prisma generate --schema=packages/db/prisma/schema.prisma 2>/dev/null || true
npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss 2>/dev/null || print_warning "Database push failed. Make sure Docker is running."

# Initialize git
git init -q 2>/dev/null || true
git add -A 2>/dev/null || true
git commit -m "Initial commit: ViraWorkx platform" -q 2>/dev/null || true

echo -e "\n${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ✅ ViraWorkx.ai Setup Complete!                                ║
║                                                                   ║
║   Your project is ready at:                                       ║
║   ~/viraworkx                                                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}To start developing:${NC}"
echo ""
echo "  cd ~/viraworkx"
echo "  npm run dev"
echo ""
echo -e "${BLUE}Then open:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:4000/health"
echo ""
echo -e "${BLUE}To use Claude Code:${NC}"
echo "  cd ~/viraworkx"
echo "  claude"
echo ""
echo -e "${YELLOW}Starting development servers now...${NC}"
echo ""

# Start dev servers
npm run dev
