import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Briefcase, Clock, Video, Bot, Award, FileText,
  MessageSquare, Filter, Plus, Bell, Zap, LogOut, Search,
  ChevronDown, ChevronRight, Building2, MapPin, TrendingUp
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { jobApi } from '../../services/api'

export default function ClientDashboard() {
  const { user, logout } = useAuthStore()

  // Fetch client's jobs
  const { data: jobsData } = useQuery({
    queryKey: ['clientJobs'],
    queryFn: () => jobApi.getAll(),
  })

  const jobs = jobsData?.data?.jobs || []
  const activeJobs = jobs.filter((j: any) => j.status === 'active')

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  // Mock stats - replace with real API data
  const stats = [
    { label: 'Active Jobs', value: activeJobs.length.toString(), change: '+3', icon: Briefcase, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Total Candidates', value: '847', change: '+156', icon: Users, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Interviews Today', value: '8', change: '+2', icon: Video, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Avg. Time to Hire', value: '18d', change: '-4d', icon: Clock, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  ]

  // Mock AI actions - will be real data from API
  const recentAIActions = [
    { id: 1, action: 'Screened 34 new applications for React role', agent: 'Screening Agent', time: '1 hour ago' },
    { id: 2, action: 'Scheduled interview with Priya Sharma', agent: 'Scheduling Agent', time: '2 hours ago' },
    { id: 3, action: 'Sent assessment reminder to 12 candidates', agent: 'Communication Agent', time: '3 hours ago' },
  ]

  // Mock top candidates
  const topCandidates = [
    { id: 1, name: 'Priya Sharma', role: 'Senior React Developer', matchScore: 96, status: 'Interview Scheduled', avatar: 'PS' },
    { id: 2, name: 'Ananya Gupta', role: 'ML Engineer', matchScore: 94, status: 'Offer Extended', avatar: 'AG' },
    { id: 3, name: 'Arjun Patel', role: 'Full Stack Engineer', matchScore: 91, status: 'Assessment Pending', avatar: 'AP' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r z-10">
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">ViraWorkX</span>
          </Link>
        </div>

        <nav className="p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client Portal</p>
          <ul className="space-y-1">
            <li>
              <Link
                to="/dashboard"
                className="flex items-center px-4 py-3 text-primary-600 bg-primary-50 rounded-lg font-medium"
              >
                <TrendingUp className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/client/jobs"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Briefcase className="w-5 h-5 mr-3" />
                My Jobs
              </Link>
            </li>
            <li>
              <Link
                to="/client/jobs/new"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Plus className="w-5 h-5 mr-3" />
                Post New Job
              </Link>
            </li>
            <li>
              <Link
                to="/jobs"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Users className="w-5 h-5 mr-3" />
                Browse Candidates
              </Link>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
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
            className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
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
              Welcome back, {user?.profile?.firstName || 'there'}!
            </h1>
            <p className="text-gray-600">Here's your recruiting pipeline overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <span className="text-green-600 text-sm font-medium">{stat.change}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Candidates */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Top Candidates</h2>
                <p className="text-sm text-gray-500">AI-ranked based on job requirements</p>
              </div>
              <Link to="/client/jobs" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y">
              {topCandidates.map((candidate) => (
                <div key={candidate.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-semibold">
                      {candidate.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{candidate.name}</p>
                      <p className="text-sm text-gray-500">{candidate.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Match Score</p>
                      <p className="text-lg font-bold text-green-600">{candidate.matchScore}%</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      candidate.status === 'Interview Scheduled' ? 'bg-purple-100 text-purple-700' :
                      candidate.status === 'Offer Extended' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {candidate.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Panels */}
          <div className="space-y-6">
            {/* AI Agent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                {recentAIActions.map((action) => (
                  <div key={action.id} className="p-3 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-700 mb-1">{action.action}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600 font-medium">{action.agent}</span>
                      <span className="text-xs text-gray-400">{action.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">
                ViraWorkx AI handles screening & scheduling for you
              </p>
            </div>

            {/* Active Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                      <h4 className="font-medium text-sm text-gray-900 mb-1">{job.title}</h4>
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
      </main>
    </div>
  )
}
