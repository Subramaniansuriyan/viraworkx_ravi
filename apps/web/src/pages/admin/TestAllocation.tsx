import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, AlertTriangle, CheckCircle, Target, MapPin, Briefcase,
  Award, X, Send, Star, Search, Clock, Calendar, ExternalLink
} from 'lucide-react'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'

interface PendingCandidate {
  candidateId: string
  candidate: {
    id: string
    firstName: string
    lastName: string
    email: string
    headline: string
    location: string
    experienceYears: number
    skills: string[]
    profileScore: number
    badges: Array<{ skillName: string; level: string; percentile: number }>
  }
}

interface Test {
  id: string
  name: string
  category: string
  duration: number
  skills: string[]
  difficulty: string
}

interface ActiveInvite {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  testId: string
  testName: string | null
  status: string
  invitedAt: string
  expiresAt: string | null
  startedAt: string | null
  completedAt: string | null
  score: number | null
  maxScore: number | null
  invitationUrl: string | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

function TimeRemaining({ expiresAt, status }: { expiresAt: string | null; status: string }) {
  if (status === 'completed') {
    return <span className="text-green-600 font-medium text-xs">Completed</span>
  }
  if (status === 'expired' || status === 'cancelled') {
    return <span className="text-red-500 font-medium text-xs capitalize">{status}</span>
  }
  if (!expiresAt) return <span className="text-gray-400 text-xs">—</span>

  const now = Date.now()
  const exp = new Date(expiresAt).getTime()
  const diffMs = exp - now

  if (diffMs <= 0) {
    return <span className="text-red-500 font-medium text-xs">Expired</span>
  }

  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHrs < 24) {
    return (
      <span className="text-orange-500 font-medium text-xs flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Expires in {diffHrs}h
      </span>
    )
  }
  return (
    <span className="text-blue-600 font-medium text-xs flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {diffDays}d remaining
    </span>
  )
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  invited:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Invite Sent' },
  started:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
  completed: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Completed' },
  expired:   { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Expired' },
  cancelled: { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Cancelled' },
  pending:   { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Pending' },
}

export default function TestAllocation() {

  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteStatusFilter, setInviteStatusFilter] = useState('all')
  const [selectedCandidate, setSelectedCandidate] = useState<PendingCandidate | null>(null)
  const [selectedTestId, setSelectedTestId] = useState('')
  const [allocationNotes, setAllocationNotes] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(() => {
    try {
      const saved = localStorage.getItem('viraworkx_admin_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        return settings.assessmentExpirationDays || 7
      }
    } catch {}
    return 7
  })

  // Fetch pending candidates for allocation
  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingAllocation'],
    queryFn: async () => {
      const res = await api.get('/assessments/admin/pending-allocation')
      return res.data
    },
    refetchInterval: 30000
  })

  // Fetch available tests
  const { data: testsData } = useQuery({
    queryKey: ['availableTests'],
    queryFn: async () => {
      const res = await api.get('/assessments/tests')
      return res.data
    }
  })

  // Fetch active invites for tracker
  const { data: invitesData, isLoading: loadingInvites } = useQuery({
    queryKey: ['activeInvites'],
    queryFn: async () => {
      const res = await api.get('/assessments/admin/active-invites')
      return res.data
    },
    refetchInterval: 60000
  })

  // Allocate test mutation
  const allocateMutation = useMutation({
    mutationFn: async (data: { candidateId: string; testId: string; expiresInDays: number; notes: string }) => {
      const res = await api.post('/assessments/admin/allocate', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAllocation'] })
      queryClient.invalidateQueries({ queryKey: ['activeInvites'] })
      setSelectedCandidate(null)
      setSelectedTestId('')
      setAllocationNotes('')
    }
  })

  const candidates: PendingCandidate[] = pendingData?.candidates || []
  const tests: Test[] = testsData?.tests || []
  const allInvites: ActiveInvite[] = invitesData?.assessments || []

  const filtered = candidates.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.candidate.firstName.toLowerCase().includes(q) ||
      item.candidate.lastName.toLowerCase().includes(q) ||
      item.candidate.email.toLowerCase().includes(q)
    )
  })

  const filteredInvites = allInvites.filter((inv) => {
    const matchesStatus = inviteStatusFilter === 'all' || inv.status === inviteStatusFilter
    if (!matchesStatus) return false
    if (!inviteSearch.trim()) return true
    const q = inviteSearch.toLowerCase()
    return (
      inv.candidateName.toLowerCase().includes(q) ||
      inv.candidateEmail.toLowerCase().includes(q) ||
      (inv.testName || '').toLowerCase().includes(q)
    )
  })

  const handleAllocate = () => {
    if (!selectedCandidate || !selectedTestId) return
    allocateMutation.mutate({
      candidateId: selectedCandidate.candidateId,
      testId: selectedTestId,
      expiresInDays,
      notes: allocationNotes
    })
  }

  // Invite stats
  const inviteStats = {
    total: allInvites.length,
    invited: allInvites.filter(i => i.status === 'invited').length,
    started: allInvites.filter(i => i.status === 'started').length,
    completed: allInvites.filter(i => i.status === 'completed').length,
    expired: allInvites.filter(i => i.status === 'expired').length,
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Allocation</h1>
            <p className="text-gray-600">Assign assessments to matched candidates</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{candidates.length} pending allocation</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Human-in-the-Loop Workflow</p>
              <p className="text-sm text-blue-700 mt-1">
                Review AI-screened candidates below and manually allocate assessments.
                Only candidates with established match scores appear here.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          />
        </div>

        {/* Candidates List */}
        {loadingPending ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading candidates...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No candidates pending test allocation</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches</h3>
            <p className="text-gray-500">No candidates match your search</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div
                key={item.candidateId}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Candidate Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                        {item.candidate.firstName[0]}{item.candidate.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.candidate.firstName} {item.candidate.lastName}
                        </h3>
                        <p className="text-gray-500 text-sm">{item.candidate.email}</p>
                        <p className="text-gray-600">{item.candidate.headline || 'No headline'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {item.candidate.location || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {item.candidate.experienceYears || 0} years
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            Profile: {item.candidate.profileScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {item.candidate.skills.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 uppercase font-medium mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {item.candidate.skills.slice(0, 8).map((skill, i) => (
                          <span key={i} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  {item.candidate.badges.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 uppercase font-medium mb-2">Verified Badges</p>
                      <div className="flex gap-2 flex-wrap">
                        {item.candidate.badges.map((badge, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                          >
                            <Award className="w-3 h-3" />
                            {badge.skillName} ({badge.level})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedCandidate(item)
                        setSelectedTestId('')
                      }}
                      className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2"
                    >
                      <Target className="w-5 h-5" />
                      Allocate Test
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── INVITE TRACKER ─────────────────────────────────── */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Invite Tracker</h2>
              <p className="text-sm text-gray-500">All sent assessment invites — invite time, expiry, and status</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Invite Sent',  value: inviteStats.invited,   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
              { label: 'In Progress',  value: inviteStats.started,   color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
              { label: 'Completed',    value: inviteStats.completed, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
              { label: 'Expired',      value: inviteStats.expired,   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by candidate or test..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'invited', 'started', 'completed', 'expired'].map((f) => (
                <button
                  key={f}
                  onClick={() => setInviteStatusFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    inviteStatusFilter === f
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingInvites ? (
              <div className="p-10 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading invites...</p>
              </div>
            ) : filteredInvites.length === 0 ? (
              <div className="p-10 text-center">
                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No invites found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Candidate</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Test</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Invited</span>
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Expires</span>
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Time Left</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvites.map((inv) => {
                      const style = STATUS_STYLES[inv.status] || STATUS_STYLES.pending
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-medium text-gray-900">{inv.candidateName}</p>
                            <p className="text-xs text-gray-400">{inv.candidateEmail}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-gray-700">{inv.testName || inv.testId}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-gray-700 text-xs">{formatDateTime(inv.invitedAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            {inv.expiresAt ? (
                              <p className="text-gray-700 text-xs">{formatDateTime(inv.expiresAt)}</p>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <TimeRemaining expiresAt={inv.expiresAt} status={inv.status} />
                          </td>
                          <td className="px-5 py-4">
                            {inv.invitationUrl && inv.status === 'invited' && (
                              <a
                                href={inv.invitationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary-700 flex items-center gap-1 text-xs font-medium"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Link
                              </a>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedCandidate(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Allocate Assessment</h2>
                <p className="text-sm text-gray-500">
                  For {selectedCandidate.candidate.firstName} {selectedCandidate.candidate.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Candidate Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">
                  {selectedCandidate.candidate.firstName} {selectedCandidate.candidate.lastName}
                </p>
                <p className="text-sm text-gray-500">{selectedCandidate.candidate.email}</p>
                {selectedCandidate.candidate.headline && (
                  <p className="text-sm text-gray-600 mt-1">{selectedCandidate.candidate.headline}</p>
                )}
              </div>

              {/* Select Test */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Assessment Test
                </label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Choose a test...</option>
                  {tests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.name} ({test.duration} min) - {test.difficulty}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiration — show computed deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {expiresInDays > 0 && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Invite expires on{' '}
                    {new Date(Date.now() + expiresInDays * 86400000).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  placeholder="Add any notes about this allocation..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocate}
                disabled={!selectedTestId || allocateMutation.isPending}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {allocateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Allocating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Allocate & Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
