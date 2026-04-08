import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency, agencyHasClient } from '@/lib/access'

/** PATCH /api/agency/forms/[formId] - クライアント割り当て変更・タイトル更新など */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { formId: string } }
) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // フォームが代理店のものか確認
  const form = await prisma.form.findFirst({
    where: { id: params.formId, userId: agency.id },
  })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { clientId } = body  // null = 割り当て解除, string = クライアントID

  // clientId指定の場合は担当確認
  if (clientId) {
    const hasClient = await agencyHasClient(agency.id, clientId)
    if (!hasClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.form.update({
    where: { id: params.formId },
    data: { clientId: clientId ?? null },
    select: {
      id: true,
      title: true,
      clientId: true,
      client: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(updated)
}

/** DELETE /api/agency/forms/[formId] - フォーム削除 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { formId: string } }
) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await prisma.form.findFirst({
    where: { id: params.formId, userId: agency.id },
  })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction([
    prisma.response.deleteMany({ where: { formId: params.formId } }),
    prisma.form.delete({ where: { id: params.formId } }),
  ])

  return NextResponse.json({ ok: true })
}
