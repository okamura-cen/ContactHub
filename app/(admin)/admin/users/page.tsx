'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { UserPlus, Trash2, Pencil } from 'lucide-react'

const ROLE_LABELS = { SUPER_ADMIN: 'スーパーアドミン', AGENCY: '代理店', CLIENT: 'クライアント' } as const
const PLAN_LABELS = { STARTER: 'スターター', PRO: 'プロ', AGENCY: '代理店' } as const

type Role = keyof typeof ROLE_LABELS
type Plan = keyof typeof PLAN_LABELS

interface User {
  id: string
  clerkId: string
  email: string
  name: string | null
  role: Role
  plan: Plan
  createdAt: string
  _count: { forms: number }
}

const emptyForm = { name: '', email: '', password: '', role: 'CLIENT' as Role, plan: 'STARTER' as Plan }

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState({ role: 'CLIENT' as Role, plan: 'STARTER' as Plan })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
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
    setSaving(true)
    const res = await fetch(`/api/admin/users/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: '更新しました', variant: 'success' })
      setEditTarget(null)
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
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

      {/* 新規作成フォーム */}
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
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">プラン</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value as Plan })}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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

      {/* ユーザー一覧 */}
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
                  <th className="text-left p-3 font-medium">プラン</th>
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
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{PLAN_LABELS[u.plan]}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{u._count.forms}件</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => { setEditTarget(u); setEditForm({ role: u.role, plan: u.plan }) }}
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
            <h2 className="text-base font-bold mb-4">ユーザー編集</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{editTarget.email}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">ロール</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">プラン</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value as Plan })}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
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
