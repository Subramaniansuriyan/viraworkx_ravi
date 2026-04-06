import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Clock, Calendar, ExternalLink, CheckCircle } from 'lucide-react'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'

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
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteStatusFilter, setInviteStatusFilter] = useState('all')

  const { data: invitesData, isLoading: loadingInvites } = useQuery({
    queryKey: ['activeInvites'],
    queryFn: async () => {
      const res = await api.get('/assessments/admin/active-invites')
      return res.data
    },
    refetchInterval: 60000
  })

  const allInvites: ActiveInvite[] = invitesData?.assessments || []

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

  const inviteStats = {
    invited:   allInvites.filter(i => i.status === 'invited').length,
    started:   allInvites.filter(i => i.status === 'started').length,
    completed: allInvites.filter(i => i.status === 'completed').length,
    expired:   allInvites.filter(i => i.status === 'expired').length,
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Test Allocation</h1>
          <p className="text-gray-600">All sent assessment invites — invite time, expiry, and status</p>
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
              <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
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
    </AdminLayout>
  )
}
