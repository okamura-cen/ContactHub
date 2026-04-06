'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { MoreHorizontal, Eye, Inbox, BarChart2, Copy, Trash2, Send } from 'lucide-react'

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

/** フォームカード（ドロップダウンメニュー付き） */
function FormCard({
  form, statusInfo, onEdit, onToggleStatus, onPreview, onDuplicate, onResponses, onAnalytics, onDelete,
}: {
  form: FormItem
  statusInfo: { label: string; variant: 'secondary' | 'success' | 'outline' }
  onEdit: () => void
  onToggleStatus: () => void
  onPreview: () => void
  onDuplicate: () => void
  onResponses: () => void
  onAnalytics: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onEdit}>
      <CardContent className="p-6 pt-6">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-snug mb-2">{form.title}</h3>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          {/* ⋮ メニュー */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] transition-colors"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
              title="その他のアクション"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg py-1 text-sm">
                {[
                  { label: 'プレビュー', icon: Eye, action: onPreview },
                  { label: '送信データ', icon: Inbox, action: onResponses },
                  { label: '分析', icon: BarChart2, action: onAnalytics },
                  { label: '複製', icon: Copy, action: onDuplicate },
                ].map(({ label, icon: Icon, action }) => (
                  <button
                    key={label}
                    className="w-full text-left px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-2.5"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); action() }}
                  >
                    <Icon size={14} className="text-[hsl(var(--muted-foreground))]" />
                    {label}
                  </button>
                ))}
                <div className="border-t border-[hsl(var(--border))] my-1" />
                <button
                  className="w-full text-left px-4 py-2.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--destructive))] transition-colors flex items-center gap-2.5"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* メタ情報 */}
        <div className="flex items-center gap-5 text-sm text-[hsl(var(--muted-foreground))] mb-5 mt-4">
          <span className="flex items-center gap-1.5">
            <Send size={13} />
            送信 <strong className="text-[hsl(var(--foreground))]">{form._count.responses}</strong>件
          </span>
          <span>更新: {new Date(form.updatedAt).toLocaleDateString('ja-JP')}</span>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2.5" onClick={(e) => e.stopPropagation()}>
          <Button onClick={onEdit} className="flex-1">編集する</Button>
          <Button variant="outline" onClick={onToggleStatus} className="flex-1">
            {form.status === 'PUBLISHED' ? '非公開にする' : '公開する'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
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
        <div className="grid gap-5 lg:grid-cols-2">
          {forms.map((form) => {
            const statusInfo = statusLabels[form.status]
            return (
              <FormCard
                key={form.id}
                form={form}
                statusInfo={statusInfo}
                onEdit={() => router.push(`/forms/${form.id}/edit`)}
                onToggleStatus={() => handleToggleStatus(form.id, form.status)}
                onPreview={() => window.open(`/f/${form.id}?preview=true`, '_blank')}
                onDuplicate={() => handleDuplicate(form.id)}
                onResponses={() => router.push(`/forms/${form.id}/responses`)}
                onAnalytics={() => router.push(`/forms/${form.id}/analytics`)}
                onDelete={() => setDeleteTarget(form)}
              />
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
