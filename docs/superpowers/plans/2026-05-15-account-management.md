# アカウント管理機能 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者は全ユーザー、代理店は担当クライアントに対して、名前・メール・パスワードを変更できるようにする。

**Architecture:** ロール別に API エンドポイントを分け（認可境界を URL で担保）、共通の Clerk/DB/メール/監査ログ処理を `lib/account-update.ts` にヘルパーとして集約する。UI は管理者画面の既存編集モーダルを拡張し、代理店画面ではクライアント詳細ページに「アカウント設定」カードを新設する。

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma (PostgreSQL), Clerk (`@clerk/nextjs@^6`), Resend, zod, Tailwind

**設計書:** [docs/superpowers/specs/2026-05-15-account-management-design.md](../specs/2026-05-15-account-management-design.md)

**テスト方針:** 本プロジェクトには自動テスト基盤がないため、各タスクは「実装 → `npm run build` で型/ビルド確認 → `npm run lint` 通過 → コミット」とし、最終タスクで手動 QA チェックリストを実行する（設計書 §7 に従う）。

---

## ファイル構造

### 新規作成

- `lib/account-update.ts` — 共通アカウント更新ヘルパー（zod スキーマ含む）と通知メール送信
- `app/api/agency/clients/[clientId]/account/route.ts` — 代理店向け PATCH エンドポイント

### 変更

- `app/api/admin/users/[userId]/route.ts` — PATCH に name/email/password 対応を追加（既存の role 更新は維持）
- `app/(admin)/admin/users/page.tsx` — 編集モーダルに email/password 欄追加、自己編集時のロール disable
- `app/(dashboard)/clients/[clientId]/page.tsx` — 「アカウント設定」カードを新設

---

## Task 1: 共通アカウント更新ヘルパーを新設する

**Files:**
- Create: `lib/account-update.ts`

**狙い:** Clerk 更新 → DB 更新 → 通知メール送信 → 監査ログの一連の処理を 1 箇所に集約する。認可は呼び出し元 API で済ませる前提とし、本ヘルパーは認可ロジックを持たない。

- [ ] **Step 1: ファイル新規作成**

`lib/account-update.ts` を以下の内容で作成する：

```ts
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
```

- [ ] **Step 2: 型/ビルドチェック**

Run: `npm run build`
Expected: TypeScript エラー 0 でビルド成功。

問題があれば修正（Clerk SDK の関数シグネチャ齟齬など）してから次へ。

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 4: Commit**

```bash
git add lib/account-update.ts
git commit -m "feat: 共通アカウント更新ヘルパー lib/account-update.ts を追加"
```

---

## Task 2: 管理者向け PATCH エンドポイントを拡張する

**Files:**
- Modify: `app/api/admin/users/[userId]/route.ts`

**狙い:** 既存の name/role 更新に加えて、email/password 更新を受け付ける。共通ヘルパーを呼び出し、自己ロール変更だけは禁止する。

- [ ] **Step 1: ファイル全体を以下に書き換え**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin'
import { UserRole } from '@prisma/client'
import { accountUpdateSchema, updateUserAccount } from '@/lib/account-update'

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
  if (role !== undefined && target.id === admin.id && role !== admin.role) {
    return NextResponse.json({ error: '自分自身のロールは変更できません' }, { status: 400 })
  }

  try {
    // ロールは DB のみ更新（Clerk は関与しない）
    if (role !== undefined) {
      await prisma.user.update({ where: { id: target.id }, data: { role } })
    }

    // name/email/password はヘルパーに委譲
    if (Object.values(accountInput).some((v) => v !== undefined)) {
      const result = await updateUserAccount(target, accountInput, admin, req)
      return NextResponse.json({ user: result.user, warning: result.emailWarning ?? undefined })
    }

    const updated = await prisma.user.findUnique({ where: { id: target.id } })
    return NextResponse.json({ user: updated })
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
```

> 注: 既存の DELETE ハンドラの本文はそのまま残している。PATCH のみを書き換える。

- [ ] **Step 2: 型/ビルドチェック**

Run: `npm run build`
Expected: TypeScript エラー 0 でビルド成功。

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/users/[userId]/route.ts
git commit -m "feat: 管理者向けPATCH APIに email/password 更新と自己ロック防止を追加"
```

---

## Task 3: 代理店向け新規 PATCH エンドポイントを追加する

**Files:**
- Create: `app/api/agency/clients/[clientId]/account/route.ts`

**狙い:** 代理店が担当クライアント（CLIENT ロール）の名前・メール・パスワードを変更できるエンドポイントを新設する。

- [ ] **Step 1: ディレクトリとファイル新規作成**

```bash
mkdir -p "app/api/agency/clients/[clientId]/account"
```

`app/api/agency/clients/[clientId]/account/route.ts` を以下の内容で作成する：

```ts
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
```

- [ ] **Step 2: 型/ビルドチェック**

Run: `npm run build`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 4: Commit**

```bash
git add app/api/agency/clients/[clientId]/account/route.ts
git commit -m "feat: 代理店向けアカウント更新APIを追加"
```

---

## Task 4: 管理者ユーザー編集モーダルを拡張する

**Files:**
- Modify: `app/(admin)/admin/users/page.tsx`

**狙い:** モーダルにメール・パスワード欄を追加し、保存時に部分更新リクエストを送る。自己編集時はロール変更を disable。

- [ ] **Step 1: 既存ファイルを以下のように修正**

ファイル全体を以下に書き換える（基本構造は維持し、編集 state と handler、モーダル UI を拡張する）：

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { UserPlus, Trash2, Pencil } from 'lucide-react'

const ROLE_LABELS = { SUPER_ADMIN: 'スーパーアドミン', AGENCY: '代理店', CLIENT: 'クライアント' } as const

type Role = keyof typeof ROLE_LABELS

interface User {
  id: string
  clerkId: string
  email: string
  name: string | null
  role: Role
  createdAt: string
  _count: { forms: number }
}

interface MeResponse {
  id: string
}

const emptyForm = { name: '', email: '', password: '', role: 'CLIENT' as Role }

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'CLIENT' as Role })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [usersRes, meRes] = await Promise.all([fetch('/api/admin/users'), fetch('/api/me')])
    if (usersRes.ok) setUsers(await usersRes.json())
    if (meRes.ok) {
      const me = (await meRes.json()) as MeResponse
      setMeId(me.id)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast({ title: 'メールアドレスとパスワードは必須です', variant: 'destructive' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'ユーザーを作成しました', variant: 'success' })
      setShowCreate(false)
      setForm(emptyForm)
      load()
    } else {
      const { error } = await res.json()
      toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    if (editForm.password && editForm.password.length < 8) {
      toast({ title: 'パスワードは 8 文字以上にしてください', variant: 'destructive' })
      return
    }
    // 部分更新ボディを組み立て
    const body: Record<string, unknown> = {}
    if (editForm.name !== (editTarget.name ?? '')) body.name = editForm.name
    if (editForm.email !== editTarget.email) body.email = editForm.email
    if (editForm.password) body.password = editForm.password
    if (editForm.role !== editTarget.role && editTarget.id !== meId) body.role = editForm.role

    if (Object.keys(body).length === 0) {
      toast({ title: '変更がありません', variant: 'destructive' })
      return
    }

    setSaving(true)
    const res = await fetch(`/api/admin/users/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      const parts: string[] = []
      if ('name' in body) parts.push('名前')
      if ('email' in body) parts.push('メール')
      if ('password' in body) parts.push('パスワード（通知メール送信）')
      if ('role' in body) parts.push('ロール')
      toast({ title: `更新しました: ${parts.join('、')}`, variant: 'success' })
      if (data.warning) {
        toast({ title: data.warning, variant: 'destructive' })
      }
      setEditTarget(null)
      load()
    } else {
      const { error } = await res.json()
      toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`${user.email} を削除しますか？この操作は元に戻せません。`)) return
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: '削除しました', variant: 'success' })
      load()
    } else {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    }
  }

  const isSelf = editTarget?.id === meId

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{users.length}名のユーザー</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setForm(emptyForm) }}>
          <UserPlus size={16} className="mr-2" />
          ユーザーを作成
        </Button>
      </div>

      {/* 新規作成フォーム（既存どおり） */}
      {showCreate && (
        <Card className="mb-6 border-[hsl(var(--primary)/0.3)]">
          <CardHeader><CardTitle className="text-base">新規ユーザー作成</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">名前</label>
                <Input placeholder="山田 太郎" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メールアドレス *</label>
                <Input type="email" placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">パスワード *</label>
                <Input type="password" placeholder="8文字以上" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">ロール</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreate} disabled={saving}>{saving ? '作成中...' : '作成する'}</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ユーザー一覧（既存どおり） */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  <th className="text-left p-3 font-medium">名前 / メール</th>
                  <th className="text-left p-3 font-medium">ロール</th>
                  <th className="text-left p-3 font-medium">フォーム数</th>
                  <th className="text-left p-3 font-medium">作成日</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
                    <td className="p-3">
                      <p className="font-medium">{u.name || '(名前なし)'}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</p>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'AGENCY' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{u._count.forms}件</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => {
                            setEditTarget(u)
                            setEditForm({ name: u.name ?? '', email: u.email, password: '', role: u.role })
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-[hsl(var(--destructive))]"
                          onClick={() => handleDelete(u)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* 編集モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[hsl(var(--card))] rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-base font-bold mb-1">ユーザー編集</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">現在のメール: {editTarget.email}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">名前</label>
                <Input
                  placeholder="山田 太郎"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メールアドレス</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">新パスワード（空欄なら変更しない）</label>
                <Input
                  type="password"
                  placeholder="8文字以上"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  入力した場合、新パスワードを記載した通知メールが本人に届きます。
                </p>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">ロール</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  disabled={isSelf}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm disabled:opacity-50"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {isSelf && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    ※ 自分自身のロールは変更できません（ロックアウト防止）。
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleEdit} disabled={saving}>{saving ? '保存中...' : '保存する'}</Button>
              <Button variant="outline" onClick={() => setEditTarget(null)}>キャンセル</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

> 注: 自己判定のため `/api/me` でログインユーザー情報を取得している。`/api/me` は既に存在し `{ id, email, name, role, ... }` を返すことを確認済み。

- [ ] **Step 2: 型/ビルドチェック**

Run: `npm run build`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/admin/users/page.tsx"
git commit -m "feat: 管理者ユーザー編集モーダルにメール/パスワード欄を追加"
```

---

## Task 5: クライアント詳細ページに「アカウント設定」カードを追加する

**Files:**
- Modify: `app/(dashboard)/clients/[clientId]/page.tsx`

**狙い:** 代理店がクライアント詳細ページで名前・メール・パスワードを変更できる UI を追加する。

- [ ] **Step 1: 既存ファイルを修正（差分パターン）**

import 行は既存のまま変更しない（追加アイコンは使わない）。

次に、コンポーネント内の state 定義箇所（`const [assigning, setAssigning] = useState(false)` の直後）に以下を追加：

```tsx
  // アカウント設定
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '' })
  const [savingAccount, setSavingAccount] = useState(false)
```

`load` 関数の中、`setRelation(found)` の直後に以下を追加：

```tsx
        setAccountForm({ name: found.client.name ?? '', email: found.client.email, password: '' })
```

`handleSaveLogo` 関数の直後に以下のハンドラを追加：

```tsx
  const handleSaveAccount = async () => {
    if (!relation) return
    if (accountForm.password && accountForm.password.length < 8) {
      toast({ title: 'パスワードは 8 文字以上にしてください', variant: 'destructive' })
      return
    }
    const body: Record<string, unknown> = {}
    if (accountForm.name !== (relation.client.name ?? '')) body.name = accountForm.name
    if (accountForm.email !== relation.client.email) body.email = accountForm.email
    if (accountForm.password) body.password = accountForm.password

    if (Object.keys(body).length === 0) {
      toast({ title: '変更がありません', variant: 'destructive' })
      return
    }

    setSavingAccount(true)
    const res = await fetch(`/api/agency/clients/${clientId}/account`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSavingAccount(false)
    if (res.ok) {
      const data = await res.json()
      const parts: string[] = []
      if ('name' in body) parts.push('名前')
      if ('email' in body) parts.push('メール')
      if ('password' in body) parts.push('パスワード（通知メール送信）')
      toast({ title: `更新しました: ${parts.join('、')}`, variant: 'success' })
      if (data.warning) {
        toast({ title: data.warning, variant: 'destructive' })
      }
      setAccountForm({ ...accountForm, password: '' })
      load()
    } else {
      const { error } = await res.json()
      toast({ title: error || 'エラーが発生しました', variant: 'destructive' })
    }
  }
```

最後に、JSX 内の「フォーム一覧」`<Card>` の **直前** に以下のカードを挿入する（既存の `<Card>` の前、`{/* フォーム一覧 */}` コメントの上）：

```tsx
      {/* アカウント設定 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pencil size={16} />
            アカウント設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            クライアントの名前・メール・パスワードを変更できます。現在のメール: {client.email}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">名前</label>
              <Input
                placeholder="株式会社○○"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メールアドレス</label>
              <Input
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">新パスワード（空欄なら変更しない）</label>
              <Input
                type="password"
                placeholder="8文字以上"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            パスワード変更時は、新パスワードを記載した通知メールがクライアントに自動送信されます。
          </p>
          <div>
            <Button onClick={handleSaveAccount} disabled={savingAccount}>
              {savingAccount ? '保存中...' : '変更を保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
```

- [ ] **Step 2: 型/ビルドチェック**

Run: `npm run build`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/clients/[clientId]/page.tsx"
git commit -m "feat: クライアント詳細ページにアカウント設定カードを追加"
```

---

## Task 6: 手動 QA を実施する

**狙い:** 設計書 §7 のチェックリストを実機で実行する。発見されたバグは個別タスクとして次に修正する。

- [ ] **Step 1: ローカル起動**

Run: `npm run dev`
Expected: `http://localhost:3000` で起動する。

別ターミナルで以下を順次確認する。

- [ ] **Step 2: 管理者編チェック**

`SUPER_ADMIN` でログインし、`/admin/users` を開く。

- [ ] 任意ユーザー（自分以外）の編集モーダルを開き、**名前のみ** 変更 → 保存 → 一覧に反映されている。メールは届かない。
- [ ] 同ユーザーの **メールのみ** 変更 → 保存 → 一覧に新メールが表示、Clerk ダッシュボード（または該当ユーザーで sign-out → 新メールで sign-in）でも反映確認。
- [ ] 同ユーザーの **パスワードのみ** 変更（8文字以上） → 保存 → 通知メールがそのメールアドレスに届く。新パスワードでログインできる。
- [ ] 同ユーザーの **ロール** 変更（既存挙動） → ロールが切り替わる。
- [ ] **自分自身** の編集モーダルを開く → ロール選択が disable で「ロックアウト防止」ヒントが表示される。
- [ ] 自分自身の **名前 / メール / パスワード** は変更できる。
- [ ] 既存ユーザーと **重複するメール** に変更 → 400 と Clerk のエラーメッセージ。
- [ ] **7 文字のパスワード** で保存 → 400 と「パスワードは 8 文字以上にしてください」。

- [ ] **Step 3: 代理店編チェック**

`AGENCY` でログインし、`/clients` を開いてクライアント詳細へ。

- [ ] 自分が担当するクライアントの **名前 / メール / パスワード** をそれぞれ単独で変更し、各ケースで成功すること。
- [ ] パスワード変更時、クライアントのメールアドレスに通知メールが届く。
- [ ] 担当外クライアント ID を URL に直接入れた `PATCH /api/agency/clients/<他社>/account` を `curl` などで叩く → 404。

```bash
curl -X PATCH http://localhost:3000/api/agency/clients/<他社clientId>/account \
  -H "Content-Type: application/json" \
  -H "Cookie: <代理店のセッションcookie>" \
  -d '{"name":"x"}'
```

- [ ] 対象が CLIENT ロール以外（例: 他の AGENCY の id）を直叩き → 403。
- [ ] CLIENT ロールのユーザー本人セッションで同 API を叩く → 403。

- [ ] **Step 4: 監査ログ確認**

`SUPER_ADMIN` で `/admin/audit` を開き、上で行った変更が以下の形で記録されていることを確認：

- `action = ACCOUNT_UPDATED`
- `resource = user`
- `resourceId = 変更対象のユーザーid`
- `detail.changedFields` に `'name' | 'email' | 'password'` のうち変更した項目だけが入っている
- パスワード値そのものは記録されていない

- [ ] **Step 5: 最終ビルド確認**

Run: `npm run build && npm run lint`
Expected: 両方ともエラー 0。

- [ ] **Step 6: 未コミット変更の有無確認**

Run: `git status`
Expected: clean。あればコミットしてからプラン完了とする。

---

## 完了条件

- 上記 6 タスクすべての完了
- Task 6 のチェックリストで発見された不具合がすべて解消されていること
- `npm run build` / `npm run lint` がエラーなく通る
- main ブランチへ PR を出せる状態
