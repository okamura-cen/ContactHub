import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** GET /api/responses - 全フォームの送信データを横断取得 */
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const formId = searchParams.get('formId') // 絞り込み用
    const status = searchParams.get('status')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // CLIENTは割り当てられたフォーム、AGENCYは自分が所有するフォーム
    const formWhere = user.role === 'CLIENT'
      ? { clientId: user.id }
      : { userId: user.id }

    const forms = await prisma.form.findMany({
      where: formWhere,
      select: { id: true, title: true },
    })
    const formIds = forms.map((f) => f.id)
    const formMap = Object.fromEntries(forms.map((f) => [f.id, f.title]))

    // 絞り込み条件
    const where: Record<string, unknown> = {
      formId: formId ? formId : { in: formIds },
    }
    if (status) where.responseStatus = status
    if (unreadOnly) where.isRead = false

    const responses = await prisma.response.findMany({
      where,
      include: {
        form: { select: { title: true, steps: { include: { fields: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ responses, forms, formMap })
  } catch (error) {
    console.error('GET /api/responses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
