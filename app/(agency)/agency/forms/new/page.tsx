'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

interface ClientOption {
  client: { id: string; name: string | null; email: string }
}

export default function AgencyNewFormPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/agency/clients')
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'タイトルを入力してください', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/agency/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, clientId: clientId || null }),
      })
      if (res.ok) {
        const form = await res.json()
        router.push(`/forms/${form.id}/edit`)
      } else {
        const { error } = await res.json()
        toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>新しいフォームを作成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="text-sm font-medium block mb-1.5">フォームタイトル *</label>
            <Input
              placeholder="例: お問い合わせフォーム"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">割り当てるクライアント</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
            >
              <option value="">後で割り当てる</option>
              {clients.map((rel) => (
                <option key={rel.client.id} value={rel.client.id}>
                  {rel.client.name || rel.client.email}
                </option>
              ))}
            </select>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              後からフォーム管理画面でいつでも変更できます
            </p>
          </div>

          <div className="bg-[hsl(var(--secondary))] rounded-md p-3 text-xs text-[hsl(var(--muted-foreground))]">
            <p className="font-medium text-[hsl(var(--foreground))] mb-1">ライセンスについて</p>
            <p>フォームを公開するにはライセンスの購入が必要です（¥10,000/年）。</p>
            <p>作成後、フォームビルダーからライセンスを購入して公開できます。</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => router.push('/agency/forms')}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? '作成中...' : '作成してビルダーを開く'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
