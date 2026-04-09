import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** GET /api/forms/:formId/analytics - EFO分析データを取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { formId } = await params
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        OR: [{ userId: user.id }, { clientId: user.id }],
      },
      include: {
        steps: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } },
      },
    })
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

    // ビュー・セッション・ステップ通過はイベントから集計
    const events = await prisma.formEvent.findMany({
      where: { formId },
      orderBy: { createdAt: 'asc' },
    })

    const views = events.filter((e) => e.type === 'VIEW').length
    const uniqueSessions = new Set(events.map((e) => e.sessionId)).size

    // ステップごとの通過数
    const stepStats = form.steps.map((step) => {
      const completions = events.filter(
        (e) => e.type === 'STEP_COMPLETE' && e.stepIndex === step.order
      ).length
      return {
        stepIndex: step.order,
        title: step.title,
        completions,
      }
    })

    // 送信数は Response テーブル（実データ）から確実に集計する
    // - SUBMIT イベントはリダイレクトや離脱で取りこぼしが発生するため信頼しない
    const submits = await prisma.response.count({ where: { formId } })

    // 直近30日の日別送信数（Response から）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const recentResponses = await prisma.response.findMany({
      where: { formId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    })
    const dailySubmits: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      dailySubmits[d.toISOString().slice(0, 10)] = 0
    }
    recentResponses.forEach((r) => {
      const day = new Date(r.createdAt).toISOString().slice(0, 10)
      if (day in dailySubmits) dailySubmits[day]++
    })

    return NextResponse.json({
      views,
      submits,
      uniqueSessions,
      completionRate: views > 0 ? Math.round((submits / views) * 100) : 0,
      stepStats,
      dailySubmits: Object.entries(dailySubmits).map(([date, count]) => ({ date, count })),
    })
  } catch (error) {
    console.error('GET /api/forms/[formId]/analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
