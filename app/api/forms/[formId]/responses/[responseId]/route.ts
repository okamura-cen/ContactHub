import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ResponseStatus } from '@prisma/client'

type Params = { params: Promise<{ formId: string; responseId: string }> }

/** PATCH /api/forms/:formId/responses/:responseId - 既読/未読切り替え */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { formId, responseId } = await params
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const form = await prisma.form.findFirst({
      where: { id: formId, OR: [{ userId: user.id }, { clientId: user.id }] },
    })
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

    const body = await req.json()
    const updateData: { isRead?: boolean; responseStatus?: ResponseStatus; memo?: string } = {}
    if (body.isRead !== undefined) updateData.isRead = body.isRead
    if (body.responseStatus !== undefined) updateData.responseStatus = body.responseStatus as ResponseStatus
    if (body.memo !== undefined) updateData.memo = body.memo

    const updated = await prisma.response.update({
      where: { id: responseId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/forms/[formId]/responses/[responseId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/forms/:formId/responses/:responseId - 送信データを1件削除 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { formId, responseId } = await params
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const form = await prisma.form.findFirst({
      where: { id: formId, OR: [{ userId: user.id }, { clientId: user.id }] },
    })
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

    await prisma.response.delete({ where: { id: responseId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/forms/[formId]/responses/[responseId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
