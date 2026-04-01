'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** フォーム新規作成ページ */
export default function NewFormPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        const form = await res.json()
        router.push(`/forms/${form.id}/edit`)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <Card>
        <CardHeader>
          <CardTitle>新しいフォームを作成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">フォームタイトル</Label>
            <Input
              id="title"
              placeholder="例: お問い合わせフォーム"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
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
