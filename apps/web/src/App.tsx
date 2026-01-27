import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/client/Dashboard'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import CandidateProfile from './pages/candidate/Profile'
import CandidateApplications from './pages/candidate/Applications'
import CandidateDashboard from './pages/candidate/Dashboard'
import JobList from './pages/jobs/JobList'
import JobDetail from './pages/jobs/JobDetail'
import ClientJobs from './pages/client/Jobs'
import ClientJobForm from './pages/client/JobForm'
import ClientPipeline from './pages/client/Pipeline'
import AIMonitor from './pages/client/AIMonitor'

// Components
import ProtectedRoute from './components/shared/ProtectedRoute'

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public landing page */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />}
      />

      {/* Auth routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* Public job routes */}
      <Route path="/jobs" element={<JobList />} />
      <Route path="/jobs/:id" element={<JobDetail />} />

      {/* Protected dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Client portal routes */}
      <Route
        path="/client/*"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Candidate portal routes */}
      <Route
        path="/candidate/*"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Candidate profile route */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateProfile />
          </ProtectedRoute>
        }
      />

      {/* Candidate applications route */}
      <Route
        path="/applications"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateApplications />
          </ProtectedRoute>
        }
      />

      {/* Client job management routes */}
      <Route
        path="/client/jobs"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <ClientJobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/jobs/new"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <ClientJobForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/jobs/:id/edit"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <ClientJobForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/jobs/:id/pipeline"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <ClientPipeline />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/ai-monitor"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <AIMonitor />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
