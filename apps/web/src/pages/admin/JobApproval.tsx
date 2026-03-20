import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Briefcase, MapPin, DollarSign, CheckCircle, XCircle, Building2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = ''

export default function AdminJobApproval() {
  const { accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()
  const [rejectModal, setRejectModal] = useState<{ jobId: string; title: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pendingJobApprovals'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/jobs/pending-approval`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch pending jobs')
      return res.json()
    },
    refetchInterval: 30000,
    enabled: !!token,
  })

  const approveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to approve job')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pendingJobApprovals'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: string; reason: string }) => {
      const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}/reject-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error('Failed to reject job')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJobApprovals'] })
      setRejectModal(null)
      setRejectReason('')
    },
  })

  const jobs: any[] = data?.jobs || []

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`
    if (min) return `From $${(min / 1000).toFixed(0)}k`
    return `Up to $${(max! / 1000).toFixed(0)}k`
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Job Approvals</h1>
          <p className="text-gray-600">
            Review and approve jobs submitted by clients before they go live
          </p>
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            Failed to load pending jobs. Check your connection or try refreshing.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Pending approvals:</span>
            <span className="bg-yellow-100 text-yellow-800 text-sm font-bold px-3 py-1 rounded-full">
              {jobs.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No pending approvals</p>
            <p className="text-gray-400 text-sm mt-1">All submitted jobs have been reviewed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        <p className="text-sm text-gray-500">{job.client?.companyName || 'Unknown Company'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {job.location}
                        </span>
                      )}
                      {(job.salaryMin || job.salaryMax) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" /> {formatSalary(job.salaryMin, job.salaryMax)}
                        </span>
                      )}
                      {job.employmentType && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" /> {job.employmentType.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-gray-400">
                        Submitted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {job.skillsRequired?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.skillsRequired.slice(0, 6).map((skill: string) => (
                          <span key={skill} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                            {skill}
                          </span>
                        ))}
                        {job.skillsRequired.length > 6 && (
                          <span className="text-xs text-gray-400">+{job.skillsRequired.length - 6} more</span>
                        )}
                      </div>
                    )}

                    {job.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(job.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectModal({ jobId: job.id, title: job.title })}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm m-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Reject Job Posting</h2>
            <p className="text-sm text-gray-500 mb-4">
              Rejecting <span className="font-medium text-gray-900">{rejectModal.title}</span>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional — will be shared with client)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ jobId: rejectModal.jobId, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
