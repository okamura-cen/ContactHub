'use client'

import { useEffect, useRef, ReactNode } from 'react'

/** モーダル幅のプリセット */
type DialogSize = 'default' | 'lg' | 'xl' | '2xl' | '3xl'

const SIZE_CLASS: Record<DialogSize, string> = {
  default: 'max-w-lg',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** モーダル幅（未指定は従来どおり max-w-lg） */
  size?: DialogSize
}

export function Dialog({ open, onOpenChange, children, size = 'default' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className={`relative z-50 w-full ${SIZE_CLASS[size]} rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-lg`}>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>{children}</div>
}

export function DialogTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h2>
}

export function DialogFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4 ${className}`}>{children}</div>
}
