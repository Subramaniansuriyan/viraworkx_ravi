import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Search, MoreVertical, MapPin, ChevronLeft, ChevronRight, Award,
  UserPlus, X, Send, Eye, ClipboardList
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const INVITE_EMPTY = { firstName: '', lastName: '', email: '', phone: '' }

export default function AdminCandidates() {
  const { accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState(INVITE_EMPTY)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [selectedTestId, setSelectedTestId] = useState('')
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

  const { data: testsData } = useQuery({
    queryKey: ['imochaTests'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/assessments/tests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch tests')
      return res.json()
    },
    enabled: showAssignModal,
  })

  const assignMutation = useMutation({
    mutationFn: async ({ testId, candidateId }: { testId: string; candidateId: string }) => {
      const res = await fetch(`${API_URL}/api/v1/assessments/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ testId, candidateId }),
      })
      if (!res.ok) throw new Error('Failed to assign assessment')
      return res.json()
    },
    onSuccess: () => {
      setAssignSuccess(true)
      setTimeout(() => {
        setShowAssignModal(false)
        setSelectedCandidate(null)
        setSelectedTestId('')
        setAssignSuccess(false)
        assignMutation.reset()
      }, 2000)
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof INVITE_EMPTY) => {
      const res = await fetch(`${API_URL}/api/v1/candidates/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Invite failed')
      return res.json()
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
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (searchQuery) params.append('search', searchQuery)
      const res = await fetch(`${API_URL}/api/v1/candidates?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch candidates')
      return res.json()
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Candidate</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Current Role</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Location</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Experience</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Profile Score</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Badges</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Tier</th>
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
                        {candidate.assessmentTier ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              candidate.assessmentTier === 'Tier 1'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                : candidate.assessmentTier === 'Tier 2'
                                ? 'bg-gray-100 text-gray-700 border border-gray-300'
                                : 'bg-orange-100 text-orange-700 border border-orange-300'
                            }`}
                          >
                            {candidate.assessmentTier}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
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
                                  window.open(`/admin/candidates/${candidate.id}`, '_blank')
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
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">-- Choose a test --</option>
                      {(testsData?.tests || []).map((test: any) => (
                        <option key={test.testId || test.id} value={test.testId || test.id}>
                          {test.testName || test.name}
                        </option>
                      ))}
                    </select>
                    {(!testsData?.tests || testsData.tests.length === 0) && (
                      <p className="text-xs text-gray-400 mt-1">
                        No tests found. Ensure iMocha is configured correctly.
                      </p>
                    )}
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
                      })
                    }
                    disabled={!selectedTestId || assignMutation.isPending}
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
