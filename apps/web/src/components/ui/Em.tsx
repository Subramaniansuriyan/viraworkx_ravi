import type { ReactNode } from 'react'

export default function Em({ children }: { children: ReactNode }) {
  return <em className="font-serif-italic-em">{children}</em>
}
