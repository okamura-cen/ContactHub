'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, FileText, ArrowLeft, Globe, Clock } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'スターター',
  PRO: 'プロ',
  AGENCY: '代理店',
}

const LICENSE_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE:   { label: '有効', className: 'bg-green-100 text-green-700' },
  PENDING:  { label: '未購入', className: 'bg-yellow-100 text-yellow-700' },
  EXPIRED:  { label: '期限切れ', className: 'bg-red-100 text-red-700' },
  DELETED:  { label: '削除済み', className: 'bg-gray-100 text-gray-500' },
}

const FORM_STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'success' | 'outline' }> = {
  DRAFT:     { label: '下書き', variant: 'secondary' },
  PUBLISHED: { label: '公開中', variant: 'success' },
  ARCHIVED:  { label: 'アーカイブ', variant: 'outline' },
}

interface AgencyDetail {
  agency: {
    id: string
    email: string
    name: string | null
    plan: string
    createdAt: string
  }
  clients: Array<{
    id: string
    email: string
    name: string | null
    createdAt: string
    logoUrl: string | null
    joinedAt: string
  }>
  forms: Array<{
    id: string
    title: string
    status: string
    licenseStatus: string
    licenseExpiresAt: string | null
    createdAt: string
    updatedAt: string
    client: { id: string; email: string; name: string | null } | null
    _count: { responses: number }
  }>
}

export default function AdminAgencyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agencyId = params.agencyId as string
  const [data, setData] = useState<AgencyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/agencies/${agencyId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [agencyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
        代理店が見つかりません
      </div>
    )
  }

  const { agency, clients, forms } = data
  const activeLicenses = forms.filter((f) => f.licenseStatus === 'ACTIVE').length

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => router.push('/admin/agencies')}>
          <ArrowLeft size={15} className="mr-1" />
          代理店一覧へ
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{agency.name || agency.email}</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{agency.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{PLAN_LABELS[agency.plan] ?? agency.plan}</Badge>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              登録: {new Date(agency.createdAt).toLocaleDateString('ja-JP')}
            </span>
          </div>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users size={18} className="text-blue-500" />
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">クライアント</p>
              <p className="text-xl font-bold">{clients.length}名</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText size={18} className="text-indigo-500" />
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">フォーム</p>
              <p className="text-xl font-bold">{forms.length}件</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Globe size={18} className="text-green-500" />
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">有効ライセンス</p>
              <p className="text-xl font-bold">{activeLicenses}件</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* クライアント一覧 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={16} />
            クライアント一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-[hsl(var(--muted-foreground))]">クライアントはまだいません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left px-4 py-2.5 font-medium">名前 / メール</th>
                  <th className="text-left px-4 py-2.5 font-medium">ロゴ</th>
                  <th className="text-left px-4 py-2.5 font-medium">追加日</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-[hsl(var(--border))] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name || '(名前なし)'}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={c.logoUrl} alt="logo" className="h-7 object-contain max-w-[80px]" />
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">未設定</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(c.joinedAt).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* フォーム一覧 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={16} />
            フォーム一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {forms.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-[hsl(var(--muted-foreground))]">フォームはまだありません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left px-4 py-2.5 font-medium">フォーム名</th>
                  <th className="text-left px-4 py-2.5 font-medium">ステータス</th>
                  <th className="text-left px-4 py-2.5 font-medium">ライセンス</th>
                  <th className="text-left px-4 py-2.5 font-medium">有効期限</th>
                  <th className="text-left px-4 py-2.5 font-medium">担当クライアント</th>
                  <th className="text-left px-4 py-2.5 font-medium">送信数</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => {
                  const license = LICENSE_CONFIG[f.licenseStatus] ?? { label: f.licenseStatus, className: 'bg-gray-100 text-gray-500' }
                  const statusCfg = FORM_STATUS_CONFIG[f.status]
                  return (
                    <tr key={f.id} className="border-b border-[hsl(var(--border))] last:border-0">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{f.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusCfg?.variant ?? 'secondary'}>
                          {statusCfg?.label ?? f.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${license.className}`}>
                          {license.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                        {f.licenseExpiresAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(f.licenseExpiresAt).toLocaleDateString('ja-JP')}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {f.client ? (
                          <div>
                            <p className="font-medium">{f.client.name || '(名前なし)'}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{f.client.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">未割り当て</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {f._count.responses}件
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
