import { useState, useEffect } from 'react'

interface PdfViewerProps {
  url: string
  width?: number
}

export default function PdfViewer({ url, width = 700 }: PdfViewerProps) {
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
      <iframe
        src={blobUrl}
        width={width}
        height={Math.round(width * 1.414)}
        style={{ border: 'none', display: 'block' }}
        title="Contract PDF"
      />
    </div>
  )
}
