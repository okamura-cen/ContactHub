'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

/**
 * 代理店向け送信データページ
 * 既存の /forms/[formId]/responses と同じ内容を表示（リダイレクト）
 * 代理店はフォームオーナー（userId = agency.id）なので既存APIがそのまま使える
 */
export default function AgencyFormResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.formId as string

  // 既存の送信データページへリダイレクト
  useEffect(() => {
    router.replace(`/forms/${formId}/responses`)
  }, [formId, router])

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">送信データページへ移動中...</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push('/agency/forms')}
        >
          <ArrowLeft size={14} className="mr-1" />
          フォーム一覧へ戻る
        </Button>
      </div>
    </div>
  )
}
