'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, CheckCircle, Clock } from 'lucide-react'

interface DashboardData {
  totalClients: number
  totalForms: number
  activeForms: number
  pendingForms: number
  recentClients: {
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
  }[]
}

export default function AgencyDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agency/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!data) return null

  const summaryCards = [
    { label: 'クライアント数',       value: data.totalClients, icon: Users,       sub: '担当クライアント' },
    { label: '総フォーム数',         value: data.totalForms,   icon: FileText,    sub: '作成済みフォーム' },
    { label: '有効ライセンス',       value: data.activeForms,  icon: CheckCircle, sub: '稼働中' },
    { label: '未決済フォーム',       value: data.pendingForms, icon: Clock,       sub: 'ライセンス未購入' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">代理店管理画面</p>
      </div>

      {/* サマリーカード */}
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

      {/* 最近のクライアント */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">最近追加したクライアント</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/agency/clients')}>
              すべて見る →
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">まだクライアントがいません</p>
              <Button onClick={() => router.push('/agency/clients')}>
                クライアントを追加
              </Button>
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
                  <tr
                    key={rel.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer"
                    onClick={() => router.push(`/agency/clients/${rel.client.id}`)}
                  >
                    <td className="p-3 font-medium">{rel.client.name || '(名前なし)'}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{rel.client.email}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{rel.client._count.clientForms}件</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(rel.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost">詳細 →</Button>
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
