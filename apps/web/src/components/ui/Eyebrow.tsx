import type { ReactNode } from 'react'

export default function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block font-mono text-xs font-medium uppercase tracking-[0.1em] text-brand">
      {children}
    </span>
  )
}
