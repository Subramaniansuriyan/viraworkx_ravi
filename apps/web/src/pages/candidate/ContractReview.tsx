import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, Download, PenLine } from 'lucide-react'
import { contractApi } from '../../services/api'
import type { Contract } from '../../types'
import PdfViewer from '../../components/ui/PdfViewer'

export default function CandidateContractReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [signModal, setSignModal] = useState(false)
  const [signedName, setSignedName] = useState('')
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState('')
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)

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

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>
  }

  if (!contract) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Contract not found</div>
  }

  const viraworkxSig = contract.signatures?.find((s) => s.signerRole === 'viraworkx')
  const candidateSig = contract.signatures?.find((s) => s.signerRole === 'candidate')
  const pdfUrl = contractApi.getPdfUrl(id!)
  const canSign = contract.status === 'pending_signatures' && !candidateSig?.signedAt

  async function handleSign() {
    if (!signedName.trim()) { setSignError('Please enter your full name'); return }
    setSigning(true); setSignError('')
    try {
      const { data } = await contractApi.sign(id!, signedName.trim(), '')
      setContract(data.contract)
      setSignModal(false)
      // Reset blob URL so PdfViewer reloads the PDF with the embedded signature
      setPdfBlobUrl(null)
    } catch {
      setSignError('Failed to sign. Please try again.')
    } finally {
      setSigning(false)
    }
  }

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
              <p className="text-sm text-slate-500">Awaiting ViraWorkx signature</p>
            )}
          </div>

          <div className={`p-4 rounded-xl border ${candidateSig?.signedAt ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              {candidateSig?.signedAt ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-amber-400" />}
              <span className="font-medium">Your Signature</span>
            </div>
            {candidateSig?.signedAt ? (
              <div>
                <p className="font-signature text-emerald-300 text-xl leading-tight tracking-wide italic break-words">
                  {candidateSig.signedName}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Signed {new Date(candidateSig.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            ) : canSign ? (
              <button
                onClick={() => setSignModal(true)}
                className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600"
              >
                <PenLine className="w-3 h-3" /> Sign Now
              </button>
            ) : (
              <p className="text-sm text-slate-500">Awaiting your signature</p>
            )}
          </div>
        </div>

        {/* Sign Modal */}
        {signModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-bold text-white mb-1">Sign Contract</h3>
              <p className="text-sm text-slate-400 mb-4">By typing your full name below you are legally signing this contract.</p>
              <input
                type="text"
                placeholder="Your full legal name"
                value={signedName}
                onChange={e => setSignedName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 mb-3"
              />
              {signError && <p className="text-sm text-red-400 mb-3">{signError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setSignModal(false)} className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg text-sm">Cancel</button>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  {signing ? 'Signing...' : 'Confirm Signature'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download PDF — uses authenticated blob URL once loaded */}
        <div className="flex gap-3 mb-6">
          {pdfBlobUrl ? (
            <a
              href={pdfBlobUrl}
              download={`contract-${id}.pdf`}
              className="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 text-sm font-medium flex items-center gap-2 hover:bg-slate-700/50"
            >
              <Download className="w-4 h-4" /> Download PDF
            </a>
          ) : (
            <span className="px-4 py-2 rounded-lg bg-slate-800/30 text-slate-500 text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Loading PDF...
            </span>
          )}
        </div>

        {/* Contract PDF Viewer */}
        <PdfViewer url={pdfUrl} onBlobUrl={setPdfBlobUrl} />
      </div>
    </div>
  )
}
