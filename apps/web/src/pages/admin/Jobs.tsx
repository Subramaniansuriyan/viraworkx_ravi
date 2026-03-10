import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Briefcase, Search, ChevronLeft, ChevronRight, ExternalLink, Building2
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-700',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-700',
  filled: 'bg-blue-100 text-blue-700',
}

const REMOTE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

export default function AdminJobs() {
  const { accessToken: token } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 15

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminJobs', page, searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`${API_URL}/api/v1/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch jobs')
      return res.json()
    },
  })

  const jobs = data?.jobs || []
  const totalPages = Math.ceil((data?.total || 0) / limit)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
            <p className="text-gray-600">All job postings across all client companies</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs by title or company..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="filled">Filled</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Loading jobs...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">Failed to load jobs. Please try again.</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No jobs found</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Job Title</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Company</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Work Type</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Applications</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Posted</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jobs.map((job: any) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-sm text-gray-500">{job.department || 'No department'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {job.client?.companyLogoUrl ? (
                            <img
                              src={job.client.companyLogoUrl}
                              alt=""
                              className="w-7 h-7 rounded object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <span className="text-gray-700">{job.client?.companyName || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            STATUS_STYLES[job.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {REMOTE_LABELS[job.remotePolicy] || job.remotePolicy || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 font-medium">
                          {job._count?.applications || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {job.postedAt ? formatDate(job.postedAt) : job.createdAt ? formatDate(job.createdAt) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/client/jobs/${job.id}/pipeline`}
                          className="inline-flex items-center gap-1 p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg"
                          title="View Pipeline"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} jobs
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
