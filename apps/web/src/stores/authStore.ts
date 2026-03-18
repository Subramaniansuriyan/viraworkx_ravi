import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

interface User {
  id: string
  email: string
  userType: 'candidate' | 'client' | 'admin'
  profile?: {
    firstName?: string
    lastName?: string
    companyName?: string
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<{ requiresVerification: boolean }>
  verifyEmail: (token: string) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<boolean>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

interface RegisterData {
  email: string
  password: string
  userType: 'candidate' | 'client'
  firstName?: string
  lastName?: string
  companyName?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { user, accessToken, refreshToken } = response.data

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Store token for API interceptor
          localStorage.setItem('token', accessToken)
        } catch (error: any) {
          const message = error.response?.data?.error || 'Login failed'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/register', data)
          set({ isLoading: false, error: null })
          return { requiresVerification: !!response.data.requiresVerification }
        } catch (error: any) {
          const message = error.response?.data?.error || 'Registration failed'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/verify-email', { token })
          const { user, accessToken, refreshToken } = response.data
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          localStorage.setItem('token', accessToken)
        } catch (error: any) {
          const message = error.response?.data?.error || 'Verification failed'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      logout: () => {
        // Call logout endpoint (fire and forget)
        const token = get().accessToken
        if (token) {
          api.post('/auth/logout').catch(() => {})
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        })

        localStorage.removeItem('token')
      },

      refreshAuth: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false

        try {
          const response = await api.post('/auth/refresh', { refreshToken })
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data

          set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })

          localStorage.setItem('token', newAccessToken)
          return true
        } catch {
          // Refresh failed, logout
          get().logout()
          return false
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'viraworkx-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
