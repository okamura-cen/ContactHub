import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgency, agencyHasClient } from '@/lib/access'
import { accountUpdateSchema, updateUserAccount } from '@/lib/account-update'

/** PATCH /api/agency/clients/[clientId]/account - 担当クライアントの名前/メール/パスワード更新 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } },
) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 担当関係チェック
  const hasClient = await agencyHasClient(agency.id, params.clientId)
  if (!hasClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 対象ユーザー取得＆ CLIENT ロール検証（他の AGENCY や SUPER_ADMIN を編集できないようにする）
  const target = await prisma.user.findUnique({ where: { id: params.clientId } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = accountUpdateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? '入力エラー' }, { status: 400 })
  }

  try {
    const result = await updateUserAccount(target, parsed.data, agency, req)
    return NextResponse.json({ user: result.user, warning: result.emailWarning ?? undefined })
  } catch (error: unknown) {
    console.error('PATCH /api/agency/clients/[clientId]/account error:', error)
    const clerkError = error as { errors?: { message: string }[] }
    const message = clerkError?.errors?.[0]?.message || 'クライアントの更新に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
