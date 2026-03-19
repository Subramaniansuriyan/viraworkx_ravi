import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Briefcase, Clock, Video, Bot, FileText,
  Plus, Search,
  ChevronRight, Building2, MapPin, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import NotificationBell from '../../components/shared/NotificationBell'
import ClientLayout from '../../components/client/ClientLayout'

const API_URL = ''

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ClientDashboard() {
  const { user, accessToken: token } = useAuthStore()

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['clientDashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/clients/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: jobsData } = useQuery({
    queryKey: ['clientActiveJobs'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const s = dashData?.stats || {}
  const recentApplications: any[] = dashData?.recentApplications || []
  const recentAiActions: any[] = dashData?.recentAiActions || []
  const activeJobs = (jobsData?.jobs || []).filter((j: any) => j.status === 'active')

  const stats = [
    { label: 'Active Jobs', value: isLoading ? '…' : (s.activeJobs ?? 0).toString(), icon: Briefcase, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Total Candidates', value: isLoading ? '…' : (s.totalCandidates ?? 0).toString(), icon: Users, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Interviews Today', value: isLoading ? '…' : (s.interviewsToday ?? 0).toString(), icon: Video, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Avg. Time to Hire', value: isLoading ? '…' : s.avgTimeToHire ? `${s.avgTimeToHire}d` : '—', icon: Clock, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  ]

  return (
    <ClientLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Welcome back, {user?.profile?.firstName || 'there'}!
            </h1>
            <p className="text-gray-600 text-sm md:text-base">Here's your recruiting pipeline overview</p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-gray-500 text-xs md:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Recent Applications */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
                <p className="text-sm text-gray-500">Latest candidates across all your jobs</p>
              </div>
              <Link to="/client/jobs" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y">
              {recentApplications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No applications yet</p>
                </div>
              ) : recentApplications.map((app: any) => {
                const initials = `${app.candidate?.firstName?.[0] || ''}${app.candidate?.lastName?.[0] || ''}`
                const stageBadge: Record<string, string> = {
                  interview: 'bg-purple-100 text-purple-700',
                  offer: 'bg-green-100 text-green-700',
                  shortlisted: 'bg-yellow-100 text-yellow-700',
                  hired: 'bg-emerald-100 text-emerald-700',
                }
                const stage = app.stage || 'new'
                return (
                  <div key={app.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-semibold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{app.candidate?.firstName} {app.candidate?.lastName}</p>
                        <p className="text-sm text-gray-500 truncate">{app.candidate?.headline || app.job?.title}</p>
                      </div>
                    </div>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium shrink-0 ${stageBadge[stage] || 'bg-gray-100 text-gray-700'}`}>
                      {stage.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* AI Agent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Activity</h3>
                  <p className="text-xs text-gray-500">ViraWorkx is handling your recruiting</p>
                </div>
              </div>
              <div className="space-y-3">
                {recentAiActions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No AI actions yet</p>
                ) : recentAiActions.map((action: any) => (
                  <div key={action.id} className="p-3 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-700 mb-1 capitalize">{action.actionType?.replace(/_/g, ' ')}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600 font-medium capitalize">{action.agentType} Agent</span>
                      <span className="text-xs text-gray-400">{timeAgo(action.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">
                ViraWorkx AI handles screening & scheduling for you
              </p>
            </div>

            {/* Active Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Active Jobs</h3>
                <Link to="/client/jobs" className="text-primary-600 text-sm hover:underline">
                  View all
                </Link>
              </div>
              {activeJobs.length === 0 ? (
                <div className="text-center py-6">
                  <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">No active jobs yet</p>
                  <Link
                    to="/client/jobs/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                  >
                    <Plus className="w-4 h-4" /> Post a Job
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeJobs.slice(0, 3).map((job: any) => (
                    <Link
                      key={job.id}
                      to={`/client/jobs/${job.id}/pipeline`}
                      className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <h4 className="font-medium text-sm text-gray-900 mb-1 truncate">{job.title}</h4>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{job._count?.applications || 0} applications</span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  )
}
