import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LogOut, TrendingUp, User, Briefcase, FileText, Award,
  Calendar, Menu, X, Clock, Bell, DollarSign
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore as useAuth } from '../../stores/authStore'
import { useAuthStore } from '../../stores/authStore'
import NotificationBell from '../shared/NotificationBell'

interface CandidateLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { to: '/dashboard', icon: TrendingUp, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/jobs', icon: Briefcase, label: 'Find Jobs' },
  { to: '/applications', icon: FileText, label: 'My Applications' },
  { to: '/interviews', icon: Calendar, label: 'Interviews' },
  { to: '/assessments', icon: Award, label: 'Assessments' },
  { to: '/candidate/contracts', icon: FileText, label: 'Contracts' },
  { to: '/candidate/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/timesheet', icon: Clock, label: 'Timesheet' },
  { to: '/candidate/notifications', icon: Bell, label: 'Notifications' },
]

export default function CandidateLayout({ children }: CandidateLayoutProps) {
  const { user, logout, accessToken: token } = useAuthStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return { unreadCount: 0 }
      return res.json()
    },
    enabled: !!token,
    refetchInterval: 30000,
  })
  const unreadCount: number = notifData?.unreadCount || 0

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const isActive = (path: string) => location.pathname === path

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/logo-lockup.png" alt="ViraWorkX" className="h-9 w-auto" />
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="p-4 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Candidate Portal
        </p>
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive(to)
                    ? 'text-brand bg-lavender font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3 shrink-0" />
                <span className="truncate flex-1">{label}</span>
                {to === '/candidate/notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-brand text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-medium shrink-0">
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.profile?.firstName || user?.email}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Log out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-white border-b flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center">
          <img src="/logo-lockup.png" alt="ViraWorkX" className="h-8 w-auto" />
        </Link>
        <NotificationBell />
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r z-50 flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>

      <main className="lg:ml-64 pt-16 lg:pt-0">{children}</main>
    </div>
  )
}
