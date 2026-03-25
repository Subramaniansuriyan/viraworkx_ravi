import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileCheck, Search, FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
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

export default function AdminContracts() {
  const { accessToken } = useAuthStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

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

  const filtered = contracts.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const candidateName =
      `${c.application.candidate.firstName} ${c.application.candidate.lastName}`.toLowerCase()
    const company = c.application.job.client.companyName.toLowerCase()
    return candidateName.includes(q) || company.includes(q)
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            icon={FileText}
            label="Total"
            count={total}
            colorClass="bg-gray-100 text-gray-600"
          />
          <SummaryCard
            icon={Clock}
            label="Pending Signatures"
            count={pendingCount}
            colorClass="bg-yellow-100 text-yellow-700"
          />
          <SummaryCard
            icon={CheckCircle}
            label="Active"
            count={activeCount}
            colorClass="bg-green-100 text-green-700"
          />
          <SummaryCard
            icon={XCircle}
            label="Terminated"
            count={terminatedCount}
            colorClass="bg-red-100 text-red-700"
          />
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by candidate or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
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
                      Signed By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((contract) => {
                    const signedCount = contract.signatures.filter((s) => s.signedAt !== null).length
                    const totalSigs = contract.signatures.length
                    const candidateName = `${contract.application.candidate.firstName} ${contract.application.candidate.lastName}`
                    const createdDate = new Date(contract.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })

                    return (
                      <tr
                        key={contract.id}
                        onClick={() => navigate(`/client/contracts/${contract.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {candidateName}
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
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {totalSigs > 0 ? (
                            <span>
                              {signedCount} / {totalSigs}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
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
