import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Briefcase, Clock, Bot, Bell, Zap, LogOut, Search,
  TrendingUp, Building2, CheckCircle, XCircle, AlertTriangle,
  Activity, Shield, Eye, ClipboardCheck, FileText
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const AI_ENGINE_BASE = '/api/ats/v1'

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()

  // Fetch AI action stats
  const { data: statsData } = useQuery({
    queryKey: ['aiStats'],
    queryFn: async () => {
      const res = await fetch(`${AI_ENGINE_BASE}/actions/stats`)
      return res.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch pending approvals
  const { data: pendingData } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      const res = await fetch(`${AI_ENGINE_BASE}/actions/pending-approval`)
      return res.json()
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const stats = statsData?.stats || {}
  const pendingActions = pendingData?.actions || []

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'A'
  }

  const dashboardStats = [
    {
      label: 'Pending Reviews',
      value: stats.pending_approvals || 0,
      icon: AlertTriangle,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      urgent: (stats.pending_approvals || 0) > 0
    },
    {
      label: 'Total AI Actions',
      value: stats.total_actions || 0,
      icon: Bot,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Completed',
      value: stats.by_status?.completed || 0,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      label: 'Avg Match Score',
      value: `${stats.average_match_score || 0}%`,
      icon: TrendingUp,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-10">
        <div className="p-6 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">ViraWorkX</span>
              <p className="text-xs text-slate-400">Admin Console</p>
            </div>
          </Link>
        </div>

        <nav className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Human-in-the-Loop
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                to="/admin/dashboard"
                className="flex items-center px-4 py-3 text-white bg-slate-800 rounded-lg font-medium"
              >
                <Activity className="w-5 h-5 mr-3" />
                Overview
              </Link>
            </li>
            <li>
              <Link
                to="/admin/ai-monitor"
                className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <Bot className="w-5 h-5 mr-3" />
                AI Monitor
                {(stats.pending_approvals || 0) > 0 && (
                  <span className="ml-auto bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats.pending_approvals}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/admin/test-allocation"
                className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <ClipboardCheck className="w-5 h-5 mr-3" />
                Test Allocation
              </Link>
            </li>
            <li>
              <Link
                to="/admin/clients"
                className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <Building2 className="w-5 h-5 mr-3" />
                Clients
              </Link>
            </li>
            <li>
              <Link
                to="/admin/candidates"
                className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <Users className="w-5 h-5 mr-3" />
                Candidates
              </Link>
            </li>
          </ul>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-8">
            System
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                to="/admin/audit-log"
                className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <Eye className="w-5 h-5 mr-3" />
                Audit Log
              </Link>
            </li>
            <li>
              <Link
                to="/admin/contract-templates"
                className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <FileText className="w-5 h-5 mr-3" />
                Contract Templates
              </Link>
            </li>
            <li>
              <Link
                to="/admin/settings"
                className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                <Shield className="w-5 h-5 mr-3" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
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
            className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ViraWorkx Admin Console
            </h1>
            <p className="text-gray-600">Human-in-the-Loop AI Oversight</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell className="w-6 h-6" />
              {(stats.pending_approvals || 0) > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>

        {/* Alert Banner */}
        {(stats.pending_approvals || 0) > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {stats.pending_approvals} AI action(s) require your review
                </p>
                <p className="text-sm text-yellow-600">
                  Candidates are waiting for screening decisions
                </p>
              </div>
            </div>
            <Link
              to="/admin/ai-monitor"
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700"
            >
              Review Now
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl p-6 shadow-sm border ${
                stat.urgent ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Approvals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
                <p className="text-sm text-gray-500">AI screening decisions awaiting review</p>
              </div>
              <Link
                to="/admin/ai-monitor"
                className="text-primary-600 text-sm hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {pendingActions.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-600">All caught up!</p>
                  <p className="text-sm text-gray-400">No pending reviews</p>
                </div>
              ) : (
                pendingActions.slice(0, 5).map((action: any) => (
                  <div key={action.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {action.inputPayload?.candidate?.name || 'Unknown Candidate'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {action.inputPayload?.job?.title || 'Unknown Job'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {action.approvalReason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">
                          {action.matchScore}%
                        </p>
                        <p className="text-xs text-gray-400">Match</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Action Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">AI Action Summary</h2>
              <p className="text-sm text-gray-500">Actions by agent type</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(stats.by_agent_type || {}).map(([agent, count]: [string, any]) => (
                  <div key={agent} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-gray-700 capitalize">{agent.replace('_', ' ')}</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.by_agent_type || {}).length === 0 && (
                  <p className="text-gray-400 text-center py-4">No AI actions yet</p>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Status Breakdown</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-sm text-gray-600">
                      Completed: {stats.by_status?.completed || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-sm text-gray-600">
                      Rejected: {stats.by_status?.rejected || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
