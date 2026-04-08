'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { UserPlus, Trash2, ChevronRight } from 'lucide-react'

interface ClientRelation {
  id: string
  logoUrl: string | null
  createdAt: string
  client: {
    id: string
    name: string | null
    email: string
    createdAt: string
    _count: { clientForms: number }
  }
}

const emptyForm = { name: '', email: '', password: '' }

export default function AgencyClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [relations, setRelations] = useState<ClientRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/agency/clients')
    if (res.ok) setRelations(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast({ title: 'メールアドレスとパスワードは必須です', variant: 'destructive' })
      return
    }
    if (form.password.length < 8) {
      toast({ title: 'パスワードは8文字以上にしてください', variant: 'destructive' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/agency/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'クライアントを作成しました。ログイン案内メールを送信しました。', variant: 'success' })
      setShowCreate(false)
      setForm(emptyForm)
      load()
    } else {
      const { error } = await res.json()
      toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const handleRemove = async (clientId: string, email: string) => {
    if (!confirm(`${email} との紐付けを解除しますか？\nフォームへの割り当ても外れます。`)) return
    const res = await fetch(`/api/agency/clients/${clientId}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: '紐付けを解除しました', variant: 'success' })
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const filtered = relations.filter((r) => {
    const q = search.toLowerCase()
    return !q || r.client.name?.toLowerCase().includes(q) || r.client.email.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">クライアント管理</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{relations.length}社のクライアント</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setForm(emptyForm) }}>
          <UserPlus size={16} className="mr-2" />
          クライアントを追加
        </Button>
      </div>

      {/* 新規作成フォーム */}
      {showCreate && (
        <Card className="mb-6 border-[hsl(var(--primary)/0.3)]">
          <CardContent className="pt-6 space-y-3">
            <h3 className="font-semibold text-sm">新規クライアント作成</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">会社名・担当者名</label>
                <Input
                  placeholder="株式会社〇〇"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メールアドレス *</label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">初期パスワード *（8文字以上）</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              ※ 作成後、入力したメールアドレスにログイン案内メールが自動送信されます。
            </p>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? '作成中...' : '作成してメール送信'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 検索 */}
      <div className="mb-4">
        <Input
          placeholder="会社名・メールで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* クライアント一覧 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
              {relations.length === 0
                ? 'まだクライアントがいません。「クライアントを追加」から作成してください。'
                : '該当するクライアントが見つかりません。'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium">クライアント</th>
                  <th className="text-left p-3 font-medium">メール</th>
                  <th className="text-left p-3 font-medium">フォーム数</th>
                  <th className="text-left p-3 font-medium">追加日</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rel) => (
                  <tr
                    key={rel.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer"
                    onClick={() => router.push(`/agency/clients/${rel.client.id}`)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {rel.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={rel.logoUrl} alt="" className="w-7 h-7 rounded object-contain border" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-[hsl(var(--secondary))] flex items-center justify-center text-xs font-bold text-[hsl(var(--muted-foreground))]">
                            {(rel.client.name || rel.client.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{rel.client.name || '(名前なし)'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{rel.client.email}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{rel.client._count.clientForms}件</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(rel.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/agency/clients/${rel.client.id}`)}
                        >
                          <ChevronRight size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[hsl(var(--destructive))]"
                          onClick={() => handleRemove(rel.client.id, rel.client.email)}
                        >
                          <Trash2 size={14} />
                        </Button>
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
