import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-paper-line bg-soft-gray p-6 transition duration-200 hover:-translate-y-0.5 hover:bg-lavender ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
