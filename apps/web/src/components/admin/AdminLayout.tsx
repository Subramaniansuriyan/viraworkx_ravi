import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Zap, LogOut, Bot, Activity, Shield, Eye, ClipboardCheck,
  Building2, Users, Briefcase, BarChart3, FileText, Layers, Target,
  GitBranch, Video, Menu, X, CheckSquare, FileCheck
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import NotificationBell from '../shared/NotificationBell'

const API_URL = ''

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout, accessToken: token } = useAuthStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const { data: statsData } = useQuery({
    queryKey: ['aiStats'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/ai/actions/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    refetchInterval: 30000,
  })

  const { data: pendingAllocData } = useQuery({
    queryKey: ['pendingAllocationCount'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/assessments/admin/pending-allocation`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    refetchInterval: 30000,
  })

  const { data: pendingJobsData } = useQuery({
    queryKey: ['pendingJobApprovalCount'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/jobs/pending-approval`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    refetchInterval: 60000,
  })

  const pendingApprovals = statsData?.stats?.pending_approvals || 0
  const pendingAllocation = pendingAllocData?.candidates?.length || 0
  const pendingJobApprovals = pendingJobsData?.jobs?.length || 0

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'A'
  }

  const isActive = (path: string) => location.pathname === path

  const NavLink = ({
    to,
    icon: Icon,
    label,
    badge,
  }: {
    to: string
    icon: React.ElementType
    label: string
    badge?: number
  }) => (
    <li>
      <Link
        to={to}
        className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
          isActive(to)
            ? 'text-white bg-slate-800 font-medium'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        <Icon className="w-5 h-5 mr-3 shrink-0" />
        <span className="truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
            {badge}
          </span>
        )}
      </Link>
    </li>
  )

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-slate-700 shrink-0 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold">ViraWorkX</span>
            <p className="text-xs text-slate-400">Admin Console</p>
          </div>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="p-4 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Human-in-the-Loop
        </p>
        <ul className="space-y-0.5 mb-4">
          <NavLink to="/admin/dashboard" icon={Activity} label="Overview" />
          <NavLink to="/admin/ai-monitor" icon={Bot} label="AI Monitor" badge={pendingApprovals} />
          <NavLink to="/admin/test-allocation" icon={Target} label="Test Allocation" badge={pendingAllocation} />
        </ul>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Platform
        </p>
        <ul className="space-y-0.5 mb-4">
          <NavLink to="/admin/vetting" icon={GitBranch} label="Vetting Pipeline" />
          <NavLink to="/admin/job-approvals" icon={CheckSquare} label="Job Approvals" badge={pendingJobApprovals} />
          <NavLink to="/admin/clients" icon={Building2} label="Clients" />
          <NavLink to="/admin/candidates" icon={Users} label="Candidates" />
          <NavLink to="/admin/jobs" icon={Briefcase} label="Jobs" />
          <NavLink to="/admin/applications" icon={Layers} label="Applications" />
          <NavLink to="/admin/interviews" icon={Video} label="Interviews" />
          <NavLink to="/admin/contracts" icon={FileCheck} label="Contracts" />
          <NavLink to="/admin/users" icon={Shield} label="User Management" />
        </ul>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          System
        </p>
        <ul className="space-y-0.5">
          <NavLink to="/admin/analytics" icon={BarChart3} label="Analytics" />
          <NavLink to="/admin/audit-log" icon={Eye} label="Audit Log" />
          <NavLink to="/admin/contract-templates" icon={FileText} label="Contract Templates" />
          <NavLink to="/admin/settings" icon={ClipboardCheck} label="Settings" />
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700 shrink-0 overflow-visible">
        <div className="flex items-center justify-center mb-3 relative z-[60]">
          <NotificationBell />
        </div>
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium shrink-0">
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.profile?.firstName || 'Admin'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center w-full px-4 py-2 text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-slate-900 flex items-center justify-between px-4 border-b border-slate-700">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-300 hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">ViraWorkX</span>
        </Link>
        <NotificationBell />
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-50 flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>

      <main className="lg:ml-64 pt-16 lg:pt-0">{children}</main>
    </div>
  )
}
