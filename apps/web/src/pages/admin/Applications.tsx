import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Layers, Search, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const STAGE_STYLES: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  screening: 'bg-blue-100 text-blue-700',
  assessment: 'bg-purple-100 text-purple-700',
  assessment_complete: 'bg-indigo-100 text-indigo-700',
  shortlisted: 'bg-cyan-100 text-cyan-700',
  interview: 'bg-amber-100 text-amber-700',
  offer: 'bg-orange-100 text-orange-700',
  hired: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

export default function AdminApplications() {
  const { accessToken: token } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminApplications', page, searchQuery, stageFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (searchQuery) params.append('search', searchQuery)
      if (stageFilter) params.append('stage', stageFilter)
      const res = await fetch(`${API_URL}/api/v1/applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch applications')
      return res.json()
    },
  })

  const applications = data?.applications || []
  const totalPages = Math.ceil((data?.total || 0) / limit)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-500'
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600">All candidate applications across all jobs</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by candidate name or job title..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Stages</option>
              <option value="new">New</option>
              <option value="screening">Screening</option>
              <option value="assessment">Assessment</option>
              <option value="assessment_complete">Assessment Complete</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Loading applications...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">Failed to load applications. Please try again.</div>
          ) : applications.length === 0 ? (
            <div className="p-8 text-center">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No applications found</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Candidate</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Job</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Company</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Stage</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Match Score</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {applications.map((app: any) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                            {app.candidate?.firstName?.[0]}{app.candidate?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {app.candidate?.firstName} {app.candidate?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{app.candidate?.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 font-medium">{app.job?.title}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {app.job?.client?.companyName || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            STAGE_STYLES[app.stage] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {app.stage?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {app.matchScore != null ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`w-4 h-4 ${getMatchScoreColor(app.matchScore)}`} />
                            <span className={`font-medium ${getMatchScoreColor(app.matchScore)}`}>
                              {app.matchScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {app.appliedAt ? formatDate(app.appliedAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} applications
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
      </div>
    </AdminLayout>
  )
}
