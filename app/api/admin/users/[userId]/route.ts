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

  // Clerk からユーザー削除
  try {
    const client = await clerkClient()
    await client.users.deleteUser(user.clerkId)
  } catch {
    // Clerk に存在しない場合でも DB 削除は続行
  }

  // 関連データを順番に削除してからユーザーを削除
  await prisma.$transaction(async (tx) => {
    // ユーザーが所有するフォームの送信データ・イベント・ステップ・フィールドを削除
    const ownedForms = await tx.form.findMany({
      where: { userId: params.userId },
      select: { id: true },
    })
    const formIds = ownedForms.map((f) => f.id)

    if (formIds.length > 0) {
      await tx.response.deleteMany({ where: { formId: { in: formIds } } })
      await tx.formEvent.deleteMany({ where: { formId: { in: formIds } } })
      // Field は Step に cascade するが念のため
      const steps = await tx.step.findMany({ where: { formId: { in: formIds } }, select: { id: true } })
      await tx.field.deleteMany({ where: { stepId: { in: steps.map((s) => s.id) } } })
      await tx.step.deleteMany({ where: { formId: { in: formIds } } })
      await tx.form.deleteMany({ where: { id: { in: formIds } } })
    }

    // クライアントとして割り当てられたフォームの clientId をクリア
    await tx.form.updateMany({
      where: { clientId: params.userId },
      data: { clientId: null },
    })

    // 代理店-クライアント紐付けを削除
    await tx.agencyClient.deleteMany({
      where: { OR: [{ agencyId: params.userId }, { clientId: params.userId }] },
    })

    // 招待を削除
    await tx.invitation.deleteMany({ where: { agencyId: params.userId } })

    // 監査ログは残す（userId は文字列参照のみ、外部キーなし）

    // ユーザー本体を削除
    await tx.user.delete({ where: { id: params.userId } })
  })

  return NextResponse.json({ ok: true })
}
