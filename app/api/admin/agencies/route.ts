import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin'

/** GET /api/admin/agencies - 代理店一覧（AGENCY ロールのユーザー＋統計） */
export async function GET() {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const agencies = await prisma.user.findMany({
    where: { role: 'AGENCY' },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          agencyClients: true,
          forms: true,
        },
      },
    },
  })

  // アクティブライセンス数を別途集計
  const agencyIds = agencies.map((a) => a.id)
  const activeCounts = await prisma.form.groupBy({
    by: ['userId'],
    where: {
      userId: { in: agencyIds },
      licenseStatus: 'ACTIVE',
    },
    _count: { id: true },
  })
  const activeMap: Record<string, number> = {}
  for (const row of activeCounts) {
    activeMap[row.userId] = row._count.id
  }

  const result = agencies.map((a) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    createdAt: a.createdAt,
    clientCount: a._count.agencyClients,
    formCount: a._count.forms,
    activeLicenses: activeMap[a.id] ?? 0,
  }))

  return NextResponse.json(result)
}
