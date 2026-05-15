'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, FileText, Upload, Pencil, CheckCircle, Clock, XCircle, Plus, X } from 'lucide-react'

const LICENSE_CONFIG = {
  PENDING:  { label: '未決済', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACTIVE:   { label: '有効',   color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  EXPIRED:  { label: '期限切れ', color: 'bg-red-100 text-red-700',     icon: XCircle },
  DELETED:  { label: '削除済み', color: 'bg-gray-100 text-gray-500',   icon: XCircle },
} as const

interface Form {
  id: string
  title: string
  status: string
  licenseStatus: keyof typeof LICENSE_CONFIG
  licenseExpiresAt: string | null
  clientId: string | null
  createdAt: string
}

interface ClientDetail {
  id: string
  name: string | null
  email: string
  createdAt: string
}

interface Relation {
  logoUrl: string | null
  client: ClientDetail
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.clientId as string

  const [relation, setRelation] = useState<Relation | null>(null)
  const [forms, setForms] = useState<Form[]>([])       // このクライアントに割り当て済み
  const [allForms, setAllForms] = useState<Form[]>([]) // 代理店の全フォーム
  const [loading, setLoading] = useState(true)
  const [editingLogo, setEditingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [savingLogo, setSavingLogo] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigning, setAssigning] = useState(false)
  // アカウント設定
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '' })
  const [savingAccount, setSavingAccount] = useState(false)

  const load = async () => {
    setLoading(true)
    const [relRes, assignedRes, allFormsRes] = await Promise.all([
      fetch(`/api/agency/clients`),
      fetch(`/api/agency/forms?clientId=${clientId}`),
      fetch(`/api/agency/forms`),
    ])
    if (relRes.ok) {
      const all: Relation[] = await relRes.json()
      const found = all.find((r) => r.client.id === clientId)
      if (found) {
        setRelation(found)
        setLogoUrl(found.logoUrl || '')
        setAccountForm({ name: found.client.name ?? '', email: found.client.email, password: '' })
      } else {
        router.push('/clients')
      }
    }
    if (assignedRes.ok) setForms(await assignedRes.json())
    if (allFormsRes.ok) setAllForms(await allFormsRes.json())
    setLoading(false)
  }

  const handleAssign = async (formId: string) => {
    setAssigning(true)
    const res = await fetch(`/api/agency/forms/${formId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    if (res.ok) {
      toast({ title: 'フォームを割り当てました', variant: 'success' })
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    }
    setAssigning(false)
  }

  const handleUnassign = async (formId: string) => {
    setAssigning(true)
    const res = await fetch(`/api/agency/forms/${formId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: null }),
    })
    if (res.ok) {
      toast({ title: '割り当てを解除しました', variant: 'success' })
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    }
    setAssigning(false)
  }

  useEffect(() => { load() }, [clientId])

  const handleSaveLogo = async () => {
    setSavingLogo(true)
    const res = await fetch(`/api/agency/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoUrl }),
    })
    setSavingLogo(false)
    if (res.ok) {
      toast({ title: 'ロゴを更新しました', variant: 'success' })
      setEditingLogo(false)
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const handleSaveAccount = async () => {
    if (!relation) return
    if (accountForm.password && accountForm.password.length < 8) {
      toast({ title: 'パスワードは 8 文字以上にしてください', variant: 'destructive' })
      return
    }
    const trimmedName = accountForm.name.trim()
    const trimmedEmail = accountForm.email.trim()
    if (!trimmedEmail) {
      toast({ title: 'メールアドレスを入力してください', variant: 'destructive' })
      return
    }

    const body: Record<string, unknown> = {}
    if (trimmedName !== (relation.client.name ?? '')) body.name = trimmedName
    if (trimmedEmail !== relation.client.email) body.email = trimmedEmail
    if (accountForm.password) body.password = accountForm.password

    if (Object.keys(body).length === 0) {
      toast({ title: '変更がありません', variant: 'destructive' })
      return
    }

    setSavingAccount(true)
    const res = await fetch(`/api/agency/clients/${clientId}/account`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSavingAccount(false)
    if (res.ok) {
      const data = await res.json()
      const parts: string[] = []
      if ('name' in body) parts.push('名前')
      if ('email' in body) parts.push('メール')
      if ('password' in body) parts.push('パスワード（通知メール送信）')
      toast({ title: `更新しました: ${parts.join('、')}`, variant: 'success' })
      if (data.warning) {
        toast({ title: data.warning, variant: 'destructive' })
      }
      setAccountForm({ ...accountForm, password: '' })
      load()
    } else {
      const { error } = await res.json()
      toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!relation) return null
  const { client } = relation

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/clients')}>
          <ArrowLeft size={16} className="mr-1" />
          一覧へ
        </Button>
      </div>

      <div className="flex items-start gap-6 mb-8">
        {/* ロゴ */}
        <div className="shrink-0">
          {relation.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={relation.logoUrl} alt="" className="w-16 h-16 rounded-lg object-contain border" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center text-2xl font-bold text-[hsl(var(--muted-foreground))]">
              {(client.name || client.email).charAt(0).toUpperCase()}
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 w-full text-xs"
            onClick={() => setEditingLogo(true)}
          >
            <Pencil size={12} className="mr-1" />
            ロゴ変更
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">{client.name || '(名前なし)'}</h1>
          <p className="text-[hsl(var(--muted-foreground))]">{client.email}</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            追加日: {new Date(client.createdAt).toLocaleDateString('ja-JP')}
          </p>
        </div>
      </div>

      {/* ロゴ編集モーダル */}
      {editingLogo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[hsl(var(--card))] rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Upload size={16} />
              ロゴURLを設定
            </h2>
            <Input
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="プレビュー" className="mt-3 h-12 object-contain" />
            )}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveLogo} disabled={savingLogo}>
                {savingLogo ? '保存中...' : '保存する'}
              </Button>
              <Button variant="outline" onClick={() => setEditingLogo(false)}>キャンセル</Button>
            </div>
          </div>
        </div>
      )}

      {/* アカウント設定 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pencil size={16} />
            アカウント設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            クライアントの名前・メール・パスワードを変更できます。現在のメール: {client.email}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">名前</label>
              <Input
                placeholder="株式会社○○"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メールアドレス</label>
              <Input
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">新パスワード（空欄なら変更しない）</label>
              <Input
                type="password"
                placeholder="8文字以上"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            パスワード変更時は、新パスワードを記載した通知メールがクライアントに自動送信されます。
          </p>
          <div>
            <Button onClick={handleSaveAccount} disabled={savingAccount}>
              {savingAccount ? '保存中...' : '変更を保存'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* フォーム一覧 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} />
              割り当て済みフォーム（{forms.length}件）
            </CardTitle>
            <Button size="sm" onClick={() => setShowAssignModal(true)}>
              <Plus size={14} className="mr-1" />
              フォームを割り当て
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {forms.length === 0 ? (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              <p className="text-sm mb-3">このクライアントに割り当てられたフォームはありません</p>
              <Button size="sm" variant="outline" onClick={() => setShowAssignModal(true)}>
                フォームを割り当てる
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium">フォーム名</th>
                  <th className="text-left p-3 font-medium">公開状態</th>
                  <th className="text-left p-3 font-medium">ライセンス</th>
                  <th className="text-left p-3 font-medium">有効期限</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => {
                  const lic = LICENSE_CONFIG[f.licenseStatus] || LICENSE_CONFIG.PENDING
                  const LicIcon = lic.icon
                  return (
                    <tr key={f.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--accent))]">
                      <td className="p-3 font-medium">{f.title}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          f.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {f.status === 'PUBLISHED' ? '公開中' : f.status === 'DRAFT' ? '下書き' : 'アーカイブ'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${lic.color}`}>
                          <LicIcon size={11} />{lic.label}
                        </span>
                      </td>
                      <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                        {f.licenseExpiresAt ? new Date(f.licenseExpiresAt).toLocaleDateString('ja-JP') : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost"
                            onClick={() => router.push(`/forms/${f.id}/edit?back=/clients/${clientId}`)}>
                            編集
                          </Button>
                          <Button size="sm" variant="ghost" className="text-[hsl(var(--destructive))]"
                            disabled={assigning}
                            onClick={() => handleUnassign(f.id)}>
                            <X size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* フォーム割り当てモーダル */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-[hsl(var(--card))] rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base">フォームを割り当て</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              「{relation?.client.name || relation?.client.email}」に割り当てるフォームを選択してください
            </p>
            <div className="overflow-y-auto flex-1 space-y-2">
              {allForms.length === 0 ? (
                <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-8">
                  フォームがありません
                </p>
              ) : (
                allForms.map((f) => {
                  const isAssignedToThis = f.clientId === clientId
                  const isAssignedToOther = f.clientId !== null && f.clientId !== clientId
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isAssignedToThis
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                          : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{f.title}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          {isAssignedToThis ? '✓ このクライアントに割り当て済み'
                            : isAssignedToOther ? '他のクライアントに割り当て済み'
                            : '未割り当て'}
                        </p>
                      </div>
                      <div className="ml-3 shrink-0">
                        {isAssignedToThis ? (
                          <Button size="sm" variant="outline" disabled={assigning}
                            onClick={() => handleUnassign(f.id)}>
                            解除
                          </Button>
                        ) : (
                          <Button size="sm" disabled={assigning}
                            onClick={() => handleAssign(f.id)}>
                            割り当て
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <Button variant="outline" className="mt-4" onClick={() => setShowAssignModal(false)}>
              閉じる
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
