import { clerkClient } from '@clerk/nextjs/server'
import { Resend } from 'resend'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import type { User } from '@prisma/client'

const resend = new Resend(process.env.RESEND_API_KEY)

/** API リクエストボディ向けの zod スキーマ。
 *  - name: 空文字は null と同義
 *  - email: 形式チェック
 *  - password: 8〜72 文字（Clerk の制約に合わせる）
 *  指定された項目だけが更新される部分更新セマンティクス。 */
export const accountUpdateSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  email: z.string().email('メールアドレスの形式が正しくありません').optional(),
  password: z
    .string()
    .min(8, 'パスワードは 8 文字以上にしてください')
    .max(72, 'パスワードは 72 文字以下にしてください')
    .optional(),
})

export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>

export interface AccountUpdateResult {
  user: User
  passwordChanged: boolean
  emailChanged: boolean
  /** 通知メールの送信が試行され、失敗した場合のメッセージ。成功時は null。 */
  emailWarning: string | null
}

/** Clerk のユーザーにメールアドレスを追加 → primary に設定 → 旧 email を削除。
 *  Clerk v6 SDK の挙動に従う。失敗時は throw。 */
async function changeClerkEmail(clerkId: string, newEmail: string): Promise<void> {
  const clerk = await clerkClient()
  const created = await clerk.emailAddresses.createEmailAddress({
    userId: clerkId,
    emailAddress: newEmail,
    primary: true,
    verified: true,
  })
  // 旧 emailAddress（new 以外）を削除
  const user = await clerk.users.getUser(clerkId)
  for (const e of user.emailAddresses) {
    if (e.id !== created.id) {
      await clerk.emailAddresses.deleteEmailAddress(e.id)
    }
  }
}

/** パスワード変更通知メールを送信する。失敗してもエラーは投げず、警告メッセージを返す。 */
async function sendPasswordChangedEmail(
  toEmail: string,
  name: string | null,
  newPassword: string,
): Promise<string | null> {
  try {
    await resend.emails.send({
      from: 'ContactHub <noreply@contact-hub.app>',
      to: toEmail,
      subject: 'ContactHub パスワード変更のお知らせ',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#333">パスワードが変更されました</h2>
          <p>${name ? `${name} 様、` : ''}ContactHub のパスワードが変更されました。</p>
          <p>以下の情報でログインしてください。</p>
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>メールアドレス：</strong>${toEmail}</p>
            <p style="margin:4px 0;"><strong>新しいパスワード：</strong>${newPassword}</p>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/sign-in"
               style="display:inline-block;background:#c49a6c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
              ログインする
            </a>
          </p>
          <p style="color:#999;font-size:12px;margin-top:24px;">
            ログイン後、パスワードは設定画面から変更できます。<br>
            このメールに心当たりがない場合は、ご担当者にお問い合わせください。
          </p>
        </div>
      `,
    })
    return null
  } catch (e) {
    console.error('Password change email failed:', e)
    return 'パスワード通知メールの送信に失敗しました'
  }
}

/**
 * 認可済み前提の共通アカウント更新処理。
 * - 部分更新（指定項目のみ処理）。空文字 email/password は「未指定」扱い。
 * - 順序: 入力サニタイズ → Clerk 反映 → DB 反映 → 通知メール → 監査ログ
 * - Clerk が失敗したら DB は触らず例外を投げる
 */
export async function updateUserAccount(
  target: User,
  rawInput: AccountUpdateInput,
  actor: User,
  req: NextRequest,
): Promise<AccountUpdateResult> {
  // 1. サニタイズ
  const trimmedName =
    rawInput.name === undefined
      ? undefined
      : rawInput.name === null
        ? null
        : rawInput.name.trim() === ''
          ? null
          : rawInput.name.trim()
  const email = rawInput.email?.trim() && rawInput.email.trim() !== target.email ? rawInput.email.trim() : undefined
  const password = rawInput.password && rawInput.password.length > 0 ? rawInput.password : undefined

  const changedFields: string[] = []

  // 2. Clerk 反映
  if (email !== undefined) {
    await changeClerkEmail(target.clerkId, email)
    changedFields.push('email')
  }
  if (password !== undefined) {
    const clerk = await clerkClient()
    await clerk.users.updateUser(target.clerkId, { password })
    changedFields.push('password')
  }

  // 3. DB 反映
  const dbUpdate: { name?: string | null; email?: string } = {}
  if (trimmedName !== undefined) {
    dbUpdate.name = trimmedName
    if (trimmedName !== target.name) changedFields.push('name')
  }
  if (email !== undefined) dbUpdate.email = email

  let updatedUser = target
  if (Object.keys(dbUpdate).length > 0) {
    updatedUser = await prisma.user.update({ where: { id: target.id }, data: dbUpdate })
  }

  // 4. 通知メール（パスワード変更時のみ）
  let emailWarning: string | null = null
  if (password !== undefined) {
    emailWarning = await sendPasswordChangedEmail(
      email ?? updatedUser.email,
      updatedUser.name,
      password,
    )
  }

  // 5. 監査ログ
  if (changedFields.length > 0) {
    await logAudit(req, actor.id, {
      action: 'ACCOUNT_UPDATED',
      resource: 'user',
      resourceId: target.id,
      detail: { changedFields },
    })
  }

  return {
    user: updatedUser,
    passwordChanged: password !== undefined,
    emailChanged: email !== undefined,
    emailWarning,
  }
}
