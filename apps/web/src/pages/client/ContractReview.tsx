import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, PenTool, AlertTriangle, Download } from 'lucide-react'
import { contractApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import type { Contract } from '../../types'
import PdfViewer from '../../components/ui/PdfViewer'
import SignaturePad from '../../components/ui/SignaturePad'

export default function ClientContractReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedName, setSignedName] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
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

  async function handleSendForSignatures() {
    if (!id) return
    try {
      const { data } = await contractApi.sendForSignatures(id)
      setContract(data.contract)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send for signatures')
    }
  }

  async function handleSign() {
    if (!id || !signedName.trim() || !signatureImage) return
    setSigning(true)
    setError('')
    try {
      const { data } = await contractApi.sign(id, signedName.trim(), signatureImage)
      setContract(data.contract)
      setShowSignModal(false)
      setSignedName('')
      setSignatureImage(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign contract')
    } finally {
      setSigning(false)
    }
  }

  async function handleTerminate() {
    if (!id || !confirm('Are you sure you want to terminate this contract?')) return
    try {
      const { data } = await contractApi.terminate(id)
      setContract(data.contract)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to terminate contract')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>
  }

  if (!contract) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Contract not found</div>
  }

  const viraworkxSig = contract.signatures?.find((s) => s.signerRole === 'viraworkx')
  const clientSig = contract.signatures?.find((s) => s.signerRole === 'client')
  const isAdmin = user?.userType === 'admin'
  // Admin signs as viraworkx; client signs as client
  const canSign = contract.status === 'pending_signatures' && (
    isAdmin ? (viraworkxSig && !viraworkxSig.signedAt) : (clientSig && !clientSig.signedAt)
  )
  const signButtonLabel = isAdmin ? 'Counter-sign as ViraWorkx' : 'Sign Contract'
  const pdfUrl = contractApi.getPdfUrl(id!)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/client/contracts')} className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{contract.title}</h1>
            <p className="text-slate-400 text-sm">
              {contract.application?.candidate?.firstName} {contract.application?.candidate?.lastName}
              {contract.application?.job?.title && ` | ${contract.application.job.title}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Signature Status */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-xl border ${viraworkxSig?.signedAt ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/30 bg-slate-900/50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {viraworkxSig?.signedAt ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-slate-500" />}
              <span className="font-medium">ViraWorkx Signature</span>
            </div>
            {viraworkxSig?.signedAt ? (
              <div className="text-sm text-slate-400">
                <p>Signed by: <span className="text-white">{viraworkxSig.signedName}</span></p>
                <p>Date: {new Date(viraworkxSig.signedAt).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not yet signed</p>
            )}
          </div>

          <div className={`p-4 rounded-xl border ${clientSig?.signedAt ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/30 bg-slate-900/50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {clientSig?.signedAt ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-slate-500" />}
              <span className="font-medium">Client Signature</span>
            </div>
            {clientSig?.signedAt ? (
              <div className="text-sm text-slate-400">
                <p>Signed by: <span className="text-white">{clientSig.signedName}</span></p>
                <p>Date: {new Date(clientSig.signedAt).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not yet signed</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          {contract.status === 'draft' && (
            <button onClick={handleSendForSignatures} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium flex items-center gap-2">
              <PenTool className="w-4 h-4" /> Send for Signatures
            </button>
          )}
          {canSign && (
            <button onClick={() => setShowSignModal(true)} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium flex items-center gap-2">
              <PenTool className="w-4 h-4" /> {signButtonLabel}
            </button>
          )}
          {contract.status === 'active' && (
            <button onClick={handleTerminate} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium">
              Terminate Contract
            </button>
          )}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 text-sm font-medium flex items-center gap-2 hover:bg-slate-700/50"
          >
            <Download className="w-4 h-4" /> Download PDF
          </a>
        </div>

        {/* Contract PDF Viewer */}
        <PdfViewer url={pdfUrl} />

        {/* Sign Modal with Signature Pad */}
        {showSignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">Sign Contract</h3>
              <p className="text-sm text-slate-400 mb-4">
                Draw your signature below and type your full legal name to sign this contract.
              </p>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Draw your signature</label>
                <SignaturePad
                  onSignatureChange={setSignatureImage}
                  width={440}
                  height={150}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Full legal name</label>
                <input
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-lg"
                  placeholder="Type your full legal name"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSign}
                  disabled={!signedName.trim() || !signatureImage || signing}
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
