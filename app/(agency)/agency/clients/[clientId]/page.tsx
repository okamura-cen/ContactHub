'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, FileText, Upload, Pencil, CheckCircle, Clock, XCircle } from 'lucide-react'

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

export default function AgencyClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.clientId as string

  const [relation, setRelation] = useState<Relation | null>(null)
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLogo, setEditingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [savingLogo, setSavingLogo] = useState(false)

  const load = async () => {
    setLoading(true)
    const [relRes, formsRes] = await Promise.all([
      fetch(`/api/agency/clients`),
      fetch(`/api/agency/forms?clientId=${clientId}`),
    ])
    if (relRes.ok) {
      const all: Relation[] = await relRes.json()
      const found = all.find((r) => r.client.id === clientId)
      if (found) {
        setRelation(found)
        setLogoUrl(found.logoUrl || '')
      } else {
        router.push('/agency/clients')
      }
    }
    if (formsRes.ok) setForms(await formsRes.json())
    setLoading(false)
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
        <Button variant="ghost" size="sm" onClick={() => router.push('/agency/clients')}>
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

      {/* フォーム一覧 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} />
              割り当て済みフォーム（{forms.length}件）
            </CardTitle>
            <Button size="sm" onClick={() => router.push('/agency/forms')}>
              フォームを管理
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {forms.length === 0 ? (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              <p className="text-sm mb-3">このクライアントに割り当てられたフォームはありません</p>
              <Button size="sm" variant="outline" onClick={() => router.push('/agency/forms')}>
                フォーム管理へ
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
                    <tr key={f.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
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
                          <LicIcon size={11} />
                          {lic.label}
                        </span>
                      </td>
                      <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                        {f.licenseExpiresAt
                          ? new Date(f.licenseExpiresAt).toLocaleDateString('ja-JP')
                          : '—'}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/agency/forms/${f.id}/edit`)}
                        >
                          編集
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
