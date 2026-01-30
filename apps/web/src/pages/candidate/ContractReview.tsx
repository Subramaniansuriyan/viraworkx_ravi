import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, Download } from 'lucide-react'
import { contractApi } from '../../services/api'
import type { Contract } from '../../types'
import PdfViewer from '../../components/ui/PdfViewer'

export default function CandidateContractReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)

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
  const clientSig = contract.signatures?.find((s) => s.signerRole === 'client')
  const pdfUrl = contractApi.getPdfUrl(id!)

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
              <p className="text-sm text-slate-500">Awaiting client signature</p>
            )}
          </div>
        </div>

        {/* Download PDF */}
        <div className="flex gap-3 mb-6">
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
      </div>
    </div>
  )
}
