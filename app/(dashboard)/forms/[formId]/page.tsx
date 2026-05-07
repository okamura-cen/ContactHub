'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Copy, Eye, Inbox, BarChart2, CheckCircle } from 'lucide-react'

const statusLabels: Record<string, { label: string; variant: 'secondary' | 'success' | 'outline' }> = {
  DRAFT:     { label: '下書き',     variant: 'secondary' },
  PUBLISHED: { label: '公開中',     variant: 'success' },
  ARCHIVED:  { label: 'アーカイブ', variant: 'outline' },
}

interface FormDetail {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  updatedAt: string
  _count: { responses: number }
}

export default function ClientFormDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const formId = params.formId as string

  const [form, setForm] = useState<FormDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // 代理店・管理者はビルダーへリダイレクト
    fetch('/api/me').then((r) => r.json()).then((u) => {
      if (u.role === 'AGENCY' || u.role === 'SUPER_ADMIN') {
        router.replace(`/forms/${formId}/edit`)
      }
    }).catch(() => {})

    fetch(`/api/forms/${formId}`)
      .then((r) => {
        if (!r.ok) { router.push('/forms'); return null }
        return r.json()
      })
      .then((data) => { if (data) setForm(data) })
      .catch(() => router.push('/forms'))
      .finally(() => setLoading(false))
  }, [formId, router])

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/f/${formId}` : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast({ title: 'URLをコピーしました', variant: 'success' })
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!form) return null

  const statusInfo = statusLabels[form.status]

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => router.push('/forms')}>
        <ArrowLeft size={15} className="mr-1" />
        フォーム一覧へ
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{form.title}</h1>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          更新: {new Date(form.updatedAt).toLocaleDateString('ja-JP')} ・ 送信 {form._count.responses}件
        </p>
      </div>

      {/* 公開URL */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">公開URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-[hsl(var(--secondary))] rounded-md px-3 py-2.5 truncate font-mono">
              {publicUrl}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied
                ? <><CheckCircle size={14} className="mr-1 text-green-600" />コピー済み</>
                : <><Copy size={14} className="mr-1" />コピー</>
              }
            </Button>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            このURLをウェブサイトやメールに掲載すると、フォームに直接アクセスできます。
          </p>
        </CardContent>
      </Card>

      {/* 操作 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">操作</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={() => window.open(`/f/${formId}?preview=true`, '_blank')}
          >
            <Eye size={16} />
            フォームをプレビューする
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-3"
            onClick={() => router.push(`/forms/${formId}/responses`)}
          >
            <Inbox size={16} />
            送信データを確認する
            {form._count.responses > 0 && (
              <span className="ml-auto text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-1.5 py-0.5 rounded-full font-medium">
                {form._count.responses}件
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={() => router.push(`/forms/${formId}/analytics`)}
          >
            <BarChart2 size={16} />
            分析を確認する
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
        フォームの内容変更は担当の代理店が行います。変更が必要な場合はご担当者にお問い合わせください。
      </p>
    </div>
  )
}
