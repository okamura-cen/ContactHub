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

    const events = await prisma.formEvent.findMany({
      where: { formId },
      orderBy: { createdAt: 'asc' },
    })

    // 集計
    const views = events.filter((e) => e.type === 'VIEW').length
    const submits = events.filter((e) => e.type === 'SUBMIT').length
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

    // 直近30日の日別送信数
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const submitEvents = events.filter(
      (e) => e.type === 'SUBMIT' && new Date(e.createdAt) >= thirtyDaysAgo
    )
    const dailySubmits: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      dailySubmits[d.toISOString().slice(0, 10)] = 0
    }
    submitEvents.forEach((e) => {
      const day = new Date(e.createdAt).toISOString().slice(0, 10)
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
