import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency, agencyHasClient } from '@/lib/access'
import { logAudit } from '@/lib/audit'

/** PATCH /api/agency/clients/[clientId] - ロゴURLなどを更新 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const hasClient = await agencyHasClient(agency.id, params.clientId)
  if (!hasClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { logoUrl } = body

  const relation = await prisma.agencyClient.update({
    where: { agencyId_clientId: { agencyId: agency.id, clientId: params.clientId } },
    data: { ...(logoUrl !== undefined ? { logoUrl } : {}) },
  })

  return NextResponse.json(relation)
}

/** DELETE /api/agency/clients/[clientId] - クライアントとの紐付け解除 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const hasClient = await agencyHasClient(agency.id, params.clientId)
  if (!hasClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 担当フォームがあれば割り当てを外す
  await prisma.form.updateMany({
    where: { userId: agency.id, clientId: params.clientId },
    data: { clientId: null },
  })

  await prisma.agencyClient.delete({
    where: { agencyId_clientId: { agencyId: agency.id, clientId: params.clientId } },
  })

  logAudit(_req, agency.id, { action: 'CLIENT_REMOVED', resource: 'client', resourceId: params.clientId })

  return NextResponse.json({ ok: true })
}
