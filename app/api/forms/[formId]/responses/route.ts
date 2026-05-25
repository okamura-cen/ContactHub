import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { canAccessForm } from '@/lib/access'

/** GET /api/forms/:formId/responses - フォームの送信データ一覧 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { formId } = await params
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // アクセス権チェック (AGENCY/SUPER_ADMIN owner または CLIENT/CLIENT_EDITOR 担当)
    if (!(await canAccessForm(user, formId))) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        steps: {
          include: { fields: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    })
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const responses = await prisma.response.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    })

    logAudit(_req, user.id, { action: 'RESPONSE_LIST_VIEWED', resource: 'form', resourceId: formId })

    return NextResponse.json({
      form,
      responses,
    })
  } catch (error) {
    console.error('GET /api/forms/[formId]/responses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
