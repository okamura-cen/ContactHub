import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin'

/** GET /api/admin/agencies/[agencyId] - 代理店詳細（クライアント・フォーム一覧含む） */
export async function GET(_req: NextRequest, { params }: { params: { agencyId: string } }) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const agency = await prisma.user.findUnique({
    where: { id: params.agencyId, role: 'AGENCY' },
    select: { id: true, email: true, name: true, createdAt: true },
  })
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  // クライアント一覧
  const agencyClients = await prisma.agencyClient.findMany({
    where: { agencyId: params.agencyId },
    include: {
      client: { select: { id: true, email: true, name: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // フォーム一覧（担当クライアント情報つき）
  const forms = await prisma.form.findMany({
    where: { userId: params.agencyId },
    select: {
      id: true,
      title: true,
      status: true,
      licenseStatus: true,
      licenseExpiresAt: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { id: true, email: true, name: true } },
      _count: { select: { responses: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    agency,
    clients: agencyClients.map((ac) => ({
      relationId: ac.id,
      logoUrl: ac.logoUrl,
      joinedAt: ac.createdAt,
      ...ac.client,
    })),
    forms,
  })
}
