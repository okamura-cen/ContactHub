'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const AUDIENCE_LABELS: Record<string, string> = { common: '共通', agency: '代理店向け', client: 'クライアント向け' }
const AUDIENCE_COLORS: Record<string, string> = { common: 'bg-gray-100 text-gray-600', agency: 'bg-blue-100 text-blue-700', client: 'bg-green-100 text-green-700' }

interface HelpArticle {
  id: string
  title: string
  content: string
  category: string
  audience: string
  order: number
  published: boolean
  updatedAt: string
}

const emptyForm = { title: '', content: '', category: '', audience: 'common', order: 0, published: true }

export default function AdminHelpPage() {
  const { toast } = useToast()
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null) // null = 新規, string = 編集中, 'closed' = 非表示
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/help')
    if (res.ok) setArticles(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setForm(emptyForm); setEditingId(null) }
  const openEdit = (a: HelpArticle) => {
    setForm({ title: a.title, content: a.content, category: a.category, audience: a.audience, order: a.order, published: a.published })
    setEditingId(a.id)
  }
  const closeEditor = () => setEditingId('closed')

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'タイトルと本文は必須です', variant: 'destructive' }); return
    }
    const isNew = editingId === null
    const url = isNew ? '/api/admin/help' : `/api/admin/help/${editingId}`
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast({ title: isNew ? '記事を作成しました' : '記事を更新しました', variant: 'success' })
      closeEditor()
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    const res = await fetch(`/api/admin/help/${id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: '削除しました', variant: 'success' }); load() }
    else toast({ title: '削除に失敗しました', variant: 'destructive' })
  }

  const handleTogglePublished = async (a: HelpArticle) => {
    const res = await fetch(`/api/admin/help/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !a.published }),
    })
    if (res.ok) load()
  }

  const showEditor = editingId !== 'closed'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">ヘルプ管理</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{articles.length}件の記事</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} className="mr-2" />記事を追加
        </Button>
      </div>

      {/* エディタ */}
      {showEditor && (
        <Card className="mb-6 border-[hsl(var(--primary)/0.3)]">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{editingId === null ? '新規記事' : '記事を編集'}</h3>
              <Button size="sm" variant="ghost" onClick={closeEditor}><X size={16} /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">タイトル *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="記事タイトル" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">カテゴリ</label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="はじめに、フォーム管理 など" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">対象</label>
                  <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm">
                    <option value="common">共通</option>
                    <option value="agency">代理店向け</option>
                    <option value="client">クライアント向け</option>
                  </select>
                </div>
                <div className="w-20">
                  <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">並び順</label>
                  <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">本文 *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full min-h-[200px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm resize-y"
                placeholder="ヘルプ記事の本文を入力..."
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
                公開する
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>{editingId === null ? '作成' : '更新'}</Button>
              <Button variant="outline" onClick={closeEditor}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 一覧 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
              まだヘルプ記事がありません
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium w-12">順</th>
                  <th className="text-left p-3 font-medium">タイトル</th>
                  <th className="text-left p-3 font-medium">カテゴリ</th>
                  <th className="text-left p-3 font-medium">対象</th>
                  <th className="text-left p-3 font-medium">状態</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{a.order}</td>
                    <td className="p-3 font-medium">{a.title}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{a.category}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${AUDIENCE_COLORS[a.audience] || 'bg-gray-100 text-gray-600'}`}>
                        {AUDIENCE_LABELS[a.audience] || a.audience}
                      </span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleTogglePublished(a)}
                        className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer ${a.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {a.published ? '公開' : '非公開'}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                        <Button size="sm" variant="ghost" className="text-[hsl(var(--destructive))]" onClick={() => handleDelete(a.id, a.title)}><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
