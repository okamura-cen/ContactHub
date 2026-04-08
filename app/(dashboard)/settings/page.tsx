'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((u) => {
        if (u.role === 'AGENCY') {
          router.replace('/agency/settings')
        }
      })
      .catch(() => {})
  }, [router])

  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
    </div>
  )
}
