'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

interface FieldInfo {
  id: string
  type: string
  label: string
}

/** 表示用にフラット化されたカラム定義 */
interface DisplayColumn {
  key: string
  label: string
  getValue: (data: Record<string, unknown>) => string
}

interface ResponseItem {
  id: string
  data: Record<string, unknown>
  metadata: Record<string, unknown> | null
  createdAt: string
}

/** 送信データ一覧ページ */
export default function ResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const formId = params.formId as string

  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [columns, setColumns] = useState<DisplayColumn[]>([])
  const [formTitle, setFormTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null)

  /** フィールド定義をフラットなカラム定義に展開する */
  const buildColumns = (fields: FieldInfo[]): DisplayColumn[] => {
    const cols: DisplayColumn[] = []
    fields.forEach((f) => {
      if (['HEADING', 'DIVIDER'].includes(f.type)) return

      if (f.type === 'ZIP') {
        cols.push(
          { key: `${f.id}.zipcode`, label: '郵便番号', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.zipcode || '' } },
          { key: `${f.id}.prefecture`, label: '都道府県', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.prefecture || '' } },
          { key: `${f.id}.city`, label: '市区町村', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.city || '' } },
          { key: `${f.id}.address`, label: '番地・建物名', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.address || '' } },
        )
      } else if (f.type === 'NAME') {
        cols.push(
          { key: `${f.id}.sei`, label: '姓', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.sei || '' } },
          { key: `${f.id}.mei`, label: '名', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.mei || '' } },
          { key: `${f.id}.seiKana`, label: 'セイ', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.seiKana || '' } },
          { key: `${f.id}.meiKana`, label: 'メイ', getValue: (d) => { const v = d[f.id] as Record<string, string> | undefined; return v?.meiKana || '' } },
        )
      } else {
        cols.push({
          key: f.id,
          label: f.label,
          getValue: (d) => {
            const val = d[f.id]
            if (val === null || val === undefined) return ''
            if (Array.isArray(val)) return val.join(', ')
            if (typeof val === 'boolean') return val ? '同意する' : '同意しない'
            return String(val)
          },
        })
      }
    })
    return cols
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/forms/${formId}/responses`)
        if (!res.ok) {
          router.push('/')
          return
        }
        const data = await res.json()
        setFormTitle(data.form.title)
        setResponses(data.responses)
        const allFields = (data.form.steps || []).flatMap(
          (s: { fields: FieldInfo[] }) => s.fields
        )
        setColumns(buildColumns(allFields))
      } catch {
        toast({ title: 'データの取得に失敗しました', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [formId, router, toast])

  const handleExportCSV = useCallback(() => {
    if (columns.length === 0 || responses.length === 0) return

    const headers = ['送信日時', ...columns.map((c) => c.label)]
    const rows = responses.map((r) => {
      const date = new Date(r.createdAt).toLocaleString('ja-JP')
      const vals = columns.map((c) => c.getValue(r.data))
      return [date, ...vals]
    })

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formTitle}_responses_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [columns, responses, formTitle])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              ← 戻る
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{formTitle} - 送信データ</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {responses.length}件の送信データ
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={responses.length === 0}>
          CSVエクスポート
        </Button>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-[hsl(var(--muted-foreground))]">
            まだ送信データがありません
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium whitespace-nowrap">送信日時</th>
                  {columns.slice(0, 8).map((c) => (
                    <th key={c.key} className="text-left p-3 font-medium whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  {columns.length > 8 && (
                    <th className="text-left p-3 font-medium">...</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer"
                    onClick={() => setSelectedResponse(r)}
                  >
                    <td className="p-3 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('ja-JP')}
                    </td>
                    {columns.slice(0, 8).map((c) => (
                      <td key={c.key} className="p-3 max-w-[200px] truncate">
                        {c.getValue(r.data)}
                      </td>
                    ))}
                    {columns.length > 8 && <td className="p-3">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 詳細モーダル */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogHeader>
          <DialogTitle>送信データ詳細</DialogTitle>
        </DialogHeader>
        {selectedResponse && (
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              送信日時: {new Date(selectedResponse.createdAt).toLocaleString('ja-JP')}
            </div>
            {columns.map((c) => (
              <div key={c.key} className="flex border-b border-[hsl(var(--border))] pb-2">
                <span className="w-1/3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  {c.label}
                </span>
                <span className="w-2/3 text-sm break-all">
                  {c.getValue(selectedResponse.data) || '(未入力)'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  )
}
