import { useRef, useEffect, useState } from 'react'
import SignaturePadLib from 'signature_pad'

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
  width?: number
  height?: number
}

export default function SignaturePad({ onSignatureChange, width = 400, height = 150 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = width
    canvas.height = height

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#1e293b',
    })

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty())
      if (!pad.isEmpty()) {
        onSignatureChange(pad.toDataURL('image/png'))
      }
    })

    padRef.current = pad

    return () => {
      pad.off()
    }
  }, [width, height])

  function handleClear() {
    if (padRef.current) {
      padRef.current.clear()
      setIsEmpty(true)
      onSignatureChange(null)
    }
  }

  return (
    <div>
      <div className="rounded-lg border border-slate-600 bg-white overflow-hidden" style={{ width, height }}>
        <canvas ref={canvasRef} style={{ display: 'block', width, height }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-500">
          {isEmpty ? 'Draw your signature above' : 'Signature captured'}
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
