import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../services/api'
import {
  ArrowLeft, MapPin, Briefcase, Mail,
  FileText, ExternalLink
} from 'lucide-react'

export default function AdminCandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [rejectAppId, setRejectAppId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['candidateDetail', id],
    queryFn: async () => {
      const res = await api.get(`/candidates/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  const { data: appsData } = useQuery({
    queryKey: ['candidateApplications', id],
    queryFn: async () => {
      const res = await api.get('/applications', { params: { candidateId: id, limit: 50 } })
      return res.data
    },
    enabled: !!id,
  })

  const { data: assessData } = useQuery({
    queryKey: ['candidateAssessments', id],
    queryFn: async () => {
      const res = await api.get('/assessments', { params: { candidateId: id } })
      return res.data
    },
    enabled: !!id,
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ appId, reason }: { appId: string; reason: string }) => {
      const res = await api.post(`/applications/${appId}/reject`, { reason })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidateApplications', id] })
      setRejectAppId(null)
      setRejectReason('')
    },
  })

  const candidate = data?.candidate
  const applications = appsData?.applications || []
  const assessments = assessData?.assessments || []

  const STAGE_COLORS: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700',
    screening: 'bg-blue-100 text-blue-700',
    assessment: 'bg-purple-100 text-purple-700',
    assessment_complete: 'bg-purple-100 text-purple-700',
    shortlisted: 'bg-amber-100 text-amber-700',
    interview: 'bg-orange-100 text-orange-700',
    offer: 'bg-green-100 text-green-700',
    hired: 'bg-green-600 text-white',
    rejected: 'bg-red-100 text-red-700',
    withdrawn: 'bg-gray-100 text-gray-500',
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (!candidate) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-gray-500">Candidate not found.</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin/candidates" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <p className="text-gray-600">{candidate.headline || candidate.currentTitle || 'Candidate'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Profile */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
              <div className="space-y-3 text-sm">
                {candidate.user?.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {candidate.user.email}
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {candidate.location}
                  </div>
                )}
                {candidate.experienceYears && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    {candidate.experienceYears} years experience
                  </div>
                )}
              </div>
              {candidate.skills?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {candidate.resumeUrl && (
                <a
                  href={candidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 text-primary text-sm hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View Resume
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* KYC Documents */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">KYC Documents</h2>
              <div className="space-y-3">
                {[
                  { label: 'PAN Card', url: candidate.panCardUrl },
                  { label: 'Aadhaar Front', url: candidate.aadhaarFrontUrl },
                  { label: 'Aadhaar Back', url: candidate.aadhaarBackUrl },
                ].map(({ label, url }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Not uploaded</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle + Right */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b">
                <h2 className="font-semibold text-gray-900">Applications ({applications.length})</h2>
              </div>
              <div className="divide-y">
                {applications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No applications</div>
                ) : applications.map((app: any) => (
                  <div key={app.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{app.job?.title}</p>
                      <p className="text-sm text-gray-500">{app.job?.client?.companyName}</p>
                      {app.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">Rejected: {app.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[app.stage] || 'bg-gray-100 text-gray-700'}`}>
                        {app.stage.replace(/_/g, ' ')}
                      </span>
                      {app.stage !== 'rejected' && app.stage !== 'hired' && app.stage !== 'withdrawn' && (
                        <button
                          onClick={() => setRejectAppId(app.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessments */}
            {assessments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b">
                  <h2 className="font-semibold text-gray-900">Assessments ({assessments.length})</h2>
                </div>
                <div className="divide-y">
                  {assessments.map((a: any) => (
                    <div key={a.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{a.imochaTestId}</p>
                        <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.score != null && (
                          <span className="text-sm font-semibold text-green-600">{a.score}/{a.maxScore}</span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === 'completed' ? 'bg-green-100 text-green-700' :
                          a.status === 'invited' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {a.status}
                        </span>
                        {a.invitationUrl && ['invited', 'started'].includes(a.status) && (
                          <a href={a.invitationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            Test Link
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Application Modal */}
      {rejectAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectAppId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm m-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reject Application</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectAppId(null)} className="flex-1 py-2 border border-gray-200 rounded-lg font-medium text-gray-700">Cancel</button>
              <button
                onClick={() => rejectMutation.mutate({ appId: rejectAppId, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
