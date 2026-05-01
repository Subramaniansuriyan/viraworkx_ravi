import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bot, TrendingUp, Building2, CheckCircle, AlertTriangle, Activity,
  Users, Briefcase, UserCheck, Clock, Target
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import NotificationBell from '../../components/shared/NotificationBell'
import api from '../../services/api'

export default function AdminDashboard() {
  const { data: statsData } = useQuery({
    queryKey: ['aiStats'],
    queryFn: async () => {
      const res = await api.get('/ai/actions/stats')
      return res.data
    },
    refetchInterval: 30000,
  })

  const { data: pendingData } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      const res = await api.get('/ai/actions/pending-approval')
      return res.data
    },
    refetchInterval: 10000,
  })

  const { data: overviewData } = useQuery({
    queryKey: ['adminOverview'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview')
      return res.data
    },
    refetchInterval: 60000,
  })
  const overview = overviewData?.overview || {}

  const { data: invitesData } = useQuery({
    queryKey: ['activeInvites'],
    queryFn: async () => {
      const res = await api.get('/assessments/admin/active-invites')
      return res.data
    },
    refetchInterval: 60000,
  })

  const stats = statsData?.stats || {}
  const pendingActions = pendingData?.actions || []
  const allInvites: any[] = invitesData?.assessments || []

  const inviteStats = {
    invited:   allInvites.filter(i => i.status === 'invited').length,
    started:   allInvites.filter(i => i.status === 'started').length,
    completed: allInvites.filter(i => i.status === 'completed').length,
    expired:   allInvites.filter(i => i.status === 'expired').length,
  }

  function timeRemaining(inv: any): string {
    if (inv.status === 'completed') return 'Completed'
    if (inv.status === 'expired' || inv.status === 'cancelled') return inv.status.charAt(0).toUpperCase() + inv.status.slice(1)
    if (!inv.expiresAt) return '—'
    const diff = new Date(inv.expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hrs = Math.floor(diff / 3600000)
    if (hrs < 24) return `${hrs}h left`
    return `${Math.floor(hrs / 24)}d left`
  }

  function timeRemainingColor(inv: any): string {
    if (inv.status === 'completed') return 'text-green-600'
    if (inv.status === 'expired' || inv.status === 'cancelled') return 'text-red-500'
    if (!inv.expiresAt) return 'text-gray-400'
    const diff = new Date(inv.expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'text-red-500'
    if (diff < 86400000) return 'text-orange-500'
    return 'text-blue-600'
  }

  const STATUS_BADGE: Record<string, string> = {
    invited:   'bg-blue-100 text-blue-700',
    started:   'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    expired:   'bg-red-100 text-red-600',
    cancelled: 'bg-gray-100 text-gray-500',
    pending:   'bg-gray-100 text-gray-500',
  }

  const dashboardStats = [
    {
      label: 'Total Candidates',
      value: overview.totalCandidates || 0,
      icon: Users,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Active Clients',
      value: overview.totalClients || 0,
      icon: Building2,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Open Jobs',
      value: overview.activeJobs || 0,
      icon: Briefcase,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Placements',
      value: overview.totalPlacements || 0,
      icon: UserCheck,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ViraWorkx Admin Console</h1>
            <p className="text-gray-600">Human-in-the-Loop AI Oversight</p>
          </div>
          <NotificationBell />
        </div>

        {(stats.pending_approvals || 0) > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {stats.pending_approvals} AI action(s) require your review
                </p>
                <p className="text-sm text-yellow-600">Candidates are waiting for screening decisions</p>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
                <p className="text-sm text-gray-500">AI screening decisions awaiting review</p>
              </div>
              <Link to="/admin/ai-monitor" className="text-primary-600 text-sm hover:underline">
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
                        <p className="text-xs text-gray-400 mt-1">{action.approvalReason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">{action.matchScore}%</p>
                        <p className="text-xs text-gray-400">Match</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

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

        {/* Assessment Invite Tracker */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Assessment Invite Tracker</h2>
                <p className="text-sm text-gray-500">Recent invites — sent time, expiry, and status</p>
              </div>
            </div>
            <Link to="/admin/test-allocation" className="text-primary text-sm font-medium hover:underline">
              View all
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 divide-x border-b">
            {[
              { label: 'Invite Sent',  value: inviteStats.invited,   color: 'text-blue-600' },
              { label: 'In Progress',  value: inviteStats.started,   color: 'text-yellow-600' },
              { label: 'Completed',    value: inviteStats.completed, color: 'text-green-600' },
              { label: 'Expired',      value: inviteStats.expired,   color: 'text-red-500' },
            ].map((s) => (
              <div key={s.label} className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent invites */}
          <div className="divide-y max-h-72 overflow-y-auto">
            {allInvites.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No assessment invites sent yet</p>
              </div>
            ) : (
              allInvites.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{inv.candidateName}</p>
                    <p className="text-xs text-gray-400 truncate">{inv.testName || inv.testId}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Sent</p>
                      <p className="text-xs text-gray-700">
                        {new Date(inv.invitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Expires</p>
                      <p className="text-xs text-gray-700">
                        {inv.expiresAt
                          ? new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ${timeRemainingColor(inv)} flex items-center gap-1 w-20 justify-end`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      {timeRemaining(inv)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[inv.status] || 'bg-gray-100 text-gray-500'} w-24 text-center`}>
                      {inv.status === 'invited' ? 'Invite Sent'
                        : inv.status === 'started' ? 'In Progress'
                        : inv.status === 'completed' ? 'Completed'
                        : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Manage Clients', to: '/admin/clients', icon: Building2, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: 'View Candidates', to: '/admin/candidates', icon: Activity, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            { label: 'All Jobs', to: '/admin/jobs', icon: Activity, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
            { label: 'Analytics', to: '/admin/analytics', icon: TrendingUp, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 p-4 rounded-xl font-medium transition-colors ${item.color}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
