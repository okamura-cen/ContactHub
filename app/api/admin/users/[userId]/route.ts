import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin'
import { UserRole, Plan } from '@prisma/client'

/** PATCH /api/admin/users/[userId] - ロール・プラン更新 */
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { role, plan } = body

  const user = await prisma.user.update({
    where: { id: params.userId },
    data: {
      ...(role ? { role: role as UserRole } : {}),
      ...(plan ? { plan: plan as Plan } : {}),
    },
  })

  return NextResponse.json(user)
}

/** DELETE /api/admin/users/[userId] - ユーザー削除 */
export async function DELETE(_req: NextRequest, { params }: { params: { userId: string } }) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // 自分自身は削除不可
  if (user.id === admin.id) {
    return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 })
  }

  // ClerkからもユーザーDeleteしてDBは cascade
  try {
    const client = await clerkClient()
    await client.users.deleteUser(user.clerkId)
  } catch {
    // Clerkに存在しない場合でもDB削除は続行
  }

  await prisma.user.delete({ where: { id: params.userId } })

  return NextResponse.json({ ok: true })
}
