import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Pages
import Landing from './pages/Landing'
import ClientDashboard from './pages/client/Dashboard'
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
import AdminDashboard from './pages/admin/Dashboard'
import TestAllocation from './pages/admin/TestAllocation'
import AdminClients from './pages/admin/Clients'
import AdminCandidates from './pages/admin/Candidates'
import AuditLog from './pages/admin/AuditLog'
import AdminSettings from './pages/admin/Settings'

// Components
import ProtectedRoute from './components/shared/ProtectedRoute'

// Smart dashboard redirect based on user type
function DashboardRedirect() {
  const { user } = useAuthStore()

  if (user?.userType === 'candidate') {
    return <CandidateDashboard />
  } else if (user?.userType === 'client') {
    return <ClientDashboard />
  } else if (user?.userType === 'admin') {
    return <AdminDashboard /> // ViraWorkx admin sees HITL dashboard
  }

  return <Navigate to="/login" replace />
}

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

      {/* Protected dashboard - redirects based on user type */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />

      {/* Client portal routes */}
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Candidate portal routes */}
      <Route
        path="/candidate/dashboard"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateDashboard />
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
      {/* Admin routes - ViraWorkx Internal Team Only */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ai-monitor"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AIMonitor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/test-allocation"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <TestAllocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminClients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/candidates"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminCandidates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AuditLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminSettings />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
