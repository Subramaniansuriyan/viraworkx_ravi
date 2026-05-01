import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Pages
import Landing from './pages/Landing'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import ClientDashboard from './pages/client/Dashboard'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'
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
import AdminVetting from './pages/admin/Vetting'
import AdminClients from './pages/admin/Clients'
import AdminCandidates from './pages/admin/Candidates'
import AdminCandidateDetail from './pages/admin/CandidateDetail'
import AdminJobs from './pages/admin/Jobs'
import AdminApplications from './pages/admin/Applications'
import AdminInterviews from './pages/admin/Interviews'
import AdminAnalytics from './pages/admin/Analytics'
import AdminUsers from './pages/admin/Users'
import AuditLog from './pages/admin/AuditLog'
import AdminSettings from './pages/admin/Settings'
import AdminJobApproval from './pages/admin/JobApproval'
import AdminClientDetail from './pages/admin/ClientDetail'
import ContractTemplates from './pages/admin/ContractTemplates'
import AdminContracts from './pages/admin/Contracts'
import ClientContracts from './pages/client/Contracts'
import TieredCandidates from './pages/client/TieredCandidates'
import ClientContractReview from './pages/client/ContractReview'
import Billing from './pages/client/Billing'
import ClientProfile from './pages/client/Profile'
import CandidateAssessments from './pages/candidate/Assessments'
import CandidateContracts from './pages/candidate/Contracts'
import CandidateContractReview from './pages/candidate/ContractReview'
import CandidateInterviews from './pages/candidate/Interviews'
import CandidateNotifications from './pages/candidate/Notifications'
import CandidateEarnings from './pages/candidate/Earnings'
import Timesheet from './pages/timesheet/Timesheet'

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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Legal pages */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

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

      {/* Candidate interviews route */}
      <Route
        path="/interviews"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateInterviews />
          </ProtectedRoute>
        }
      />

      {/* Candidate assessments route */}
      <Route
        path="/assessments"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateAssessments />
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
        path="/admin/vetting"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminVetting />
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
        path="/admin/candidates/:id"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminCandidateDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminJobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/applications"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interviews"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminInterviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminUsers />
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

      <Route
        path="/client/candidates"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <TieredCandidates />
          </ProtectedRoute>
        }
      />

      {/* Client contract & billing routes */}
      <Route
        path="/client/contracts"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <ClientContracts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/contracts/:id"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <ClientContractReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/billing"
        element={
          <ProtectedRoute allowedTypes={['client', 'admin']}>
            <Billing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/profile"
        element={
          <ProtectedRoute allowedTypes={['client']}>
            <ClientProfile />
          </ProtectedRoute>
        }
      />

      {/* Candidate notifications */}
      <Route
        path="/candidate/notifications"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateNotifications />
          </ProtectedRoute>
        }
      />

      {/* Candidate earnings */}
      <Route
        path="/candidate/earnings"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateEarnings />
          </ProtectedRoute>
        }
      />

      {/* Candidate contract routes */}
      <Route
        path="/candidate/contracts"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateContracts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/contracts/:id"
        element={
          <ProtectedRoute allowedTypes={['candidate']}>
            <CandidateContractReview />
          </ProtectedRoute>
        }
      />

      {/* Admin job approval queue */}
      <Route
        path="/admin/job-approvals"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminJobApproval />
          </ProtectedRoute>
        }
      />

      {/* Admin client detail */}
      <Route
        path="/admin/clients/:id"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminClientDetail />
          </ProtectedRoute>
        }
      />

      {/* Admin contracts */}
      <Route
        path="/admin/contracts"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminContracts />
          </ProtectedRoute>
        }
      />

      {/* Admin contract templates */}
      <Route
        path="/admin/contract-templates"
        element={
          <ProtectedRoute allowedTypes={['admin']}>
            <ContractTemplates />
          </ProtectedRoute>
        }
      />

      {/* Timesheet - accessible to all authenticated users (candidate/client/admin) */}
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute>
            <Timesheet />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
