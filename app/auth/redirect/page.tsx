'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * サインイン直後に呼ばれるルーティングハブ。
 * /api/me でロールを取得し、適切な画面へ転送する。
 *   SUPER_ADMIN → /admin/users
 *   AGENCY      → /agency
 *   CLIENT      → /
 */
export default function AuthRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const redirect = async () => {
      try {
        const res = await fetch('/api/me')
        if (res.ok) {
          const user = await res.json()
          if (user.role === 'SUPER_ADMIN') {
            router.replace('/admin/users')
          } else if (user.role === 'AGENCY') {
            router.replace('/')
          } else {
            router.replace('/')
          }
        } else {
          // 未登録ユーザーなどはダッシュボードトップへ
          router.replace('/')
        }
      } catch {
        router.replace('/')
      }
    }
    redirect()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--secondary))]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">読み込み中...</p>
      </div>
    </div>
  )
}
