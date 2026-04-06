'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormInfo {
  id: string
  title: string
}

interface AnalyticsData {
  views: number
  submits: number
  completionRate: number
  uniqueSessions: number
  dailySubmits: { date: string; count: number }[]
  stepStats: { stepIndex: number; title: string; completions: number }[]
}

function AnalyticsContent() {
  const searchParams = useSearchParams()
  const [forms, setForms] = useState<FormInfo[]>([])
  const [selectedFormId, setSelectedFormId] = useState(searchParams.get('formId') || '')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/responses').then(r => r.json()).then(d => setForms(d.forms || []))
  }, [])

  useEffect(() => {
    if (!selectedFormId) { setData(null); return }
    setLoading(true)
    fetch(`/api/forms/${selectedFormId}/analytics`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [selectedFormId])

  const maxVal = data ? Math.max(...data.dailySubmits.map(d => d.count), 1) : 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">分析</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">フォームのパフォーマンスを確認できます</p>
        </div>
        <select
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
        >
          <option value="">フォームを選択...</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
      </div>

      {!selectedFormId ? (
        <Card>
          <CardContent className="py-20 pt-24 text-center text-[hsl(var(--muted-foreground))]">
            上のセレクトボックスからフォームを選択してください
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* サマリー */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'ページビュー', value: data.views, icon: '👁' },
              { label: '送信数', value: data.submits, icon: '📨' },
              { label: '完了率', value: `${data.completionRate}%`, icon: '✅' },
              { label: 'ユニークセッション', value: data.uniqueSessions, icon: '👤' },
            ].map((card) => (
              <Card key={card.label}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{card.label}</p>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 日別グラフ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">日別送信数（直近30日）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
                {data.dailySubmits.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-0.5 min-w-[28px]">
                    <div className="flex items-end h-32">
                      <div
                        className="w-4 bg-[hsl(var(--primary))] rounded-t"
                        style={{ height: `${(d.count / maxVal) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
                        title={`送信: ${d.count}`}
                      />
                    </div>
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] rotate-45 origin-left mt-1 whitespace-nowrap">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-[hsl(var(--primary))]" />送信数</span>
              </div>
            </CardContent>
          </Card>

          {/* ステップファンネル */}
          {data.stepStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ステップ通過数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.stepStats.map((s) => (
                  <div key={s.stepIndex}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{s.title}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">{s.completions}件</span>
                    </div>
                    <div className="h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--primary))] rounded-full"
                        style={{ width: `${data.views > 0 ? Math.min((s.completions / data.views) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>}>
      <AnalyticsContent />
    </Suspense>
  )
}
