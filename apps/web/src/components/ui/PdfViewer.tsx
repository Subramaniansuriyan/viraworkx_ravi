import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface PdfViewerProps {
  url: string
  width?: number
  onBlobUrl?: (url: string) => void
}

export default function PdfViewer({ url, width = 700, onBlobUrl }: PdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let revoke: string | null = null

    async function fetchPdf() {
      setLoading(true)
      setLoadError(null)
      try {
        const token = localStorage.getItem('token')
        const fetchUrl = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
        const response = await fetch(fetchUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        revoke = objectUrl
        setBlobUrl(objectUrl)
        onBlobUrl?.(objectUrl)
      } catch (err) {
        console.error('PDF fetch error:', err)
        setLoadError('Failed to load PDF document')
      } finally {
        setLoading(false)
      }
    }
    fetchPdf()

    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [url])

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-8 text-center">
        <p className="text-slate-500">Loading PDF...</p>
      </div>
    )
  }

  if (loadError || !blobUrl) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-8 text-center">
        <p className="text-red-400">{loadError || 'Failed to load PDF'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {/* object tag has better cross-browser PDF support than iframe, especially on mobile */}
      <object
        data={blobUrl}
        type="application/pdf"
        width={width}
        height={Math.round(width * 1.414)}
        style={{ border: 'none', display: 'block' }}
      >
        {/* Fallback for browsers that cannot display PDFs inline (mobile Safari, etc.) */}
        <div className="bg-slate-100 p-10 text-center">
          <p className="text-gray-600 mb-4">Your browser cannot display the PDF inline.</p>
          <a
            href={blobUrl}
            download="contract.pdf"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600"
          >
            <Download className="w-4 h-4" /> Download PDF to View
          </a>
        </div>
      </object>
    </div>
  )
}
