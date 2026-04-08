'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, BellDot, Clock, Globe, Users, FileText, CheckCircle, type LucideIcon } from 'lucide-react'

// ---------- CLIENT dashboard ----------

const RESPONSE_STATUS_CONFIG = {
  PENDING:     { label: '未対応', color: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: '対応中', color: 'bg-yellow-100 text-yellow-700' },
  COMPLETED:   { label: '完了',   color: 'bg-green-100 text-green-700' },
  ON_HOLD:     { label: '保留',   color: 'bg-gray-100 text-gray-600' },
} as const

interface ClientDashboardData {
  totalForms: number
  publishedForms: number
  totalResponses: number
  unreadResponses: number
  pendingResponses: number
  todayResponses: number
  weekResponses: number
  recentResponses: {
    id: string
    formId: string
    formTitle: string
    isRead: boolean
    responseStatus: keyof typeof RESPONSE_STATUS_CONFIG
    createdAt: string
    data: Record<string, unknown>
  }[]
}

function ClientDashboard() {
  const router = useRouter()
  const [data, setData] = useState<ClientDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>
  if (!data) return null

  const summaryCards: { label: string; value: number; sub: string; icon: LucideIcon }[] = [
    { label: '今日の新規送信',    value: data.todayResponses,   sub: `今週: ${data.weekResponses}件`, icon: Mail },
    { label: '未読の送信データ',  value: data.unreadResponses,  sub: '確認が必要',                    icon: BellDot },
    { label: '未対応の問い合わせ', value: data.pendingResponses, sub: '対応待ち',                     icon: Clock },
    { label: '公開中フォーム',    value: data.publishedForms,   sub: `全${data.totalForms}件`,        icon: Globe },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{card.label}</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{card.sub}</p>
                  </div>
                  <Icon size={20} className="text-[hsl(var(--muted-foreground))]" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">最新の送信データ</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/responses')}>すべて見る →</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentResponses.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">まだ送信データがありません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium w-4"></th>
                  <th className="text-left p-3 font-medium">フォーム</th>
                  <th className="text-left p-3 font-medium">送信日時</th>
                  <th className="text-left p-3 font-medium">対応状況</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.recentResponses.map((r) => {
                  const statusConf = RESPONSE_STATUS_CONFIG[r.responseStatus] || RESPONSE_STATUS_CONFIG.PENDING
                  return (
                    <tr key={r.id} className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer ${!r.isRead ? 'font-medium' : ''}`}
                      onClick={() => router.push(`/responses?formId=${r.formId}`)}>
                      <td className="p-3">{!r.isRead && <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />}</td>
                      <td className="p-3">{r.formTitle}</td>
                      <td className="p-3 whitespace-nowrap text-[hsl(var(--muted-foreground))]">{new Date(r.createdAt).toLocaleString('ja-JP')}</td>
                      <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConf.color}`}>{statusConf.label}</span></td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/forms/${r.formId}/responses`) }}>詳細</Button>
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

// ---------- AGENCY dashboard ----------

interface AgencyDashboardData {
  totalClients: number
  totalForms: number
  activeForms: number
  pendingForms: number
  recentClients: {
    id: string
    logoUrl: string | null
    createdAt: string
    client: { id: string; name: string | null; email: string; createdAt: string; _count: { clientForms: number } }
  }[]
}

function AgencyDashboard() {
  const router = useRouter()
  const [data, setData] = useState<AgencyDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agency/dashboard').then((r) => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>
  if (!data) return null

  const summaryCards = [
    { label: 'クライアント数',   value: data.totalClients, icon: Users,       sub: '担当クライアント' },
    { label: '総フォーム数',     value: data.totalForms,   icon: FileText,    sub: '作成済みフォーム' },
    { label: '有効ライセンス',   value: data.activeForms,  icon: CheckCircle, sub: '稼働中' },
    { label: '未決済フォーム',   value: data.pendingForms, icon: Clock,       sub: 'ライセンス未購入' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{card.label}</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{card.sub}</p>
                  </div>
                  <Icon size={20} className="text-[hsl(var(--muted-foreground))]" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">最近追加したクライアント</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/clients')}>すべて見る →</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">まだクライアントがいません</p>
              <Button onClick={() => router.push('/clients')}>クライアントを追加</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium">クライアント名</th>
                  <th className="text-left p-3 font-medium">メール</th>
                  <th className="text-left p-3 font-medium">フォーム数</th>
                  <th className="text-left p-3 font-medium">追加日</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.recentClients.map((rel) => (
                  <tr key={rel.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer"
                    onClick={() => router.push(`/clients/${rel.client.id}`)}>
                    <td className="p-3 font-medium">{rel.client.name || '(名前なし)'}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{rel.client.email}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{rel.client._count.clientForms}件</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">{new Date(rel.createdAt).toLocaleDateString('ja-JP')}</td>
                    <td className="p-3"><Button size="sm" variant="ghost">詳細 →</Button></td>
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

// ---------- Page entry ----------

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((u) => setRole(u.role)).catch(() => setRole('CLIENT'))
  }, [])

  if (!role) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>
  if (role === 'AGENCY' || role === 'SUPER_ADMIN') return <AgencyDashboard />
  return <ClientDashboard />
}
