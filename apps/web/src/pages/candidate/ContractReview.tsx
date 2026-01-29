import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, ArrowLeft, CheckCircle, Clock, PenTool, AlertTriangle } from 'lucide-react'
import { contractApi } from '../../services/api'
import type { Contract } from '../../types'

export default function CandidateContractReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedName, setSignedName] = useState('')
  const [signing, setSigning] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (id) loadContract() }, [id])

  async function loadContract() {
    try {
      const { data } = await contractApi.getById(id!)
      setContract(data.contract)
    } catch (err) {
      console.error('Failed to load contract:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSign() {
    if (!id || !signedName.trim()) return
    setSigning(true)
    setError('')
    try {
      const { data } = await contractApi.sign(id, signedName.trim())
      setContract(data.contract)
      setShowSignModal(false)
      setSignedName('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign contract')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>
  }

  if (!contract) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Contract not found</div>
  }

  const clientSig = contract.signatures?.find((s) => s.signerRole === 'client')
  const candidateSig = contract.signatures?.find((s) => s.signerRole === 'candidate')
  const canSign = contract.status === 'pending_signatures' && candidateSig && !candidateSig.signedAt

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/candidate/contracts')} className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{contract.title}</h1>
            <p className="text-slate-400 text-sm">
              {contract.application?.job?.client?.companyName}
              {contract.application?.job?.title && ` | ${contract.application.job.title}`}
            </p>
          </div>
          {contract.status === 'active' && (
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Active
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Signature Status */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-xl border ${clientSig?.signedAt ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/30 bg-slate-900/50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {clientSig?.signedAt ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-slate-500" />}
              <span className="font-medium">Company Signature</span>
            </div>
            {clientSig?.signedAt ? (
              <div className="text-sm text-slate-400">
                <p>Signed by: <span className="text-white">{clientSig.signedName}</span></p>
                <p>Date: {new Date(clientSig.signedAt).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Awaiting company signature</p>
            )}
          </div>

          <div className={`p-4 rounded-xl border ${candidateSig?.signedAt ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/30 bg-slate-900/50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {candidateSig?.signedAt ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-slate-500" />}
              <span className="font-medium">Your Signature</span>
            </div>
            {candidateSig?.signedAt ? (
              <div className="text-sm text-slate-400">
                <p>Signed by: <span className="text-white">{candidateSig.signedName}</span></p>
                <p>Date: {new Date(candidateSig.signedAt).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not yet signed</p>
            )}
          </div>
        </div>

        {/* Sign Action */}
        {canSign && (
          <div className="mb-6 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <p className="text-sm text-blue-300 mb-3">This contract is ready for your signature. Please review the terms below and sign when ready.</p>
            <button onClick={() => setShowSignModal(true)} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium flex items-center gap-2">
              <PenTool className="w-4 h-4" /> Sign Contract
            </button>
          </div>
        )}

        {/* Contract Content */}
        <div className="bg-white rounded-2xl p-8 text-slate-900 prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: contract.content }} />
        </div>

        {/* Sign Modal */}
        {showSignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Sign Contract</h3>
              <p className="text-sm text-slate-400 mb-4">
                By typing your full legal name below, you agree to the terms of this contract.
                This constitutes your electronic signature.
              </p>
              <input
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-lg mb-4"
                placeholder="Type your full legal name"
                autoFocus
              />
              {signedName && (
                <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Signature preview:</p>
                  <p className="text-xl italic font-serif text-emerald-400">{signedName}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSign}
                  disabled={!signedName.trim() || signing}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50"
                >
                  {signing ? 'Signing...' : 'Confirm Signature'}
                </button>
                <button onClick={() => setShowSignModal(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
