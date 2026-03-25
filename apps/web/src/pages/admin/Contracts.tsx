import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileCheck, Search, FileText, Clock, CheckCircle, XCircle, UserCheck } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { useAuthStore } from '../../stores/authStore'

const API_URL = ''

interface ContractSignature {
  signerRole: string
  signedAt: string | null
  signedName: string | null
}

interface Contract {
  id: string
  status: string
  createdAt: string
  signatures: ContractSignature[]
  application: {
    candidate: { firstName: string; lastName: string }
    job: { title: string; client: { companyName: string } }
  }
  template: { name: string; templateType: string }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700',
  },
  pending_signatures: {
    label: 'Pending Signatures',
    className: 'bg-yellow-100 text-yellow-800',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800',
  },
  terminated: {
    label: 'Terminated',
    className: 'bg-red-100 text-red-800',
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  count,
  colorClass,
}: {
  icon: React.ElementType
  label: string
  count: number
  colorClass: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// Per-role signature pill
function SignerPill({ role, signed, signedAt }: { role: string; signed: boolean; signedAt?: string | null }) {
  const label = role === 'admin' ? 'ViraWorkx' : role === 'client' ? 'Client' : 'Candidate'
  return (
    <span
      title={signed && signedAt ? `Signed ${new Date(signedAt).toLocaleDateString()}` : `${label} — not yet signed`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
        signed
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-gray-50 text-gray-400 border-gray-200'
      }`}
    >
      {signed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default function AdminContracts() {
  const { accessToken } = useAuthStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'candidate_signed'>('all')

  const { data, isLoading, isError } = useQuery<{ contracts: Contract[] }>({
    queryKey: ['admin-contracts'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/contracts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to fetch contracts')
      return res.json()
    },
  })

  const contracts: Contract[] = data?.contracts ?? []

  const candidateSignedCount = contracts.filter((c) =>
    c.signatures.some((s) => s.signerRole === 'candidate' && s.signedAt !== null)
  ).length

  const filtered = contracts
    .filter((c) => {
      if (filter === 'candidate_signed') {
        return c.signatures.some((s) => s.signerRole === 'candidate' && s.signedAt !== null)
      }
      return true
    })
    .filter((c) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const candidateName =
        `${c.application.candidate.firstName} ${c.application.candidate.lastName}`.toLowerCase()
      const company = c.application.job.client.companyName.toLowerCase()
      return candidateName.includes(q) || company.includes(q)
    })
    // Sort: candidate-signed first, then by createdAt desc
    .sort((a, b) => {
      const aSigned = a.signatures.some((s) => s.signerRole === 'candidate' && s.signedAt)
      const bSigned = b.signatures.some((s) => s.signerRole === 'candidate' && s.signedAt)
      if (aSigned && !bSigned) return -1
      if (!aSigned && bSigned) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const total = contracts.length
  const pendingCount = contracts.filter((c) => c.status === 'pending_signatures').length
  const activeCount = contracts.filter((c) => c.status === 'active').length
  const terminatedCount = contracts.filter((c) => c.status === 'terminated').length

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <FileCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          </div>
          <p className="text-sm text-gray-500">All contracts across candidates and clients</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <SummaryCard icon={FileText} label="Total" count={total} colorClass="bg-gray-100 text-gray-600" />
          <SummaryCard icon={UserCheck} label="Candidate Signed" count={candidateSignedCount} colorClass="bg-blue-100 text-blue-700" />
          <SummaryCard icon={Clock} label="Pending Signatures" count={pendingCount} colorClass="bg-yellow-100 text-yellow-700" />
          <SummaryCard icon={CheckCircle} label="Active" count={activeCount} colorClass="bg-green-100 text-green-700" />
          <SummaryCard icon={XCircle} label="Terminated" count={terminatedCount} colorClass="bg-red-100 text-red-700" />
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by candidate or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setFilter(filter === 'candidate_signed' ? 'all' : 'candidate_signed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filter === 'candidate_signed'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Candidate Signed {filter === 'candidate_signed' && `(${candidateSignedCount})`}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading contracts...</div>
          ) : isError ? (
            <div className="p-12 text-center text-red-500 text-sm">
              Failed to load contracts. Please try again.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              {search ? 'No contracts match your search.' : 'No contracts found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Signatures
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((contract) => {
                    const candidateName = `${contract.application.candidate.firstName} ${contract.application.candidate.lastName}`
                    const createdDate = new Date(contract.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })
                    const candidateSig = contract.signatures.find((s) => s.signerRole === 'candidate')
                    const clientSig = contract.signatures.find((s) => s.signerRole === 'client')
                    const adminSig = contract.signatures.find((s) => s.signerRole === 'viraworkx' || s.signerRole === 'admin')
                    const candidateSigned = !!(candidateSig?.signedAt)

                    return (
                      <tr
                        key={contract.id}
                        onClick={() => navigate(`/client/contracts/${contract.id}`)}
                        className={`cursor-pointer transition-colors ${candidateSigned ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{candidateName}</span>
                            {candidateSigned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                                <UserCheck className="w-3 h-3" /> Signed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {contract.application.job.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {contract.application.job.client.companyName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={contract.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            {adminSig && <SignerPill role="admin" signed={!!adminSig.signedAt} signedAt={adminSig.signedAt} />}
                            {clientSig && <SignerPill role="client" signed={!!clientSig.signedAt} signedAt={clientSig.signedAt} />}
                            {candidateSig && <SignerPill role="candidate" signed={!!candidateSig.signedAt} signedAt={candidateSig.signedAt} />}
                            {!adminSig && !clientSig && !candidateSig && <span className="text-gray-400 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {createdDate}
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
