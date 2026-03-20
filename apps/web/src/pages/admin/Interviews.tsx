import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Video, Plus, Search, ChevronLeft, ChevronRight, X, ExternalLink,
  CheckCircle, XCircle, Clock, Calendar, Users, Building2, MessageSquare, Star
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = ''

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-red-100 text-red-700',
  rescheduled: 'bg-purple-100 text-purple-700',
}

const INTERVIEW_TYPES = ['phone', 'video', 'technical', 'onsite', 'panel', 'final']

const EMPTY_FORM = {
  applicationId: '',
  interviewType: 'video' as const,
  title: '',
  scheduledAt: '',
  durationMinutes: 60,
  timezone: 'Asia/Kolkata',
  meetingUrl: '',
  meetingProvider: '',
}

const EMPTY_FEEDBACK = {
  overallRating: 3,
  recommendation: 'hire' as string,
  strengths: '',
  concerns: '',
  notes: '',
}

export default function AdminInterviews() {
  const { accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [appSearch, setAppSearch] = useState('')
  const [feedbackModal, setFeedbackModal] = useState<{ id: string; candidateName: string } | null>(null)
  const [feedbackForm, setFeedbackForm] = useState(EMPTY_FEEDBACK)
  const [viewFeedbackId, setViewFeedbackId] = useState<string | null>(null)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminInterviews', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      })
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`${API_URL}/api/v1/interviews?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  // Search applications for the create modal
  const { data: appsData } = useQuery({
    queryKey: ['appsForInterview', appSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '10' })
      if (appSearch) params.append('search', appSearch)
      const res = await fetch(`${API_URL}/api/v1/applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return { applications: [] }
      return res.json()
    },
    enabled: showCreate,
  })

  const createMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const res = await fetch(`${API_URL}/api/v1/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create interview')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInterviews'] })
      setShowCreate(false)
      setForm(EMPTY_FORM)
      setAppSearch('')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/v1/interviews/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminInterviews'] }),
  })

  const feedbackMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof EMPTY_FEEDBACK }) => {
      const res = await fetch(`${API_URL}/api/v1/interviews/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to submit feedback')
      return res.json()
    },
    onSuccess: () => {
      setFeedbackModal(null)
      setFeedbackForm(EMPTY_FEEDBACK)
    },
  })

  const { data: viewFeedbackData } = useQuery({
    queryKey: ['interviewFeedback', viewFeedbackId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/interviews/${viewFeedbackId}/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return { feedback: [] }
      return res.json()
    },
    enabled: !!viewFeedbackId,
  })

  const interviews = data?.interviews || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)
  const applications = appsData?.applications || []

  const formatDateTime = (dt: string) =>
    new Date(dt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'cancelled' || status === 'no_show') return <XCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-blue-500" />
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
            <p className="text-gray-600">Schedule and track all candidate interviews</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
          >
            <Plus className="w-5 h-5" />
            Schedule Interview
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
            <p className="text-sm text-gray-500 ml-auto">{total} total interviews</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Loading interviews...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">Failed to load interviews.</div>
          ) : interviews.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No interviews scheduled yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                Schedule First Interview
              </button>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Candidate</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Job / Company</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Scheduled</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Duration</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {interviews.map((iv: any) => {
                    const candidate = iv.application?.candidate
                    const job = iv.application?.job
                    return (
                      <tr key={iv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                              {candidate?.firstName?.[0]}{candidate?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {candidate?.firstName} {candidate?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{candidate?.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900 font-medium">{job?.title}</p>
                          <p className="text-xs text-gray-500">{job?.client?.companyName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="capitalize text-gray-700 text-sm">
                            {iv.interviewType?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {iv.scheduledAt ? formatDateTime(iv.scheduledAt) : '-'}
                          </div>
                          {iv.timezone && (
                            <p className="text-xs text-gray-400 mt-0.5">{iv.timezone}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {iv.durationMinutes} min
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(iv.status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[iv.status] || 'bg-gray-100 text-gray-700'}`}>
                              {iv.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {iv.meetingUrl && (
                              <a
                                href={iv.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg"
                                title="Join Meeting"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {iv.status === 'completed' && (
                              <>
                                <button
                                  onClick={() => {
                                    setFeedbackModal({
                                      id: iv.id,
                                      candidateName: `${candidate?.firstName} ${candidate?.lastName}`
                                    })
                                  }}
                                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                                  title="Add Feedback"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setViewFeedbackId(iv.id)}
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                  title="View Feedback"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {['scheduled', 'confirmed', 'rescheduled'].includes(iv.status) && (
                              <button
                                onClick={() => cancelMutation.mutate(iv.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Cancel"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
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

      {/* Add Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFeedbackModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submit Feedback</h2>
                <p className="text-sm text-gray-500">{feedbackModal.candidateName}</p>
              </div>
              <button onClick={() => setFeedbackModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setFeedbackForm((f) => ({ ...f, overallRating: r }))}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                        feedbackForm.overallRating === r
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500 self-center">
                    {feedbackForm.overallRating === 1 ? 'Poor' : feedbackForm.overallRating === 2 ? 'Below Average' : feedbackForm.overallRating === 3 ? 'Average' : feedbackForm.overallRating === 4 ? 'Good' : 'Excellent'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                <select
                  value={feedbackForm.recommendation}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, recommendation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="strong_hire">Strong Hire</option>
                  <option value="hire">Hire</option>
                  <option value="undecided">Undecided</option>
                  <option value="no_hire">No Hire</option>
                  <option value="strong_no_hire">Strong No Hire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
                <textarea
                  value={feedbackForm.strengths}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, strengths: e.target.value }))}
                  rows={2}
                  placeholder="What stood out positively..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concerns</label>
                <textarea
                  value={feedbackForm.concerns}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, concerns: e.target.value }))}
                  rows={2}
                  placeholder="Areas of concern or gaps..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any other observations..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setFeedbackModal(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => feedbackMutation.mutate({ id: feedbackModal.id, data: feedbackForm })}
                disabled={feedbackMutation.isPending}
                className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {feedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Feedback Modal */}
      {viewFeedbackId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewFeedbackId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Interview Feedback</h2>
              <button onClick={() => setViewFeedbackId(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {!viewFeedbackData?.feedback?.length ? (
                <p className="text-gray-400 text-center py-8">No feedback submitted yet</p>
              ) : (
                <div className="space-y-4">
                  {viewFeedbackData.feedback.map((fb: any) => (
                    <div key={fb.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {[1,2,3,4,5].map((r) => (
                            <div key={r} className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${r <= fb.overallRating ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{r}</div>
                          ))}
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                          fb.recommendation.includes('strong_hire') ? 'bg-green-100 text-green-700' :
                          fb.recommendation === 'hire' ? 'bg-blue-100 text-blue-700' :
                          fb.recommendation.includes('no_hire') ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{fb.recommendation.replace(/_/g, ' ')}</span>
                      </div>
                      {fb.strengths && <p className="text-sm text-gray-700 mb-2"><span className="font-medium text-green-700">Strengths:</span> {fb.strengths}</p>}
                      {fb.concerns && <p className="text-sm text-gray-700 mb-2"><span className="font-medium text-red-600">Concerns:</span> {fb.concerns}</p>}
                      {fb.notes && <p className="text-sm text-gray-500">{fb.notes}</p>}
                      <p className="text-xs text-gray-400 mt-2">{new Date(fb.submittedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Interview Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Schedule Interview</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Application selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Application *
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search candidate name or job..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                {applications.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y max-h-36 overflow-y-auto">
                    {applications.map((app: any) => (
                      <button
                        key={app.id}
                        onClick={() => {
                          setForm((f) => ({ ...f, applicationId: app.id }))
                          setAppSearch(`${app.candidate?.firstName} ${app.candidate?.lastName} — ${app.job?.title}`)
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm ${form.applicationId === app.id ? 'bg-primary/5 text-primary' : ''}`}
                      >
                        <p className="font-medium">{app.candidate?.firstName} {app.candidate?.lastName}</p>
                        <p className="text-gray-500 text-xs">{app.job?.title} · {app.job?.client?.companyName}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Interview type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type *</label>
                <select
                  value={form.interviewType}
                  onChange={(e) => setForm((f) => ({ ...f, interviewType: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Screen Round 1"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Date/time + duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled At *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="Asia/Kolkata">IST — India (Asia/Kolkata)</option>
                  <option value="America/Los_Angeles">PST — US West (America/Los_Angeles)</option>
                  <option value="America/Chicago">CST — US Central (America/Chicago)</option>
                  <option value="America/New_York">EST — US East (America/New_York)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              {/* Meeting URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  value={form.meetingUrl}
                  onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const payload = {
                    ...form,
                    scheduledAt: new Date(form.scheduledAt).toISOString(),
                  }
                  createMutation.mutate(payload as any)
                }}
                disabled={!form.applicationId || !form.scheduledAt || createMutation.isPending}
                className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
