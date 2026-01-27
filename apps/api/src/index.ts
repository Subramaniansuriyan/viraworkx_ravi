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
