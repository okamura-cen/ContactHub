import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'

/** 現在のClerkユーザーからDBのUserを取得 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  return prisma.user.findUnique({ where: { clerkId } })
}

/** AGENCYロールのユーザーを取得（違う場合はnull） */
export async function requireAgency(): Promise<User | null> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'AGENCY') return null
  return user
}

/** 代理店が指定クライアントを担当しているか確認 */
export async function agencyHasClient(agencyId: string, clientId: string): Promise<boolean> {
  const rel = await prisma.agencyClient.findUnique({
    where: { agencyId_clientId: { agencyId, clientId } },
  })
  return rel !== null
}

/**
 * フォームへのアクセス権チェック
 * - SUPER_ADMIN: 不可（個人情報保護）
 * - AGENCY: 自分が所有するフォーム
 * - CLIENT: 自分に割り当てられたフォーム
 */
export async function canAccessForm(
  user: User,
  formId: string
): Promise<boolean> {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { userId: true, clientId: true },
  })
  if (!form) return false

  if (user.role === 'AGENCY') return form.userId === user.id
  if (user.role === 'CLIENT') return form.clientId === user.id

  return false
}

/**
 * フォームの編集権チェック
 * - AGENCY: 自分が所有するフォームのみ（デザイン・設定含む全操作）
 * - CLIENT: 自分に割り当てられたフォームの項目追加・編集のみ
 */
export async function canEditForm(
  user: User,
  formId: string
): Promise<{ allowed: boolean; fullAccess: boolean }> {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { userId: true, clientId: true },
  })
  if (!form) return { allowed: false, fullAccess: false }

  if (user.role === 'AGENCY' && form.userId === user.id) {
    return { allowed: true, fullAccess: true }
  }
  if (user.role === 'CLIENT' && form.clientId === user.id) {
    return { allowed: true, fullAccess: false } // 項目編集のみ
  }

  return { allowed: false, fullAccess: false }
}
