'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

interface FieldInfo {
  id: string
  type: string
  label: string
}

interface DisplayColumn {
  key: string
  label: string
  /** 一覧テーブル用の表示値（繰り返しは「、」区切り） */
  getValue: (data: Record<string, unknown>) => string
  /** CSV 用の値（未指定なら getValue を使用。繰り返しは「; 」区切り） */
  getCsv?: (data: Record<string, unknown>) => string
  /** 詳細画面の箇条書き用。配列でなければ null */
  getList?: (data: Record<string, unknown>) => string[] | null
}

interface ResponseItem {
  id: string
  data: Record<string, unknown>
  metadata: Record<string, unknown> | null
  isRead: boolean
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
  const [deleteTarget, setDeleteTarget] = useState<ResponseItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const buildColumns = (fields: FieldInfo[]): DisplayColumn[] => {
    const cols: DisplayColumn[] = []
    fields.forEach((f) => {
      if (['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(f.type)) return

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
      } else if (f.type === 'FILE') {
        cols.push({
          key: f.id,
          label: f.label,
          getValue: (d) => {
            const val = d[f.id] as { name?: string; size?: number; url?: string } | null
            if (!val || typeof val !== 'object') return ''
            const size = val.size
              ? val.size < 1024 * 1024
                ? `${(val.size / 1024).toFixed(1)}KB`
                : `${(val.size / (1024 * 1024)).toFixed(1)}MB`
              : ''
            return val.name ? `${val.name}${size ? ` (${size})` : ''}` : ''
          },
        })
      } else if (f.type === 'TEXT' || f.type === 'DATE') {
        // text/date：繰り返し入力（配列）に対応。一覧は「、」、CSV は「; 」、詳細は箇条書き
        const filteredArr = (d: Record<string, unknown>): string[] => {
          const val = d[f.id]
          if (!Array.isArray(val)) return []
          return val.filter((v) => String(v).trim() !== '').map(String)
        }
        cols.push({
          key: f.id,
          label: f.label,
          getValue: (d) => {
            const val = d[f.id]
            if (Array.isArray(val)) return filteredArr(d).join('、')
            if (val === null || val === undefined) return ''
            return String(val)
          },
          getCsv: (d) => {
            const val = d[f.id]
            if (Array.isArray(val)) return filteredArr(d).join('; ')
            if (val === null || val === undefined) return ''
            return String(val)
          },
          getList: (d) => {
            const val = d[f.id]
            return Array.isArray(val) ? filteredArr(d) : null
          },
        })
      } else {
        cols.push({
          key: f.id,
          label: f.label,
          getValue: (d) => {
            const val = d[f.id]
            if (val === null || val === undefined) return ''
            if (Array.isArray(val)) return val.join(', ')
            if (typeof val === 'boolean') return val ? '同意する' : '同意しない'
            if (typeof val === 'object') return JSON.stringify(val)
            return String(val)
          },
        })
      }
    })
    return cols
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/responses`)
      if (!res.ok) { router.push('/forms'); return }
      const data = await res.json()
      setFormTitle(data.form.title)
      setResponses(data.responses)
      const allFields = (data.form.steps || []).flatMap((s: { fields: FieldInfo[] }) => s.fields)
      setColumns(buildColumns(allFields))
    } catch {
      toast({ title: 'データの取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [formId, router, toast])

  useEffect(() => { load() }, [load])

  const handleToggleRead = async (r: ResponseItem) => {
    const newIsRead = !r.isRead
    // Optimistic update
    setResponses((prev) => prev.map((x) => x.id === r.id ? { ...x, isRead: newIsRead } : x))
    if (selectedResponse?.id === r.id) setSelectedResponse({ ...r, isRead: newIsRead })
    await fetch(`/api/forms/${formId}/responses/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: newIsRead }),
    })
  }

  const handleOpenDetail = async (r: ResponseItem) => {
    setSelectedResponse(r)
    if (!r.isRead) {
      await handleToggleRead(r)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/forms/${formId}/responses/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '削除しました', variant: 'success' })
        setDeleteTarget(null)
        setSelectedResponse(null)
        setResponses((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      } else {
        toast({ title: '削除に失敗しました', variant: 'destructive' })
      }
    } catch {
      toast({ title: '削除に失敗しました', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCSV = useCallback(() => {
    if (columns.length === 0 || responses.length === 0) return
    const headers = ['送信日時', ...columns.map((c) => c.label)]
    const rows = responses.map((r) => {
      const date = new Date(r.createdAt).toLocaleString('ja-JP')
      const vals = columns.map((c) => (c.getCsv ? c.getCsv(r.data) : c.getValue(r.data)))
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

  // ヘッダー行とデータ行（表示用の文字列）を組み立てる
  const buildTableData = useCallback(() => {
    const headers = ['送信日時', ...columns.map((c) => c.label)]
    const rows = responses.map((r) => {
      const date = new Date(r.createdAt).toLocaleString('ja-JP')
      return [date, ...columns.map((c) => (c.getCsv ? c.getCsv(r.data) : c.getValue(r.data)))]
    })
    return { headers, rows }
  }, [columns, responses])

  // Blob をファイルとしてダウンロードさせる
  const downloadBlob = useCallback((blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formTitle}_responses_${new Date().toISOString().slice(0, 10)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [formTitle])

  // Excel(.xlsx)：exceljs はダウンロード時のみ動的読み込み（初期表示を軽くするため）
  const handleExportExcel = useCallback(async () => {
    if (columns.length === 0 || responses.length === 0) return
    setExporting(true)
    try {
      const { Workbook } = await import('exceljs')
      const { headers, rows } = buildTableData()
      const wb = new Workbook()
      const ws = wb.addWorksheet('回答データ')
      const headerRow = ws.addRow(headers)
      headerRow.font = { bold: true }
      // すべて文字列として書き込み、電話番号などの先頭ゼロ落ち・指数表記化を防ぐ
      rows.forEach((row) => {
        const added = ws.addRow(row)
        added.eachCell((cell) => { cell.numFmt = '@' })
      })
      // 列幅をラベル長・値長に合わせて簡易調整
      ws.columns.forEach((col, i) => {
        const maxLen = Math.max(
          String(headers[i] ?? '').length,
          ...rows.map((r) => String(r[i] ?? '').length)
        )
        col.width = Math.min(Math.max(maxLen + 2, 10), 60)
      })
      const buf = await wb.xlsx.writeBuffer()
      downloadBlob(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        'xlsx'
      )
    } catch {
      toast({ title: 'Excelの書き出しに失敗しました', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }, [columns, responses, buildTableData, downloadBlob, toast])

  // JSON：ラベルをキーにした読みやすい形式
  const handleExportJSON = useCallback(() => {
    if (columns.length === 0 || responses.length === 0) return
    const data = responses.map((r) => {
      const obj: Record<string, string> = { 送信日時: new Date(r.createdAt).toLocaleString('ja-JP') }
      columns.forEach((c) => { obj[c.label] = c.getValue(r.data) })
      return obj
    })
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'json')
  }, [columns, responses, downloadBlob])

  const filteredResponses = responses.filter((r) => {
    if (filterUnread && r.isRead) return false
    if (searchText) {
      const text = searchText.toLowerCase()
      const allValues = columns.map((c) => c.getValue(r.data)).join(' ').toLowerCase()
      const date = new Date(r.createdAt).toLocaleString('ja-JP')
      if (!allValues.includes(text) && !date.includes(text)) return false
    }
    return true
  })

  const unreadCount = responses.filter((r) => !r.isRead).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" onClick={() => router.push('/forms')}>
              ← 戻る
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{formTitle} - 送信データ</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {responses.length}件
            {unreadCount > 0 && (
              <span className="ml-2 text-[hsl(var(--primary))] font-medium">未読 {unreadCount}件</span>
            )}
          </p>
        </div>
        {/* ダウンロード（形式選択） */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setExportMenuOpen((v) => !v)}
            disabled={responses.length === 0 || exporting}
          >
            {exporting ? '書き出し中...' : 'ダウンロード ▾'}
          </Button>
          {exportMenuOpen && (
            <>
              {/* 外側クリックで閉じる */}
              <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
              <div className="absolute right-0 mt-1 z-20 w-48 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-md py-1">
                {[
                  { label: 'CSV (.csv)', run: handleExportCSV },
                  { label: 'Excel (.xlsx)', run: handleExportExcel },
                  { label: 'JSON (.json)', run: handleExportJSON },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                    onClick={() => { setExportMenuOpen(false); item.run() }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 検索・絞り込み */}
      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="キーワードで検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={filterUnread ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterUnread((v) => !v)}
        >
          未読のみ
        </Button>
      </div>

      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="py-20 pt-20 text-center text-[hsl(var(--muted-foreground))]">
            {responses.length === 0 ? 'まだ送信データがありません' : '該当するデータがありません'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium whitespace-nowrap w-4"></th>
                  <th className="text-left p-3 font-medium whitespace-nowrap">送信日時</th>
                  {columns.slice(0, 6).map((c) => (
                    <th key={c.key} className="text-left p-3 font-medium whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  {columns.length > 6 && <th className="text-left p-3 font-medium">...</th>}
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] cursor-pointer ${!r.isRead ? 'font-medium bg-[hsl(var(--primary)/0.04)]' : ''}`}
                    onClick={() => handleOpenDetail(r)}
                  >
                    <td className="p-3">
                      {!r.isRead && (
                        <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('ja-JP')}
                    </td>
                    {columns.slice(0, 6).map((c) => (
                      <td key={c.key} className="p-3 max-w-[200px] truncate">
                        {c.getValue(r.data)}
                      </td>
                    ))}
                    {columns.length > 6 && <td className="p-3">...</td>}
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
                        onClick={() => setDeleteTarget(r)}
                      >
                        削除
                      </Button>
                    </td>
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
          <>
            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))]">
                <span>送信日時: {new Date(selectedResponse.createdAt).toLocaleString('ja-JP')}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleRead(selectedResponse)}
                >
                  {selectedResponse.isRead ? '未読に戻す' : '既読にする'}
                </Button>
              </div>
              {columns.map((c) => {
                const rawVal = selectedResponse.data[c.key] ?? selectedResponse.data[c.key.split('.')[0]]
                const isFile = rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && 'url' in rawVal
                const fileVal = isFile ? rawVal as { url: string; name: string; size: number } : null
                // 繰り返し入力は番号付き箇条書きで表示
                const listVals = c.getList ? c.getList(selectedResponse.data) : null
                return (
                  <div key={c.key} className="flex border-b border-[hsl(var(--border))] pb-2">
                    <span className="w-1/3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                      {c.label}
                    </span>
                    <span className="w-2/3 text-sm break-all">
                      {fileVal ? (
                        <a
                          href={fileVal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[hsl(var(--primary))] underline"
                        >
                          {c.getValue(selectedResponse.data) || fileVal.name}
                        </a>
                      ) : listVals && listVals.length > 0 ? (
                        <ol className="list-decimal list-inside space-y-0.5">
                          {listVals.map((v, i) => (
                            <li key={i}>{v}</li>
                          ))}
                        </ol>
                      ) : (
                        c.getValue(selectedResponse.data) || '(未入力)'
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteTarget(selectedResponse); setSelectedResponse(null) }}
              >
                削除
              </Button>
              <Button variant="outline" onClick={() => setSelectedResponse(null)}>
                閉じる
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* 削除確認モーダル */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>送信データを削除しますか？</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            この操作は元に戻せません。
          </p>
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
