import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** GET /api/dashboard - ダッシュボードのサマリーデータ */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // CLIENTは割り当てられたフォーム、AGENCYは自分が所有するフォーム
    const formWhere = user.role === 'CLIENT'
      ? { clientId: user.id }
      : { userId: user.id }

    const forms = await prisma.form.findMany({
      where: formWhere,
      select: { id: true },
    })
    const formIds = forms.map((f) => f.id)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalForms,
      publishedForms,
      totalResponses,
      unreadResponses,
      pendingResponses,
      todayResponses,
      weekResponses,
      recentResponses,
    ] = await Promise.all([
      prisma.form.count({ where: formWhere }),
      prisma.form.count({ where: { ...formWhere, status: 'PUBLISHED' } }),
      prisma.response.count({ where: { formId: { in: formIds } } }),
      prisma.response.count({ where: { formId: { in: formIds }, isRead: false } }),
      prisma.response.count({ where: { formId: { in: formIds }, responseStatus: 'PENDING' } }),
      prisma.response.count({ where: { formId: { in: formIds }, createdAt: { gte: todayStart } } }),
      prisma.response.count({ where: { formId: { in: formIds }, createdAt: { gte: weekStart } } }),
      prisma.response.findMany({
        where: { formId: { in: formIds } },
        include: { form: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    return NextResponse.json({
      totalForms,
      publishedForms,
      totalResponses,
      unreadResponses,
      pendingResponses,
      todayResponses,
      weekResponses,
      recentResponses: recentResponses.map((r) => ({
        id: r.id,
        formId: r.formId,
        formTitle: r.form.title,
        isRead: r.isRead,
        responseStatus: r.responseStatus,
        createdAt: r.createdAt,
        data: r.data,
      })),
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
