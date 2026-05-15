'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { UserPlus, Trash2, Pencil } from 'lucide-react'

const ROLE_LABELS = { SUPER_ADMIN: 'スーパーアドミン', AGENCY: '代理店', CLIENT: 'クライアント' } as const

type Role = keyof typeof ROLE_LABELS

interface User {
  id: string
  clerkId: string
  email: string
  name: string | null
  role: Role
  createdAt: string
  _count: { forms: number; clientForms: number }
}

interface MeResponse {
  id: string
}

const emptyForm = { name: '', email: '', password: '', role: 'CLIENT' as Role }

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'CLIENT' as Role })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [usersRes, meRes] = await Promise.all([fetch('/api/admin/users'), fetch('/api/me')])
    if (usersRes.ok) setUsers(await usersRes.json())
    if (meRes.ok) {
      const me = (await meRes.json()) as MeResponse
      setMeId(me.id)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast({ title: 'メールアドレスとパスワードは必須です', variant: 'destructive' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'ユーザーを作成しました', variant: 'success' })
      setShowCreate(false)
      setForm(emptyForm)
      load()
    } else {
      const { error } = await res.json()
      toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    if (editForm.password && editForm.password.length < 8) {
      toast({ title: 'パスワードは 8 文字以上にしてください', variant: 'destructive' })
      return
    }
    const trimmedName = editForm.name.trim()
    const trimmedEmail = editForm.email.trim()
    if (!trimmedEmail) {
      toast({ title: 'メールアドレスを入力してください', variant: 'destructive' })
      return
    }

    // 部分更新ボディを組み立て
    const body: Record<string, unknown> = {}
    if (trimmedName !== (editTarget.name ?? '')) body.name = trimmedName
    if (trimmedEmail !== editTarget.email) body.email = trimmedEmail
    if (editForm.password) body.password = editForm.password
    if (editForm.role !== editTarget.role && editTarget.id !== meId) body.role = editForm.role

    if (Object.keys(body).length === 0) {
      toast({ title: '変更がありません', variant: 'destructive' })
      return
    }

    setSaving(true)
    const res = await fetch(`/api/admin/users/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      const parts: string[] = []
      if ('name' in body) parts.push('名前')
      if ('email' in body) parts.push('メール')
      if ('password' in body) parts.push('パスワード（通知メール送信）')
      if ('role' in body) parts.push('ロール')
      toast({ title: `更新しました: ${parts.join('、')}`, variant: 'success' })
      if (data.warning) {
        toast({ title: data.warning, variant: 'destructive' })
      }
      setEditTarget(null)
      load()
    } else {
      const { error } = await res.json()
      toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`${user.email} を削除しますか？この操作は元に戻せません。`)) return
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: '削除しました', variant: 'success' })
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    }
  }

  // meId がまだロードできていない場合も安全側で自己編集扱いとし、
  // ロール変更 UI を無効化する（サーバー側ガードと併せて defense-in-depth）。
  const isSelf = meId === null ? true : editTarget?.id === meId

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{users.length}名のユーザー</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setForm(emptyForm) }}>
          <UserPlus size={16} className="mr-2" />
          ユーザーを作成
        </Button>
      </div>

      {/* 新規作成フォーム（既存どおり） */}
      {showCreate && (
        <Card className="mb-6 border-[hsl(var(--primary)/0.3)]">
          <CardHeader><CardTitle className="text-base">新規ユーザー作成</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">名前</label>
                <Input placeholder="山田 太郎" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メールアドレス *</label>
                <Input type="email" placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">パスワード *</label>
                <Input type="password" placeholder="8文字以上" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">ロール</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreate} disabled={saving}>{saving ? '作成中...' : '作成する'}</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ユーザー一覧（既存どおり） */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium">名前 / メール</th>
                  <th className="text-left p-3 font-medium">ロール</th>
                  <th className="text-left p-3 font-medium">フォーム数</th>
                  <th className="text-left p-3 font-medium">作成日</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
                    <td className="p-3">
                      <p className="font-medium">{u.name || '(名前なし)'}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</p>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'AGENCY' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">
                      {u.role === 'CLIENT' ? u._count.clientForms : u._count.forms}件
                    </td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => {
                            setEditTarget(u)
                            setEditForm({ name: u.name ?? '', email: u.email, password: '', role: u.role })
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-[hsl(var(--destructive))]"
                          onClick={() => handleDelete(u)}
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

      {/* 編集モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[hsl(var(--card))] rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-base font-bold mb-1">ユーザー編集</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">現在のメール: {editTarget.email}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">名前</label>
                <Input
                  placeholder="山田 太郎"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メールアドレス</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">新パスワード（空欄なら変更しない）</label>
                <Input
                  type="password"
                  placeholder="8文字以上"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  入力した場合、新パスワードを記載した通知メールが本人に届きます。
                </p>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">ロール</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  disabled={isSelf}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm disabled:opacity-50"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {isSelf && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    ※ 自分自身のロールは変更できません（ロックアウト防止）。
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleEdit} disabled={saving}>{saving ? '保存中...' : '保存する'}</Button>
              <Button variant="outline" onClick={() => setEditTarget(null)}>キャンセル</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
