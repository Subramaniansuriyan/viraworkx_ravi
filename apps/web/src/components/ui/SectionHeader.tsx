import type { ReactNode } from 'react'
import Eyebrow from './Eyebrow'

interface SectionHeaderProps {
  eyebrow: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}

export default function SectionHeader({ eyebrow, title, subtitle, className = '' }: SectionHeaderProps) {
  return (
    <div className={`max-w-3xl ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[clamp(34px,4.5vw,52px)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-lg text-ink-mute">{subtitle}</p> : null}
    </div>
  )
}
