'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Users, FileText, ShieldCheck, ChevronRight } from 'lucide-react'

interface AgencyRow {
  id: string
  email: string
  name: string | null
  createdAt: string
  clientCount: number
  formCount: number
  activeLicenses: number
}

export default function AdminAgenciesPage() {
  const router = useRouter()
  const [agencies, setAgencies] = useState<AgencyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/agencies')
      .then((r) => r.json())
      .then((data) => setAgencies(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">代理店管理</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {loading ? '読み込み中...' : `${agencies.length}社の代理店`}
        </p>
      </div>

      {/* サマリーカード */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-5 pt-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">代理店数</p>
                <p className="text-2xl font-bold">{agencies.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 pt-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">総クライアント数</p>
                <p className="text-2xl font-bold">{agencies.reduce((s, a) => s + a.clientCount, 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 pt-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <ShieldCheck size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">有効ライセンス</p>
                <p className="text-2xl font-bold">{agencies.reduce((s, a) => s + a.activeLicenses, 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 代理店一覧テーブル */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
              <Building2 size={32} className="mb-3 opacity-40" />
              <p className="text-sm">代理店がまだいません</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium">代理店名 / メール</th>
                  <th className="text-left p-3 font-medium">クライアント</th>
                  <th className="text-left p-3 font-medium">フォーム</th>
                  <th className="text-left p-3 font-medium">有効ライセンス</th>
                  <th className="text-left p-3 font-medium">登録日</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer"
                    onClick={() => router.push(`/admin/agencies/${a.id}`)}
                  >
                    <td className="p-3">
                      <p className="font-medium">{a.name || '(名前なし)'}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{a.email}</p>
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                        <Users size={13} />
                        {a.clientCount}名
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                        <FileText size={13} />
                        {a.formCount}件
                      </span>
                    </td>
                    <td className="p-3">
                      {a.activeLicenses > 0 ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          {a.activeLicenses}件 有効
                        </span>
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">—</span>
                      )}
                    </td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="p-3">
                      <ChevronRight size={16} className="text-[hsl(var(--muted-foreground))]" />
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
