import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

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

    // フォームの所有権チェック
    const form = await prisma.form.findFirst({
      where: { id: formId, userId: user.id },
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

    return NextResponse.json({
      form,
      responses,
    })
  } catch (error) {
    console.error('GET /api/forms/[formId]/responses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
