import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Search, MoreVertical, MapPin, ChevronLeft, ChevronRight, Award,
  UserPlus, X, Send, Eye, ClipboardList
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../services/api'

const INVITE_EMPTY = { firstName: '', lastName: '', email: '', phone: '' }

export default function AdminCandidates() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState(INVITE_EMPTY)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [selectedTestId, setSelectedTestId] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const limit = 10

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: testsData, isLoading: testsLoading, isError: testsError } = useQuery({
    queryKey: ['imochaTests', showAssignModal],
    queryFn: async () => {
      const res = await api.get('/assessments/tests')
      return res.data
    },
    enabled: showAssignModal,
    retry: 1,
  })

  const assignMutation = useMutation({
    mutationFn: async ({ testId, candidateId, expiresInDays }: { testId: string; candidateId: string; expiresInDays: number }) => {
      const res = await api.post('/assessments/invite', { testId, candidateId, expiresInDays })
      return res.data
    },
    onSuccess: () => {
      setAssignSuccess(true)
      setTimeout(() => {
        setShowAssignModal(false)
        setSelectedCandidate(null)
        setSelectedTestId('')
        setExpiresInDays(7)
        setAssignSuccess(false)
        assignMutation.reset()
      }, 2000)
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof INVITE_EMPTY) => {
      const res = await api.post('/candidates/invite', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCandidates'] })
      setInviteSuccess(true)
      setTimeout(() => {
        setShowInvite(false)
        setInvite(INVITE_EMPTY)
        setInviteSuccess(false)
      }, 2000)
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminCandidates', page, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = { page: page.toString(), limit: limit.toString() }
      if (searchQuery) params.search = searchQuery
      const res = await api.get('/candidates', { params })
      return res.data
    },
  })

  const candidates = data?.candidates || []
  const totalPages = Math.ceil((data?.total || 0) / limit)

  const getProfileScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
            <p className="text-gray-600">View and manage candidate profiles</p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
          >
            <UserPlus className="w-5 h-5" />
            Invite Candidate
          </button>
        </div>

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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading candidates...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">Failed to load candidates. Please try again.</div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No candidates found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Candidate</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Current Role</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Location</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Experience</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Profile Completeness</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Badges</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Assessment & Tier</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y [&_td]:align-middle">
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
                            <p className="text-sm text-gray-500">{candidate.email || candidate.user?.email}</p>
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
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getProfileScoreColor(candidate.profileScore || 0)}`}
                        >
                          {candidate.profileScore || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span className="text-gray-600">{candidate.skillBadges?.length ?? candidate._count?.skillBadges ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.latestAssessment ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                candidate.latestAssessment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                candidate.latestAssessment.status === 'started' ? 'bg-yellow-100 text-yellow-700' :
                                candidate.latestAssessment.status === 'invited' ? 'bg-blue-100 text-blue-700' :
                                candidate.latestAssessment.status === 'expired' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {candidate.latestAssessment.status}
                              </span>
                              {candidate.assessmentTier && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
                                  candidate.assessmentTier === 'Tier 1'
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                    : candidate.assessmentTier === 'Tier 2'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-green-100 text-green-800 border border-green-300'
                                }`}>
                                  {candidate.assessmentTier}
                                </span>
                              )}
                            </div>
                            {candidate.latestAssessment.score != null && (
                              <p className="text-xs text-gray-500">
                                Score: {candidate.latestAssessment.score}/{candidate.latestAssessment.maxScore}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block" ref={openMenuId === candidate.id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === candidate.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <button
                                onClick={() => {
                                  setOpenMenuId(null)
                                  navigate(`/admin/candidates/${candidate.id}`)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4" /> View Profile
                              </button>
                              <button
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setSelectedCandidate(candidate)
                                  setShowAssignModal(true)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <ClipboardList className="w-4 h-4" /> Assign Assessment
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} candidates
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

      {/* Invite Candidate Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invite Candidate</h2>
                <p className="text-sm text-gray-500">Send a personal invitation to onboard</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xl font-semibold text-gray-900">Invitation Sent!</p>
                <p className="text-gray-500 text-sm mt-1">
                  {invite.firstName} will receive an email to complete their profile.
                </p>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={invite.firstName}
                        onChange={(e) => setInvite((i) => ({ ...i, firstName: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Priya"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={invite.lastName}
                        onChange={(e) => setInvite((i) => ({ ...i, lastName: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Sharma"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={invite.email}
                      onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="priya@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={invite.phone}
                      onChange={(e) => setInvite((i) => ({ ...i, phone: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  {inviteMutation.isError && (
                    <p className="text-sm text-red-600">Failed to send invite. Please try again.</p>
                  )}
                </div>
                <div className="flex gap-3 p-6 border-t bg-gray-50">
                  <button
                    onClick={() => setShowInvite(false)}
                    className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => inviteMutation.mutate(invite)}
                    disabled={!invite.firstName || !invite.email || inviteMutation.isPending}
                    className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviteMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Assign Assessment Modal */}
      {showAssignModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAssignModal(false)
              setSelectedTestId('')
              setAssignSuccess(false)
              assignMutation.reset()
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Assign Assessment</h2>
                <p className="text-sm text-gray-500">
                  {selectedCandidate.firstName} {selectedCandidate.lastName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedTestId('')
                  setAssignSuccess(false)
                  assignMutation.reset()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {assignSuccess ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xl font-semibold text-gray-900">Assessment Assigned!</p>
                <p className="text-gray-500 text-sm mt-1">
                  An invitation has been sent to {selectedCandidate.user?.email}.
                </p>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Assessment Test *
                    </label>
                    {testsLoading ? (
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-400 text-sm">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                        Loading tests from iMocha...
                      </div>
                    ) : testsError ? (
                      <div className="px-4 py-2 border border-red-200 rounded-lg bg-red-50 text-sm text-red-600">
                        Failed to load tests from iMocha. Check API configuration.
                      </div>
                    ) : (
                      <select
                        value={selectedTestId}
                        onChange={(e) => setSelectedTestId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      >
                        <option value="">-- Choose a test --</option>
                        {(testsData?.tests || []).map((test: any) => (
                          <option key={test.id} value={test.id}>
                            {test.name}{test.duration ? ` (${test.duration} min)` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires in (days)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Math.max(1, Math.min(30, Number(e.target.value))))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  {assignMutation.isError && (
                    <p className="text-sm text-red-600">Failed to assign assessment. Please try again.</p>
                  )}
                </div>
                <div className="flex gap-3 p-6 border-t bg-gray-50">
                  <button
                    onClick={() => {
                      setShowAssignModal(false)
                      setSelectedTestId('')
                      assignMutation.reset()
                    }}
                    className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      assignMutation.mutate({
                        testId: selectedTestId,
                        candidateId: selectedCandidate.id,
                        expiresInDays,
                      })
                    }
                    disabled={!selectedTestId || assignMutation.isPending || testsLoading || testsError}
                    className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assignMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {assignMutation.isPending ? 'Sending...' : 'Send Assessment'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
