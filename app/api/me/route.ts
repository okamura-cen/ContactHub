import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** GET /api/me - 現在のユーザー情報 */
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, email: true, name: true, role: true, plan: true, logoUrl: true },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // CLIENTの場合は担当代理店情報とロゴも返す
  let agencyInfo = null
  if (user.role === 'CLIENT') {
    const rel = await prisma.agencyClient.findFirst({
      where: { clientId: user.id },
      include: {
        agency: { select: { id: true, name: true, email: true, logoUrl: true } },
      },
    })
    if (rel) {
      agencyInfo = {
        name: rel.agency.name || rel.agency.email,
        email: rel.agency.email,
        // AgencyClient 個別のロゴがあればそちら優先、なければ代理店のロゴ
        logoUrl: rel.logoUrl || rel.agency.logoUrl,
      }
    }
  }

  return NextResponse.json({ ...user, agencyInfo })
}
