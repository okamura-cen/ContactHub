'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

interface FormItem {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  updatedAt: string
  _count: { responses: number }
}

const statusLabels: Record<string, { label: string; variant: 'secondary' | 'success' | 'outline' }> = {
  DRAFT: { label: '下書き', variant: 'secondary' },
  PUBLISHED: { label: '公開中', variant: 'success' },
  ARCHIVED: { label: 'アーカイブ', variant: 'outline' },
}

/** ダッシュボード：フォーム一覧ページ */
export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FormItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchForms()
  }, [])

  const fetchForms = async () => {
    try {
      const res = await fetch('/api/forms')
      if (res.ok) {
        const data = await res.json()
        setForms(data)
      }
    } catch {
      toast({ title: 'フォームの取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (res.ok) {
        const form = await res.json()
        router.push(`/forms/${form.id}/edit`)
      } else {
        toast({ title: 'フォームの作成に失敗しました', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'フォームの作成に失敗しました', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/forms/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'フォームを削除しました', variant: 'success' })
        setDeleteTarget(null)
        fetchForms()
      } else {
        toast({ title: '削除に失敗しました', variant: 'destructive' })
      }
    } catch {
      toast({ title: '削除に失敗しました', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (formId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast({
          title: newStatus === 'PUBLISHED' ? 'フォームを公開しました' : 'フォームを非公開にしました',
          variant: 'success',
        })
        fetchForms()
      } else {
        toast({ title: 'ステータスの変更に失敗しました', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'ステータスの変更に失敗しました', variant: 'destructive' })
    }
  }

  const handleDuplicate = async (formId: string) => {
    try {
      const res = await fetch(`/api/forms/${formId}`)
      if (!res.ok) return
      const original = await res.json()

      const createRes = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${original.title} (コピー)` }),
      })
      if (createRes.ok) {
        const newForm = await createRes.json()
        // ステップとフィールドをIDを振り直してコピー
        const newSteps = (original.steps || []).map((s: { id: string; title: string; fields: { id: string; [key: string]: unknown }[] }) => ({
          ...s,
          id: uuidv4(),
          fields: (s.fields || []).map((f) => ({ ...f, id: uuidv4() })),
        }))
        await fetch(`/api/forms/${newForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps: newSteps }),
        })
        toast({ title: 'フォームを複製しました', variant: 'success' })
        fetchForms()
      }
    } catch {
      toast({ title: '複製に失敗しました', variant: 'destructive' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">フォーム一覧</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            作成したフォームの管理・編集ができます
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          + 新規作成
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              まだフォームがありません
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              最初のフォームを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const statusInfo = statusLabels[form.status]
            return (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{form.title}</CardTitle>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))] mb-4">
                    <span>送信数: {form._count.responses}</span>
                    <span>更新: {new Date(form.updatedAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/forms/${form.id}/edit`)}
                    >
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/f/${form.id}?preview=true`, '_blank')}
                    >
                      プレビュー
                    </Button>
                    <Button
                      size="sm"
                      variant={form.status === 'PUBLISHED' ? 'outline' : 'default'}
                      onClick={() => handleToggleStatus(form.id, form.status)}
                    >
                      {form.status === 'PUBLISHED' ? '非公開' : '公開'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicate(form.id)}
                    >
                      複製
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/forms/${form.id}/responses`)}
                    >
                      送信データ
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/forms/${form.id}/analytics`)}
                    >
                      分析
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
                      onClick={() => setDeleteTarget(form)}
                    >
                      削除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>フォームを削除しますか？</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            「{deleteTarget?.title}」を削除します。送信データも含めてすべて削除されます。この操作は元に戻せません。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 新規作成ダイアログ */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogHeader>
          <DialogTitle>新しいフォームを作成</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="form-title">フォームタイトル</Label>
          <Input
            id="form-title"
            placeholder="例: お問い合わせフォーム"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewDialog(false)}>
            キャンセル
          </Button>
          <Button onClick={handleCreate} disabled={!newTitle.trim() || creating}>
            {creating ? '作成中...' : '作成'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
