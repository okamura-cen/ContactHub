import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency, agencyHasClient } from '@/lib/access'
import { accountUpdateSchema, updateUserAccount } from '@/lib/account-update'
import { clientRoleSchema } from '@/lib/validations/role'
import { logAudit } from '@/lib/audit'

const agencyClientAccountSchema = accountUpdateSchema.extend({
  role: clientRoleSchema.optional(),
})

/** PATCH /api/agency/clients/[clientId]/account - 担当クライアントの名前/メール/パスワード/ロール更新 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } },
) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 担当関係チェック
  const hasClient = await agencyHasClient(agency.id, params.clientId)
  if (!hasClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 対象ユーザー取得＆ CLIENT/CLIENT_EDITOR ロール検証
  const target = await prisma.user.findUnique({ where: { id: params.clientId } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role !== 'CLIENT' && target.role !== 'CLIENT_EDITOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = agencyClientAccountSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? '入力エラー' }, { status: 400 })
  }
  const { role, ...accountInput } = parsed.data

  try {
    let resultUser = target
    let warning: string | undefined

    // 1. name/email/password を先に処理 (Clerk 反映含む)
    if (accountInput.name !== undefined || accountInput.email !== undefined || accountInput.password !== undefined) {
      const result = await updateUserAccount(target, accountInput, agency, req)
      resultUser = result.user
      warning = result.emailWarning ?? undefined
    }

    // 2. ロール変更 (同値ならスキップ)
    if (role !== undefined && role !== target.role) {
      resultUser = await prisma.user.update({ where: { id: target.id }, data: { role } })
      await logAudit(req, agency.id, {
        action: 'ACCOUNT_UPDATED',
        resource: 'user',
        resourceId: target.id,
        detail: { changedFields: ['role'], oldRole: target.role, newRole: role },
      })
    }

    return NextResponse.json({ user: resultUser, warning })
  } catch (error: unknown) {
    console.error('PATCH /api/agency/clients/[clientId]/account error:', error)
    const clerkError = error as { errors?: { message: string }[] }
    const message = clerkError?.errors?.[0]?.message || 'クライアントの更新に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
