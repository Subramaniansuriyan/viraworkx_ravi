import { useState, useEffect } from 'react'
import { FileText, Plus, Eye, ArrowLeft, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { contractApi } from '../../services/api'
import type { Contract, ContractTemplate } from '../../types'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Draft', color: 'bg-slate-500/20 text-slate-400', icon: Clock },
  pending_review: { label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
  pending_signatures: { label: 'Awaiting Signatures', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  terminated: { label: 'Terminated', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
}

export default function ClientContracts() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => { loadContracts() }, [])

  async function loadContracts() {
    try {
      const { data } = await contractApi.getAll()
      setContracts(data.contracts)
    } catch (err) {
      console.error('Failed to load contracts:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = statusFilter === 'all'
    ? contracts
    : contracts.filter((c) => c.status === statusFilter)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/client/dashboard')} className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Contracts</h1>
            <p className="text-slate-400 text-sm">Manage contracts for your hired candidates</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'draft', 'pending_signatures', 'active', 'terminated'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s ? 'bg-blue-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading contracts...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No contracts found.</p>
            <p className="text-slate-500 text-sm mt-1">Generate a contract from a hired application in the pipeline.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((contract) => {
              const cfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft
              const StatusIcon = cfg.icon
              const viraworkxSigned = contract.signatures?.find((s) => s.signerRole === 'viraworkx')?.signedAt
              const clientSigned = contract.signatures?.find((s) => s.signerRole === 'client')?.signedAt

              return (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/client/contracts/${contract.id}`)}
                  className="bg-slate-900/80 rounded-xl border border-slate-800/50 p-5 cursor-pointer hover:border-slate-700/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{contract.title}</h3>
                      <p className="text-sm text-slate-500">
                        {contract.application?.candidate?.firstName} {contract.application?.candidate?.lastName}
                        {contract.application?.job?.title && ` - ${contract.application.job.title}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {contract.status === 'pending_signatures' && (
                        <div className="flex gap-2 text-xs">
                          <span className={viraworkxSigned ? 'text-emerald-400' : 'text-slate-500'}>
                            ViraWorkx: {viraworkxSigned ? 'Signed' : 'Pending'}
                          </span>
                          <span className={clientSigned ? 'text-emerald-400' : 'text-slate-500'}>
                            Client: {clientSigned ? 'Signed' : 'Pending'}
                          </span>
                        </div>
                      )}
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
