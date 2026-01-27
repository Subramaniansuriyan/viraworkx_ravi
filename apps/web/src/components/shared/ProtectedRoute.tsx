import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedTypes?: ('candidate' | 'client' | 'admin')[]
}

export default function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check user type if specified
  if (allowedTypes && user && !allowedTypes.includes(user.userType)) {
    // Redirect to dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
