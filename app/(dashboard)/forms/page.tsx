'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  MoreHorizontal, Eye, Inbox, BarChart2, Copy, Trash2, Send,
  Plus, Pencil, UserCheck, CheckCircle, Clock, XCircle,
} from 'lucide-react'

// ============================================================
// AGENCY フォーム管理
// ============================================================

const LICENSE_CONFIG = {
  PENDING:  { label: '未決済',   color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACTIVE:   { label: '有効',     color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  EXPIRED:  { label: '期限切れ', color: 'bg-red-100 text-red-700',       icon: XCircle },
  DELETED:  { label: '削除済み', color: 'bg-gray-100 text-gray-500',     icon: XCircle },
} as const

const STATUS_CONFIG = {
  DRAFT:     { label: '下書き',     color: 'bg-gray-100 text-gray-600' },
  PUBLISHED: { label: '公開中',     color: 'bg-green-100 text-green-700' },
  ARCHIVED:  { label: 'アーカイブ', color: 'bg-gray-100 text-gray-400' },
} as const

interface AgencyForm {
  id: string
  title: string
  status: keyof typeof STATUS_CONFIG
  licenseStatus: keyof typeof LICENSE_CONFIG
  licenseExpiresAt: string | null
  clientId: string | null
  client: { id: string; name: string | null; email: string } | null
  updatedAt: string
  _count: { responses: number }
}

interface ClientOption {
  client: { id: string; name: string | null; email: string }
}

function AgencyFormCard({
  form, clients, isSuperAdmin, onEdit, onDelete, onAssignClient, onResponses, onPreview,
}: {
  form: AgencyForm
  clients: ClientOption[]
  isSuperAdmin: boolean
  onEdit: () => void
  onDelete: () => void
  onAssignClient: (clientId: string | null) => void
  onResponses: () => void
  onPreview: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const lic = LICENSE_CONFIG[form.licenseStatus]
  const LicIcon = lic.icon
  const st = STATUS_CONFIG[form.status]

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 pt-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate cursor-pointer hover:text-[hsl(var(--primary))]" onClick={onEdit}>{form.title}</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">更新: {new Date(form.updatedAt).toLocaleDateString('ja-JP')}</p>
          </div>
          <div ref={menuRef} className="relative">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}>
              <MoreHorizontal size={22} />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-md shadow-lg py-1 w-44">
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]" onClick={() => { onEdit(); setMenuOpen(false) }}><Pencil size={14} /> 編集する</button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]" onClick={() => { onPreview(); setMenuOpen(false) }}><Eye size={14} /> プレビュー</button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]" onClick={() => { onResponses(); setMenuOpen(false) }}><Inbox size={14} /> 送信データ</button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]" onClick={() => { setAssignOpen(true); setMenuOpen(false) }}><UserCheck size={14} /> クライアント割り当て</button>
                <hr className="my-1 border-[hsl(var(--border))]" />
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--accent))]" onClick={() => { onDelete(); setMenuOpen(false) }}><Trash2 size={14} /> 削除</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
          {isSuperAdmin ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
              <CheckCircle size={10} />管理者（購入不要）
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${lic.color}`}><LicIcon size={10} />{lic.label}</span>
          )}
          {form.client ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{form.client.name || form.client.email}</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">未割り当て</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">送信 {form._count.responses}件</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
              <UserCheck size={14} className="mr-1" />クライアント
            </Button>
            <Button size="sm" onClick={onEdit}>編集する</Button>
          </div>
        </div>
      </CardContent>

      {assignOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAssignOpen(false)}>
          <div className="bg-[hsl(var(--card))] rounded-lg p-6 w-full max-w-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-1">クライアント割り当て</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">「{form.title}」を担当クライアントに割り当てます</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${!form.clientId ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'}`}
                onClick={() => { onAssignClient(null); setAssignOpen(false) }}>
                <span className="text-[hsl(var(--muted-foreground))]">割り当てなし</span>
              </button>
              {clients.map((rel) => (
                <button key={rel.client.id}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${form.clientId === rel.client.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'}`}
                  onClick={() => { onAssignClient(rel.client.id); setAssignOpen(false) }}>
                  <p className="font-medium">{rel.client.name || '(名前なし)'}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{rel.client.email}</p>
                </button>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setAssignOpen(false)}>キャンセル</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function AgencyFormsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [forms, setForms] = useState<AgencyForm[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const load = async () => {
    setLoading(true)
    const [formsRes, clientsRes] = await Promise.all([fetch('/api/agency/forms'), fetch('/api/agency/clients')])
    if (formsRes.ok) setForms(await formsRes.json())
    if (clientsRes.ok) setClients(await clientsRes.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
    fetch('/api/me').then((r) => r.json()).then((u) => {
      if (u.role === 'SUPER_ADMIN') setIsSuperAdmin(true)
    }).catch(() => {})
  }, [])

  const handleDelete = async (form: AgencyForm) => {
    if (!confirm(`「${form.title}」を削除しますか？この操作は元に戻せません。`)) return
    const res = await fetch(`/api/agency/forms/${form.id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: '削除しました', variant: 'success' }); load() }
    else toast({ title: '削除に失敗しました', variant: 'destructive' })
  }

  const handleAssignClient = async (formId: string, clientId: string | null) => {
    const res = await fetch(`/api/agency/forms/${formId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    if (res.ok) { toast({ title: clientId ? 'クライアントを割り当てました' : '割り当てを解除しました', variant: 'success' }); load() }
    else toast({ title: 'エラーが発生しました', variant: 'destructive' })
  }

  const filtered = forms.filter((f) => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterClient === '__unassigned__' && f.clientId !== null) return false
    if (filterClient && filterClient !== '__unassigned__' && f.clientId !== filterClient) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">フォーム管理</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{forms.length}件のフォーム</p>
        </div>
        <Button onClick={() => router.push('/forms/new')}>
          <Plus size={16} className="mr-2" />新しいフォームを作成
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="フォーム名で検索..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm">
          <option value="">すべてのクライアント</option>
          <option value="__unassigned__">未割り当て</option>
          {clients.map((rel) => <option key={rel.client.id} value={rel.client.id}>{rel.client.name || rel.client.email}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
          {forms.length === 0 ? (
            <><p className="mb-4">まだフォームがありません</p><Button onClick={() => router.push('/forms/new')}>最初のフォームを作成する</Button></>
          ) : '該当するフォームがありません'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((form) => (
            <AgencyFormCard key={form.id} form={form} clients={clients} isSuperAdmin={isSuperAdmin}
              onEdit={() => router.push(`/forms/${form.id}/edit?back=/forms`)}
              onDelete={() => handleDelete(form)}
              onAssignClient={(clientId) => handleAssignClient(form.id, clientId)}
              onResponses={() => router.push(`/forms/${form.id}/responses`)}
              onPreview={() => window.open(`/f/${form.id}`, '_blank')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// CLIENT フォーム一覧
// ============================================================

const statusLabels: Record<string, { label: string; variant: 'secondary' | 'success' | 'outline' }> = {
  DRAFT:     { label: '下書き',   variant: 'secondary' },
  PUBLISHED: { label: '公開中',   variant: 'success' },
  ARCHIVED:  { label: 'アーカイブ', variant: 'outline' },
}

interface FormItem {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  updatedAt: string
  _count: { responses: number }
}

function ClientFormCard({
  form, statusInfo, onEdit, onPreview, onResponses, onAnalytics,
}: {
  form: FormItem
  statusInfo: { label: string; variant: 'secondary' | 'success' | 'outline' }
  onEdit: () => void
  onPreview: () => void
  onResponses: () => void
  onAnalytics: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onEdit}>
      <CardContent className="p-6 pt-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-snug mb-2">{form.title}</h3>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] transition-colors"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}>
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg py-1 text-sm">
                {[
                  { label: 'プレビュー', icon: Eye, action: onPreview },
                  { label: '送信データ', icon: Inbox, action: onResponses },
                  { label: '分析', icon: BarChart2, action: onAnalytics },
                ].map(({ label, icon: Icon, action }) => (
                  <button key={label} className="w-full text-left px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-2.5"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); action() }}>
                    <Icon size={14} className="text-[hsl(var(--muted-foreground))]" />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm text-[hsl(var(--muted-foreground))] mb-5 mt-4">
          <span className="flex items-center gap-1.5"><Send size={13} />送信 <strong className="text-[hsl(var(--foreground))]">{form._count.responses}</strong>件</span>
          <span>更新: {new Date(form.updatedAt).toLocaleDateString('ja-JP')}</span>
        </div>
        <div className="flex gap-2.5" onClick={(e) => e.stopPropagation()}>
          <Button onClick={onEdit} className="flex-1">詳細を確認</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ClientFormsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/forms').then((r) => r.json()).then(setForms)
      .catch(() => toast({ title: 'フォームの取得に失敗しました', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">フォーム管理</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">割り当てられたフォームを確認・編集できます</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>
      ) : forms.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-20 pt-20">
          <p className="text-[hsl(var(--muted-foreground))]">まだフォームが割り当てられていません</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {forms.map((form) => (
            <ClientFormCard key={form.id} form={form} statusInfo={statusLabels[form.status]}
              onEdit={() => router.push(`/forms/${form.id}`)}
              onPreview={() => window.open(`/f/${form.id}?preview=true`, '_blank')}
              onResponses={() => router.push(`/forms/${form.id}/responses`)}
              onAnalytics={() => router.push(`/forms/${form.id}/analytics`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Page entry
// ============================================================

export default function FormsPage() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((u) => setRole(u.role)).catch(() => setRole('CLIENT'))
  }, [])

  if (!role) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>
  if (role === 'AGENCY' || role === 'SUPER_ADMIN') return <AgencyFormsPage />
  return <ClientFormsPage />
}
