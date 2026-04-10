'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const ACTION_LABELS: Record<string, string> = {
  RESPONSE_LIST_VIEWED: '送信データ閲覧',
  RESPONSE_UPDATED: '送信データ更新',
  RESPONSE_DELETED: '送信データ削除',
  FORM_CREATED: 'フォーム作成',
  FORM_UPDATED: 'フォーム更新',
  FORM_DELETED: 'フォーム削除',
  FORM_CLIENT_ASSIGNED: 'クライアント割り当て',
  CLIENT_CREATED: 'クライアント作成',
  CLIENT_REMOVED: 'クライアント解除',
}

const ACTION_COLORS: Record<string, string> = {
  RESPONSE_LIST_VIEWED: 'bg-blue-100 text-blue-700',
  RESPONSE_UPDATED: 'bg-yellow-100 text-yellow-700',
  RESPONSE_DELETED: 'bg-red-100 text-red-700',
  FORM_CREATED: 'bg-green-100 text-green-700',
  FORM_UPDATED: 'bg-yellow-100 text-yellow-700',
  FORM_DELETED: 'bg-red-100 text-red-700',
  FORM_CLIENT_ASSIGNED: 'bg-purple-100 text-purple-700',
  CLIENT_CREATED: 'bg-green-100 text-green-700',
  CLIENT_REMOVED: 'bg-red-100 text-red-700',
}

interface AuditEntry {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  detail: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: { name: string | null; email: string; role: string }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterAction, setFilterAction] = useState('')

  const load = async (p: number, action: string) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (action) params.set('action', action)
    const res = await fetch(`/api/admin/audit?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    }
    setLoading(false)
  }

  useEffect(() => { load(page, filterAction) }, [page, filterAction])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">監査ログ</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">全 {total} 件の操作ログ</p>
        </div>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
          className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
        >
          <option value="">すべてのアクション</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
              監査ログがありません
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium">日時</th>
                  <th className="text-left p-3 font-medium">ユーザー</th>
                  <th className="text-left p-3 font-medium">アクション</th>
                  <th className="text-left p-3 font-medium">リソース</th>
                  <th className="text-left p-3 font-medium">IP</th>
                  <th className="text-left p-3 font-medium">詳細</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
                    <td className="p-3 whitespace-nowrap text-[hsl(var(--muted-foreground))]">
                      {new Date(log.createdAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="p-3">
                      <div>
                        <span className="font-medium">{log.user.name || '(名前なし)'}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">{log.user.role}</span>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{log.user.email}</p>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{log.resource}</span>
                      <p className="text-xs font-mono text-[hsl(var(--muted-foreground))] truncate max-w-[120px]" title={log.resourceId}>
                        {log.resourceId}
                      </p>
                    </td>
                    <td className="p-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="p-3 text-xs text-[hsl(var(--muted-foreground))] max-w-[200px]">
                      {log.detail ? (
                        <pre className="truncate" title={JSON.stringify(log.detail, null, 2)}>
                          {JSON.stringify(log.detail)}
                        </pre>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            前へ
          </Button>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {page} / {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            次へ
          </Button>
        </div>
      )}
    </div>
  )
}
