import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency } from '@/lib/access'

/** GET /api/agency/dashboard - 代理店ダッシュボード集計 */
export async function GET() {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    totalClients,
    totalForms,
    activeForms,
    pendingForms,
    recentClients,
  ] = await Promise.all([
    prisma.agencyClient.count({ where: { agencyId: agency.id } }),
    prisma.form.count({ where: { userId: agency.id } }),
    prisma.form.count({ where: { userId: agency.id, licenseStatus: 'ACTIVE' } }),
    prisma.form.count({ where: { userId: agency.id, licenseStatus: 'PENDING' } }),
    prisma.agencyClient.findMany({
      where: { agencyId: agency.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: { select: { clientForms: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return NextResponse.json({
    totalClients,
    totalForms,
    activeForms,
    pendingForms,
    recentClients,
  })
}
