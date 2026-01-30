import { useState, useEffect } from 'react'
import { FileText, ArrowLeft, CheckCircle, Clock, PenTool } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { contractApi } from '../../services/api'
import type { Contract } from '../../types'

export default function CandidateContracts() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/candidate/dashboard')} className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">My Contracts</h1>
            <p className="text-slate-400 text-sm">Review and sign your employment contracts</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No contracts yet.</p>
            <p className="text-slate-500 text-sm mt-1">Contracts will appear here when you are hired for a position.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => {
              const viraworkxSig = contract.signatures?.find((s) => s.signerRole === 'viraworkx')
              const clientSig = contract.signatures?.find((s) => s.signerRole === 'client')
              const allSigned = viraworkxSig?.signedAt && clientSig?.signedAt

              return (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/candidate/contracts/${contract.id}`)}
                  className="bg-slate-900/80 rounded-xl border border-slate-800/50 p-5 cursor-pointer hover:border-slate-700/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{contract.title}</h3>
                      <p className="text-sm text-slate-500">
                        {contract.application?.job?.client?.companyName}
                        {contract.application?.job?.title && ` - ${contract.application.job.title}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {contract.status === 'pending_signatures' && !allSigned ? (
                        <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-1">
                          <PenTool className="w-3 h-3" /> Awaiting Signatures
                        </span>
                      ) : contract.status === 'active' ? (
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg bg-slate-500/20 text-slate-400 text-xs font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {contract.status.replace('_', ' ')}
                        </span>
                      )}
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
