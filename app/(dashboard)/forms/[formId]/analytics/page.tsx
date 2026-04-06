'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

interface StepStat {
  stepIndex: number
  title: string
  completions: number
}

interface DailyCount {
  date: string
  count: number
}

interface AnalyticsData {
  views: number
  submits: number
  uniqueSessions: number
  completionRate: number
  stepStats: StepStat[]
  dailySubmits: DailyCount[]
}

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const formId = params.formId as string

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [formTitle, setFormTitle] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, formRes] = await Promise.all([
          fetch(`/api/forms/${formId}/analytics`),
          fetch(`/api/forms/${formId}`),
        ])
        if (!analyticsRes.ok) { router.push('/forms'); return }
        const [analytics, form] = await Promise.all([analyticsRes.json(), formRes.json()])
        setData(analytics)
        setFormTitle(form.title)
      } catch {
        toast({ title: 'データの取得に失敗しました', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [formId, router, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!data) return null

  const maxDaily = Math.max(...data.dailySubmits.map((d) => d.count), 1)
  const maxStepCompletions = Math.max(...data.stepStats.map((s) => s.completions), 1)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Button variant="ghost" size="sm" onClick={() => router.push('/forms')}>
          ← 戻る
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-1">{formTitle} - EFO分析</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">フォームのパフォーマンスデータ</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">表示回数</p>
            <p className="text-3xl font-bold">{data.views.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">送信数</p>
            <p className="text-3xl font-bold">{data.submits.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">完了率</p>
            <p className="text-3xl font-bold">{data.completionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">ユニークセッション</p>
            <p className="text-3xl font-bold">{data.uniqueSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">日別送信数（直近30日）</CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailySubmits.every((d) => d.count === 0) ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] py-8 text-center">データがありません</p>
            ) : (
              <div className="flex items-end gap-[2px] h-32">
                {data.dailySubmits.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 bg-[hsl(var(--primary))] rounded-t opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                    title={`${d.date}: ${d.count}件`}
                  />
                ))}
              </div>
            )}
            <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mt-1">
              <span>{data.dailySubmits[0]?.date}</span>
              <span>{data.dailySubmits[data.dailySubmits.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ステップ通過数（ファネル）</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stepStats.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] py-8 text-center">ステップがありません</p>
            ) : (
              <div className="space-y-2">
                {data.stepStats.map((s) => (
                  <div key={s.stepIndex}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[hsl(var(--muted-foreground))] truncate max-w-[60%]">
                        {s.title || `ステップ ${s.stepIndex + 1}`}
                      </span>
                      <span className="font-medium">{s.completions}件</span>
                    </div>
                    <div className="h-3 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--primary))] rounded-full"
                        style={{ width: `${(s.completions / maxStepCompletions) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[hsl(var(--muted-foreground))]">送信完了</span>
                    <span className="font-medium">{data.submits}件</span>
                  </div>
                  <div className="h-3 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(data.submits / maxStepCompletions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
