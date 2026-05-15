import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin'
import { UserRole } from '@prisma/client'
import { accountUpdateSchema, updateUserAccount } from '@/lib/account-update'
import { logAudit } from '@/lib/audit'

const adminUpdateSchema = accountUpdateSchema.extend({
  role: z.nativeEnum(UserRole).optional(),
})

/** PATCH /api/admin/users/[userId] - 名前・メール・パスワード・ロール更新 */
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const admin = await requireSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = adminUpdateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? '入力エラー' }, { status: 400 })
  }
  const { role, ...accountInput } = parsed.data

  const target = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // 自分自身のロール変更は不可（ロックアウト防止）
  if (role !== undefined && target.id === admin.id && role !== target.role) {
    return NextResponse.json({ error: '自分自身のロールは変更できません' }, { status: 400 })
  }

  try {
    let resultUser = target
    let warning: string | undefined

    // 1. name/email/password を先に処理（Clerk 反映含む。失敗時は throw されて catch へ）
    if (accountInput.name !== undefined || accountInput.email !== undefined || accountInput.password !== undefined) {
      const result = await updateUserAccount(target, accountInput, admin, req)
      resultUser = result.user
      warning = result.emailWarning ?? undefined
    }

    // 2. ロール更新（DB のみ・Clerk 非関与）。同値ならスキップ
    if (role !== undefined && role !== target.role) {
      resultUser = await prisma.user.update({ where: { id: target.id }, data: { role } })
      await logAudit(req, admin.id, {
        action: 'ACCOUNT_UPDATED',
        resource: 'user',
        resourceId: target.id,
        detail: { changedFields: ['role'], oldRole: target.role, newRole: role },
      })
    }

    return NextResponse.json({ user: resultUser, warning })
  } catch (error: unknown) {
    console.error('PATCH /api/admin/users/[userId] error:', error)
    const clerkError = error as { errors?: { message: string }[] }
    const message = clerkError?.errors?.[0]?.message || 'ユーザーの更新に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
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
    const ownedForms = await tx.form.findMany({
      where: { userId: params.userId },
      select: { id: true },
    })
    const formIds = ownedForms.map((f) => f.id)

    if (formIds.length > 0) {
      await tx.response.deleteMany({ where: { formId: { in: formIds } } })
      await tx.formEvent.deleteMany({ where: { formId: { in: formIds } } })
      const steps = await tx.step.findMany({ where: { formId: { in: formIds } }, select: { id: true } })
      await tx.field.deleteMany({ where: { stepId: { in: steps.map((s) => s.id) } } })
      await tx.step.deleteMany({ where: { formId: { in: formIds } } })
      await tx.form.deleteMany({ where: { id: { in: formIds } } })
    }

    await tx.form.updateMany({
      where: { clientId: params.userId },
      data: { clientId: null },
    })

    await tx.agencyClient.deleteMany({
      where: { OR: [{ agencyId: params.userId }, { clientId: params.userId }] },
    })

    await tx.invitation.deleteMany({ where: { agencyId: params.userId } })

    await tx.user.delete({ where: { id: params.userId } })
  })

  return NextResponse.json({ ok: true })
}
