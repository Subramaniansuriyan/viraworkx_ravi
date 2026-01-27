import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, Clock, Video, Bot, Award, Target, FileText, MessageSquare, Filter, Plus, Bell, Zap, CheckCircle, AlertCircle, LogOut, Search, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const stats = {
  client: [
    { label: 'Active Jobs', value: '12', change: '+3', icon: Briefcase, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Total Candidates', value: '847', change: '+156', icon: Users, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Interviews Today', value: '8', change: '+2', icon: Video, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Avg. Time to Hire', value: '18d', change: '-4d', icon: Clock, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  ],
  candidate: [
    { label: 'Job Matches', value: '24', change: '+8', icon: Target, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Applications', value: '6', change: '+2', icon: FileText, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Interviews', value: '3', change: '+1', icon: Video, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Profile Score', value: '92%', change: '+5%', icon: Award, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  ]
}

const candidates = [
  { id: 1, name: 'Priya Sharma', role: 'Senior React Developer', location: 'Bangalore', experience: '6 years', matchScore: 96, imochaScore: 94, status: 'Interview Scheduled', avatar: 'PS', skills: ['React', 'TypeScript', 'Node.js'], badges: ['React Master'] },
  { id: 2, name: 'Arjun Patel', role: 'Full Stack Engineer', location: 'Hyderabad', experience: '4 years', matchScore: 91, imochaScore: 88, status: 'Assessment Pending', avatar: 'AP', skills: ['Python', 'Django', 'React'], badges: ['Python Pro'] },
  { id: 3, name: 'Sneha Reddy', role: 'DevOps Engineer', location: 'Chennai', experience: '5 years', matchScore: 89, imochaScore: 92, status: 'Shortlisted', avatar: 'SR', skills: ['Kubernetes', 'AWS', 'Terraform'], badges: ['AWS Certified'] },
  { id: 4, name: 'Vikram Singh', role: 'Backend Developer', location: 'Pune', experience: '3 years', matchScore: 85, imochaScore: 86, status: 'New Application', avatar: 'VS', skills: ['Java', 'Spring Boot', 'MongoDB'], badges: [] },
  { id: 5, name: 'Ananya Gupta', role: 'ML Engineer', location: 'Delhi', experience: '4 years', matchScore: 94, imochaScore: 97, status: 'Offer Extended', avatar: 'AG', skills: ['Python', 'TensorFlow', 'PyTorch'], badges: ['ML Expert'] },
]

const aiActions = [
  { id: 1, action: 'Scheduled interview with Priya Sharma', agent: 'Scheduling Agent', time: '2 min ago' },
  { id: 2, action: 'Sent assessment reminder to 12 candidates', agent: 'Communication Agent', time: '15 min ago' },
  { id: 3, action: 'Screened 34 new applications for React role', agent: 'Screening Agent', time: '1 hour ago' },
  { id: 4, action: 'Generated weekly pipeline report', agent: 'Analytics Agent', time: '3 hours ago' },
]

const jobs = [
  { id: 1, title: 'Senior React Developer', applications: 124, shortlisted: 18, interviews: 6 },
  { id: 2, title: 'DevOps Engineer', applications: 87, shortlisted: 12, interviews: 4 },
  { id: 3, title: 'ML Engineer', applications: 56, shortlisted: 8, interviews: 3 },
]

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const [portalView, setPortalView] = useState<'client' | 'candidate'>(
    user?.userType === 'candidate' ? 'candidate' : 'client'
  )
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold font-heading text-primary">ViraWorkX</span>
              </Link>

              <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setPortalView('client')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${portalView === 'client' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Client Portal
                </button>
                <button onClick={() => setPortalView('candidate')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${portalView === 'candidate' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Candidate Portal
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                />
              </div>

              <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 relative transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">3</span>
              </button>

              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.profile?.firstName || user?.email}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats[portalView].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <span className="text-green-600 text-sm font-medium bg-green-50 px-2 py-0.5 rounded-full">{stat.change}</span>
              </div>
              <p className="text-3xl font-bold font-heading text-gray-900 mb-1">{stat.value}</p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidate Pipeline */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold font-heading text-gray-900">{portalView === 'client' ? 'Candidate Pipeline' : 'Recommended Jobs'}</h2>
                <p className="text-gray-500 text-sm">{portalView === 'client' ? 'AI-ranked candidates with iMocha scores' : 'AI-matched opportunities'}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-2 text-sm transition-colors">
                  <Filter className="w-4 h-4" /> Filter
                </button>
                <button className="px-4 py-2 rounded-lg bg-primary text-white flex items-center gap-2 text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary/25">
                  <Plus className="w-4 h-4" /> {portalView === 'client' ? 'Add Job' : 'Upload Resume'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {candidates.map((c) => (
                <div key={c.id} onClick={() => setSelectedCandidate(selectedCandidate === c.id ? null : c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCandidate === c.id ? 'bg-primary/5 border-primary/30' : 'bg-gray-50/50 border-gray-200/50 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-semibold">{c.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{c.name}</h3>
                        {c.badges.map((b, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">{b}</span>
                        ))}
                      </div>
                      <p className="text-gray-500 text-sm truncate">{c.role} • {c.experience} • {c.location}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">Match</p>
                        <p className={`text-lg font-bold ${c.matchScore >= 90 ? 'text-green-600' : 'text-orange-500'}`}>{c.matchScore}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">iMocha</p>
                        <p className={`text-lg font-bold ${c.imochaScore >= 90 ? 'text-primary' : 'text-gray-600'}`}>{c.imochaScore}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                      c.status === 'Interview Scheduled' ? 'bg-purple-100 text-purple-700' :
                      c.status === 'Offer Extended' ? 'bg-green-100 text-green-700' :
                      c.status === 'Shortlisted' ? 'bg-blue-100 text-blue-700' :
                      c.status === 'Assessment Pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>{c.status}</span>
                  </div>

                  {selectedCandidate === c.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-2 flex-wrap mb-4">
                        {c.skills.map((s, i) => <span key={i} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm">{s}</span>)}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium flex items-center gap-2 hover:bg-primary-700 transition-colors">
                          <Video className="w-4 h-4" /> Schedule Interview
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium flex items-center gap-2 hover:bg-green-200 transition-colors">
                          <MessageSquare className="w-4 h-4" /> Message
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-200 transition-colors">
                          <FileText className="w-4 h-4" /> View Profile
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Agent Activity */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Agentic AI</h3>
                  <p className="text-xs text-gray-500">Recent automated actions</p>
                </div>
              </div>
              <div className="space-y-3">
                {aiActions.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-sm text-gray-700 mb-1">{a.action}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600 font-medium">{a.agent}</span>
                      <span className="text-xs text-gray-400">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Jobs / Profile */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{portalView === 'client' ? 'Active Jobs' : 'Profile Strength'}</h3>
                <button className="text-primary text-sm hover:text-primary-700 font-medium">View All</button>
              </div>

              {portalView === 'client' ? (
                <div className="space-y-3">
                  {jobs.map((j) => (
                    <div key={j.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer">
                      <h4 className="font-medium text-sm text-gray-900 mb-2">{j.title}</h4>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{j.applications} apps</span>
                        <span>{j.shortlisted} shortlisted</span>
                        <span>{j.interviews} interviews</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full w-[92%] bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                    </div>
                    <span className="absolute right-0 -top-6 text-green-600 font-bold">92%</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Resume uploaded</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Skills verified (iMocha)</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Video profile</span>
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                  <button className="w-full mt-4 px-4 py-2.5 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors">
                    Complete Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>© 2026 ViraWorkX — AI-Powered Global Recruiting</p>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
