import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency, agencyHasClient } from '@/lib/access'

/** GET /api/agency/forms?clientId=xxx - 代理店のフォーム一覧（クライアント絞り込み対応） */
export async function GET(req: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')

  // clientId指定の場合は担当確認
  if (clientId) {
    const hasClient = await agencyHasClient(agency.id, clientId)
    if (!hasClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const forms = await prisma.form.findMany({
    where: {
      userId: agency.id,
      ...(clientId ? { clientId } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      licenseStatus: true,
      licenseExpiresAt: true,
      clientId: true,
      client: { select: { id: true, name: true, email: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(forms)
}
