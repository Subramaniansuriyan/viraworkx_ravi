import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmail } = useAuthStore()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMessage('No verification token found. Please check your email link.')
      return
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
      })
      .catch((err) => {
        setStatus('error')
        setErrorMessage(err.message || 'Verification failed. The link may have expired.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold font-heading text-primary">ViraWorkX</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
          {status === 'verifying' && (
            <>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-gray-600">Taking you to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              {resent ? (
                <p className="text-green-600 font-medium text-sm mb-4">New verification email sent. Check your inbox.</p>
              ) : (
                <button
                  onClick={async () => {
                    const email = prompt('Enter your email to resend verification:')
                    if (!email) return
                    setResending(true)
                    try {
                      await api.post('/auth/resend-verification', { email })
                      setResent(true)
                    } finally {
                      setResending(false)
                    }
                  }}
                  disabled={resending}
                  className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 mb-4"
                >
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
              <Link to="/login" className="text-sm text-gray-500 hover:text-primary transition-colors">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
