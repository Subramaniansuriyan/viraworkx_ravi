import { useState } from 'react'
import { Users, Briefcase, Clock, Video, Bot, Award, Target, FileText, MessageSquare, Filter, Plus, Bell, Zap, Star, MapPin, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'

const stats = {
  client: [
    { label: 'Active Jobs', value: '12', change: '+3', icon: Briefcase, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Candidates', value: '847', change: '+156', icon: Users, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Interviews Today', value: '8', change: '+2', icon: Video, color: 'from-violet-500 to-violet-600' },
    { label: 'Avg. Time to Hire', value: '18d', change: '-4d', icon: Clock, color: 'from-amber-500 to-amber-600' },
  ],
  candidate: [
    { label: 'Job Matches', value: '24', change: '+8', icon: Target, color: 'from-blue-500 to-blue-600' },
    { label: 'Applications', value: '6', change: '+2', icon: FileText, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Interviews', value: '3', change: '+1', icon: Video, color: 'from-violet-500 to-violet-600' },
    { label: 'Profile Score', value: '92%', change: '+5%', icon: Award, color: 'from-amber-500 to-amber-600' },
  ]
}

const candidates = [
  { id: 1, name: 'Priya Sharma', role: 'Senior React Developer', location: 'Bangalore', experience: '6 years', matchScore: 96, imochaScore: 94, status: 'Interview Scheduled', avatar: '👩‍💻', skills: ['React', 'TypeScript', 'Node.js'], badges: ['React Master'] },
  { id: 2, name: 'Arjun Patel', role: 'Full Stack Engineer', location: 'Hyderabad', experience: '4 years', matchScore: 91, imochaScore: 88, status: 'Assessment Pending', avatar: '👨‍💻', skills: ['Python', 'Django', 'React'], badges: ['Python Pro'] },
  { id: 3, name: 'Sneha Reddy', role: 'DevOps Engineer', location: 'Chennai', experience: '5 years', matchScore: 89, imochaScore: 92, status: 'Shortlisted', avatar: '👩‍🔬', skills: ['Kubernetes', 'AWS', 'Terraform'], badges: ['AWS Certified'] },
  { id: 4, name: 'Vikram Singh', role: 'Backend Developer', location: 'Pune', experience: '3 years', matchScore: 85, imochaScore: 86, status: 'New Application', avatar: '👨‍🎓', skills: ['Java', 'Spring Boot', 'MongoDB'], badges: [] },
  { id: 5, name: 'Ananya Gupta', role: 'ML Engineer', location: 'Delhi', experience: '4 years', matchScore: 94, imochaScore: 97, status: 'Offer Extended', avatar: '👩‍🔬', skills: ['Python', 'TensorFlow', 'PyTorch'], badges: ['ML Expert'] },
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
  const [portalView, setPortalView] = useState<'client' | 'candidate'>('client')
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">ViraWorkx<span className="text-blue-400">.ai</span></span>
              </div>
              
              <div className="flex bg-slate-800/50 rounded-lg p-1">
                <button onClick={() => setPortalView('client')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${portalView === 'client' ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  Client Portal
                </button>
                <button onClick={() => setPortalView('candidate')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${portalView === 'candidate' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  Candidate Portal
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 relative">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">3</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold">RS</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats[portalView].map((stat, i) => (
            <div key={i} className="relative group">
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50 hover:border-slate-700/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-emerald-400 text-sm font-medium">{stat.change}</span>
                </div>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Candidate Pipeline */}
          <div className="col-span-2 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">{portalView === 'client' ? 'Candidate Pipeline' : 'Recommended Jobs'}</h2>
                <p className="text-slate-400 text-sm">{portalView === 'client' ? 'AI-ranked candidates with iMocha scores' : 'AI-matched opportunities'}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4" /> Filter
                </button>
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white flex items-center gap-2 text-sm font-medium">
                  <Plus className="w-4 h-4" /> {portalView === 'client' ? 'Add Job' : 'Upload Resume'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {candidates.map((c) => (
                <div key={c.id} onClick={() => setSelectedCandidate(selectedCandidate === c.id ? null : c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCandidate === c.id ? 'bg-slate-800/80 border-blue-500/50' : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl">{c.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{c.name}</h3>
                        {c.badges.map((b, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">{b}</span>
                        ))}
                      </div>
                      <p className="text-slate-400 text-sm">{c.role} • {c.experience} • {c.location}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Match</p>
                        <p className={`text-lg font-bold ${c.matchScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{c.matchScore}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">iMocha</p>
                        <p className={`text-lg font-bold ${c.imochaScore >= 90 ? 'text-blue-400' : 'text-slate-300'}`}>{c.imochaScore}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      c.status === 'Interview Scheduled' ? 'bg-violet-500/20 text-violet-400' :
                      c.status === 'Offer Extended' ? 'bg-emerald-500/20 text-emerald-400' :
                      c.status === 'Shortlisted' ? 'bg-blue-500/20 text-blue-400' :
                      c.status === 'Assessment Pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>{c.status}</span>
                  </div>
                  
                  {selectedCandidate === c.id && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="flex gap-2 flex-wrap mb-4">
                        {c.skills.map((s, i) => <span key={i} className="px-3 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-sm">{s}</span>)}
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium flex items-center gap-2">
                          <Video className="w-4 h-4" /> Schedule Interview
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> Message
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-medium flex items-center gap-2">
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
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Agentic AI</h3>
                  <p className="text-xs text-slate-500">Recent automated actions</p>
                </div>
              </div>
              <div className="space-y-3">
                {aiActions.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    <p className="text-sm mb-1">{a.action}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-violet-400">{a.agent}</span>
                      <span className="text-xs text-slate-500">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Jobs / Profile */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{portalView === 'client' ? 'Active Jobs' : 'Profile Strength'}</h3>
                <button className="text-blue-400 text-sm hover:text-blue-300">View All</button>
              </div>
              
              {portalView === 'client' ? (
                <div className="space-y-3">
                  {jobs.map((j) => (
                    <div key={j.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                      <h4 className="font-medium text-sm mb-2">{j.title}</h4>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>{j.applications} apps</span>
                        <span>{j.shortlisted} shortlisted</span>
                        <span>{j.interviews} interviews</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full w-[92%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                    </div>
                    <span className="absolute right-0 -top-6 text-emerald-400 font-bold">92%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Resume uploaded</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Skills verified (iMocha)</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Video profile</span>
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                    Complete Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>© 2026 ViraWorkx.ai — AI-Powered Global Recruiting</p>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
