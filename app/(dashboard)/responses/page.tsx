'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const STATUS_CONFIG = {
  PENDING:     { label: '未対応', color: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: '対応中', color: 'bg-yellow-100 text-yellow-700' },
  COMPLETED:   { label: '完了',   color: 'bg-green-100 text-green-700' },
  ON_HOLD:     { label: '保留',   color: 'bg-gray-100 text-gray-600' },
} as const

type ResponseStatus = keyof typeof STATUS_CONFIG

interface FormInfo {
  id: string
  title: string
}

interface FieldInfo {
  id: string
  type: string
  label: string
}

interface ResponseItem {
  id: string
  formId: string
  form: {
    title: string
    steps: { fields: FieldInfo[] }[]
  }
  data: Record<string, unknown>
  metadata: Record<string, unknown> | null
  isRead: boolean
  responseStatus: ResponseStatus
  memo: string | null
  createdAt: string
}

function ResponsesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [forms, setForms] = useState<FormInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null)
  const [memoText, setMemoText] = useState('')
  const [savingMemo, setSavingMemo] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResponseItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterFormId, setFilterFormId] = useState(searchParams.get('formId') || '')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterFormId) params.set('formId', filterFormId)
      if (filterStatus) params.set('status', filterStatus)
      if (filterUnread) params.set('unreadOnly', 'true')
      const res = await fetch(`/api/responses?${params}`)
      if (!res.ok) { router.push('/'); return }
      const data = await res.json()
      setResponses(data.responses)
      setForms(data.forms)
    } catch {
      toast({ title: 'データの取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filterFormId, filterStatus, filterUnread, router, toast])

  useEffect(() => { load() }, [load])

  const handleOpenDetail = async (r: ResponseItem) => {
    setSelectedResponse(r)
    setMemoText(r.memo || '')
    if (!r.isRead) {
      await fetch(`/api/forms/${r.formId}/responses/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
      setResponses((prev) => prev.map((x) => x.id === r.id ? { ...x, isRead: true } : x))
    }
  }

  const handleStatusChange = async (r: ResponseItem, newStatus: ResponseStatus) => {
    await fetch(`/api/forms/${r.formId}/responses/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseStatus: newStatus }),
    })
    setResponses((prev) => prev.map((x) => x.id === r.id ? { ...x, responseStatus: newStatus } : x))
    if (selectedResponse?.id === r.id) setSelectedResponse({ ...r, responseStatus: newStatus })
  }

  const handleSaveMemo = async () => {
    if (!selectedResponse) return
    setSavingMemo(true)
    await fetch(`/api/forms/${selectedResponse.formId}/responses/${selectedResponse.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo: memoText }),
    })
    setResponses((prev) => prev.map((x) => x.id === selectedResponse.id ? { ...x, memo: memoText } : x))
    setSelectedResponse({ ...selectedResponse, memo: memoText })
    setSavingMemo(false)
    toast({ title: 'メモを保存しました', variant: 'success' })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/forms/${deleteTarget.formId}/responses/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '削除しました', variant: 'success' })
        setDeleteTarget(null)
        setSelectedResponse(null)
        setResponses((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      } else {
        toast({ title: '削除に失敗しました', variant: 'destructive' })
      }
    } finally {
      setDeleting(false)
    }
  }

  const filtered = responses.filter((r) => {
    if (searchText) {
      const text = searchText.toLowerCase()
      const vals = JSON.stringify(r.data).toLowerCase()
      const form = r.form.title.toLowerCase()
      if (!vals.includes(text) && !form.includes(text)) return false
    }
    return true
  })

  const unreadCount = responses.filter((r) => !r.isRead).length
  const pendingCount = responses.filter((r) => r.responseStatus === 'PENDING').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">送信データ</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {responses.length}件
            {unreadCount > 0 && <span className="ml-2 text-[hsl(var(--primary))] font-medium">未読 {unreadCount}件</span>}
            {pendingCount > 0 && <span className="ml-2 text-orange-500 font-medium">未対応 {pendingCount}件</span>}
          </p>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          placeholder="キーワードで検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterFormId}
          onChange={(e) => setFilterFormId(e.target.value)}
          className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
        >
          <option value="">すべてのフォーム</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
        >
          <option value="">すべての対応状況</option>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <Button
          variant={filterUnread ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterUnread((v) => !v)}
        >
          未読のみ
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-[hsl(var(--muted-foreground))]">
            {responses.length === 0 ? 'まだ送信データがありません' : '該当するデータがありません'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium w-4"></th>
                  <th className="text-left p-3 font-medium">フォーム</th>
                  <th className="text-left p-3 font-medium">送信日時</th>
                  <th className="text-left p-3 font-medium">対応状況</th>
                  <th className="text-left p-3 font-medium">メモ</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const statusConf = STATUS_CONFIG[r.responseStatus] || STATUS_CONFIG.PENDING
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer ${!r.isRead ? 'font-medium bg-[hsl(var(--primary)/0.04)]' : ''}`}
                      onClick={() => handleOpenDetail(r)}
                    >
                      <td className="p-3">
                        {!r.isRead && <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />}
                      </td>
                      <td className="p-3 max-w-[160px] truncate">{r.form.title}</td>
                      <td className="p-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString('ja-JP')}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={r.responseStatus}
                          onChange={(e) => handleStatusChange(r, e.target.value as ResponseStatus)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${statusConf.color}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 max-w-[200px] truncate text-[hsl(var(--muted-foreground))]">
                        {r.memo || ''}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[hsl(var(--destructive))]"
                          onClick={() => setDeleteTarget(r)}
                        >
                          削除
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 詳細モーダル */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogHeader>
          <DialogTitle>{selectedResponse?.form.title} - 送信詳細</DialogTitle>
        </DialogHeader>
        {selectedResponse && (
          <>
            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))]">
                <span>送信日時: {new Date(selectedResponse.createdAt).toLocaleString('ja-JP')}</span>
                <a
                  href={`/forms/${selectedResponse.formId}/responses`}
                  className="text-[hsl(var(--primary))] underline text-xs"
                >
                  フォーム別に見る
                </a>
              </div>

              {/* 送信内容 */}
              <div className="space-y-2">
                {(() => {
                  // フィールドIDからラベルへのマップを作成
                  const fieldMap: Record<string, FieldInfo> = {}
                  selectedResponse.form.steps?.forEach((s) => {
                    s.fields?.forEach((f) => { fieldMap[f.id] = f })
                  })
                  // フィールド順に表示（不明なキーはスキップ）
                  const entries = Object.entries(selectedResponse.data)
                  const orderedFields = Object.values(fieldMap).filter(
                    (f) => !['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(f.type) && selectedResponse.data[f.id] !== undefined
                  )
                  // フォーム定義がある場合は順序通り、ない場合はそのまま
                  const displayEntries = orderedFields.length > 0
                    ? orderedFields.map((f) => [f.id, selectedResponse.data[f.id]] as [string, unknown])
                    : entries

                  return displayEntries.map(([key, val]) => {
                    const field = fieldMap[key]
                    const label = field?.label || key
                    let display = ''
                    if (val === null || val === undefined) display = ''
                    else if (typeof val === 'object' && !Array.isArray(val) && val !== null && 'url' in val) {
                      const f = val as { url: string; name: string; size: number }
                      return (
                        <div key={key} className="flex border-b border-[hsl(var(--border))] pb-2">
                          <span className="w-1/3 text-sm font-medium text-[hsl(var(--muted-foreground))]">{label}</span>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="w-2/3 text-sm text-[hsl(var(--primary))] underline">{f.name}</a>
                        </div>
                      )
                    } else if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
                      display = Object.values(val as object).filter(Boolean).join(' ')
                    } else if (Array.isArray(val)) {
                      display = val.join(', ')
                    } else if (typeof val === 'boolean') {
                      display = val ? '同意する' : '同意しない'
                    } else {
                      display = String(val)
                    }
                    return (
                      <div key={key} className="flex border-b border-[hsl(var(--border))] pb-2">
                        <span className="w-1/3 text-sm font-medium text-[hsl(var(--muted-foreground))]">{label}</span>
                        <span className="w-2/3 text-sm break-all">{display || '(未入力)'}</span>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* 対応状況 */}
              <div className="border-t border-[hsl(var(--border))] pt-4">
                <p className="text-sm font-medium mb-2">対応状況</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(selectedResponse, key as ResponseStatus)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border-2 transition-all ${
                        selectedResponse.responseStatus === key
                          ? `${val.color} border-current`
                          : 'bg-transparent border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* メモ */}
              <div>
                <p className="text-sm font-medium mb-2">対応メモ</p>
                <textarea
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  rows={4}
                  placeholder="対応内容や備考を記入..."
                  className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
                <Button size="sm" onClick={handleSaveMemo} disabled={savingMemo} className="mt-2">
                  {savingMemo ? '保存中...' : 'メモを保存'}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="destructive" size="sm" onClick={() => { setDeleteTarget(selectedResponse); setSelectedResponse(null) }}>
                削除
              </Button>
              <Button variant="outline" onClick={() => setSelectedResponse(null)}>閉じる</Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* 削除確認 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogHeader><DialogTitle>送信データを削除しますか？</DialogTitle></DialogHeader>
        <div className="py-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">この操作は元に戻せません。</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

export default function ResponsesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>}>
      <ResponsesContent />
    </Suspense>
  )
}
