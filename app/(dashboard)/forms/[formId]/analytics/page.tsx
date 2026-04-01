'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/** EFO分析ページ（Phase2で実装） */
export default function AnalyticsPage() {
  const router = useRouter()

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          ← 戻る
        </Button>
        <h1 className="text-2xl font-bold">EFO分析</h1>
      </div>
      <Card>
        <CardContent className="py-20 text-center text-[hsl(var(--muted-foreground))]">
          EFO分析機能はPhase2で実装予定です。
        </CardContent>
      </Card>
    </div>
  )
}
