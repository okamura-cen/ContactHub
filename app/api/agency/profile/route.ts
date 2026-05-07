import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/** PATCH /api/agency/profile - 代理店プロフィール更新（名前・ロゴ） */
export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user || (user.role !== 'AGENCY' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const data: { name?: string; logoUrl?: string | null } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: '名前を入力してください' }, { status: 400 })
    }
    data.name = body.name.trim()
  }

  if (body.logoUrl !== undefined) {
    data.logoUrl = body.logoUrl || null
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, role: true, logoUrl: true, createdAt: true },
  })

  return NextResponse.json(updated)
}
