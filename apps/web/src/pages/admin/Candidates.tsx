import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Users, Briefcase, Search, Filter, MoreVertical,
  Zap, LogOut, Bot, Activity, Shield, Eye, ClipboardCheck,
  MapPin, Mail, Star, ChevronLeft, ChevronRight, Award
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function AdminCandidates() {
  const { user, logout, token } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminCandidates', page, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`${API_URL}/api/v1/candidates?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch candidates')
      return res.json()
    }
  })

  const candidates = data?.candidates || []
  const totalPages = Math.ceil((data?.total || 0) / limit)

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'A'
  }

  const getProfileScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

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
              <Link to="/admin/dashboard" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Activity className="w-5 h-5 mr-3" />
                Overview
              </Link>
            </li>
            <li>
              <Link to="/admin/ai-monitor" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Bot className="w-5 h-5 mr-3" />
                AI Monitor
              </Link>
            </li>
            <li>
              <Link to="/admin/test-allocation" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <ClipboardCheck className="w-5 h-5 mr-3" />
                Test Allocation
              </Link>
            </li>
            <li>
              <Link to="/admin/clients" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Building2 className="w-5 h-5 mr-3" />
                Clients
              </Link>
            </li>
            <li>
              <Link to="/admin/candidates" className="flex items-center px-4 py-3 text-white bg-slate-800 rounded-lg font-medium">
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
              <Link to="/admin/audit-log" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Eye className="w-5 h-5 mr-3" />
                Audit Log
              </Link>
            </li>
            <li>
              <Link to="/admin/settings" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
            <p className="text-gray-600">View and manage candidate profiles</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates by name, email, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading candidates...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Failed to load candidates. Please try again.
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No candidates found</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Candidate</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Current Role</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Location</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Experience</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Profile Score</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Badges</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {candidates.map((candidate: any) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-medium">
                            {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {candidate.firstName} {candidate.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{candidate.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{candidate.currentTitle || '-'}</p>
                        <p className="text-sm text-gray-500">{candidate.currentCompany || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.location ? (
                          <div className="flex items-center gap-1 text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {candidate.location}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {candidate.experienceYears ? `${candidate.experienceYears} years` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProfileScoreColor(candidate.profileScore || 0)}`}>
                          {candidate.profileScore || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span className="text-gray-600">{candidate._count?.skillBadges || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} candidates
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
