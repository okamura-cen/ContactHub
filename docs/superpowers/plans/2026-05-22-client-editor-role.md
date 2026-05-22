# CLIENT_EDITOR ロール追加 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クライアントが担当フォームの項目・ステップ・タイトル/説明・公開状態を編集できる新ロール `CLIENT_EDITOR` を追加する。フォーム新規作成・削除・ライセンス購入は引き続き AGENCY/SUPER_ADMIN のみ。

**Architecture:** Prisma の `UserRole` enum に `CLIENT_EDITOR` を追加。認可ロジックは `lib/access.ts` に集約（既存だが未使用の `canEditForm` を活かしつつ `canCreateForm` / `canDeleteForm` / `canPurchaseLicense` を新設）。Form 系 API ハンドラからロール文字列直書きを排し、認可ヘルパー呼び出しに統一する。代理店向け UI/API で CLIENT/CLIENT_EDITOR 選択 + 切替可能にし、管理者画面にもラベル追加。

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma (PostgreSQL), Clerk (`@clerk/nextjs@^6`), Stripe, zod, Tailwind

**設計書:** [docs/superpowers/specs/2026-05-22-client-editor-role-design.md](../specs/2026-05-22-client-editor-role-design.md)

**テスト方針:** 自動テスト基盤がないため、各タスクは「実装 → `npx tsc --noEmit` → コミット」。最終タスクで手動 QA を実施。

---

## ファイル構造

### 新規作成

- `lib/validations/role.ts` — `clientRoleSchema` / `anyRoleSchema` の zod 定義
- `prisma/migrations/<timestamp>_add_client_editor_role/migration.sql` — Prisma migrate で自動生成

### 変更

- `prisma/schema.prisma` — UserRole enum に CLIENT_EDITOR 追加
- `lib/access.ts` — `canAccessForm` / `canEditForm` の更新、`canCreateForm` / `canDeleteForm` / `canPurchaseLicense` の新設
- `app/api/forms/route.ts` — GET の where 切替 (CLIENT_EDITOR 追加)、POST に `canCreateForm` ガード追加
- `app/api/forms/[formId]/route.ts` — GET/PUT/DELETE を認可ヘルパー使用に
- `app/api/agency/clients/route.ts` — POST body に role 受付
- `app/api/agency/clients/[clientId]/account/route.ts` — PATCH body に role 受付、監査ログ
- `app/(dashboard)/clients/page.tsx` — 作成フォームに権限セレクト追加
- `app/(dashboard)/clients/[clientId]/page.tsx` — アカウント設定に権限ドロップダウン追加
- `app/(admin)/admin/users/page.tsx` — ROLE_LABELS + 色分けに CLIENT_EDITOR 追加
- `app/(dashboard)/forms/page.tsx` — 「新規作成」ボタンの可視性切替
- `app/(dashboard)/forms/[formId]/edit/page.tsx` — 編集画面のアクセス権チェック + 「削除」ボタンの可視性切替
- `app/(dashboard)/layout.tsx` — サイドナビ等のロール分岐に CLIENT_EDITOR 反映
- `app/api/dashboard/route.ts`, `app/api/me/route.ts`, `app/api/responses/route.ts` 他 — 必要に応じてロール文字列直書きを修正

---

## Task 1: Prisma スキーマに CLIENT_EDITOR を追加してマイグレーション

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_client_editor_role/migration.sql` (自動生成)

- [ ] **Step 1: schema.prisma を編集**

`prisma/schema.prisma` の `enum UserRole` を以下に変更：

```prisma
enum UserRole {
  SUPER_ADMIN
  AGENCY
  CLIENT
  CLIENT_EDITOR
}
```

- [ ] **Step 2: マイグレーション作成 + 適用 + クライアント生成**

Run: `npx prisma migrate dev --name add_client_editor_role`

Expected: 新しいマイグレーションファイル `prisma/migrations/<timestamp>_add_client_editor_role/migration.sql` が生成され、ローカル DB に適用される。マイグレーションファイルの中身は `ALTER TYPE "UserRole" ADD VALUE 'CLIENT_EDITOR';` 相当。

> 注: ローカル DB が起動していない場合は `prisma migrate dev` がエラーになる。その場合は `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script > prisma/migrations/<timestamp>_add_client_editor_role/migration.sql` で SQL のみ生成し、本番環境では `prisma migrate deploy` で適用する手順を README/引き継ぎに記録する。

- [ ] **Step 3: Prisma クライアント再生成**

Run: `npx prisma generate`
Expected: `node_modules/@prisma/client` の型定義が更新される。`UserRole.CLIENT_EDITOR` が型として利用可能になる。

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: UserRole enum に CLIENT_EDITOR を追加"
```

---

## Task 2: ロール用 zod スキーマを新設

**Files:**
- Create: `lib/validations/role.ts`

**狙い:** 代理店が `POST /api/agency/clients` や `PATCH /api/agency/clients/[clientId]/account` で指定できるロールを `CLIENT` / `CLIENT_EDITOR` の二択に限定する。代理店が `SUPER_ADMIN` や `AGENCY` を作成・昇格できないようにする。

- [ ] **Step 1: ファイル新規作成**

`lib/validations/role.ts` を以下の内容で作成：

```ts
import { z } from 'zod'
import { UserRole } from '@prisma/client'

/** 代理店が指定可能なロール (CLIENT or CLIENT_EDITOR のみ)
 *  代理店経由での SUPER_ADMIN/AGENCY 作成・昇格を防ぐ。 */
export const clientRoleSchema = z.enum(['CLIENT', 'CLIENT_EDITOR'])
export type ClientRole = z.infer<typeof clientRoleSchema>

/** 管理者は全 enum 受付可 */
export const anyRoleSchema = z.nativeEnum(UserRole)
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit**

```bash
git add lib/validations/role.ts
git commit -m "feat: ロール用 zod スキーマ (clientRoleSchema / anyRoleSchema) を新設"
```

---

## Task 3: lib/access.ts に認可ヘルパーを整備

**Files:**
- Modify: `lib/access.ts`

**狙い:** 既存の `canAccessForm` / `canEditForm` に CLIENT_EDITOR を反映し、`canCreateForm` / `canDeleteForm` / `canPurchaseLicense` を新設する。

- [ ] **Step 1: 既存ファイルを以下に書き換え**

`lib/access.ts` の全内容を以下で置き換える：

```ts
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'

/** 現在のClerkユーザーからDBのUserを取得 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  return prisma.user.findUnique({ where: { clerkId } })
}

/** AGENCYまたはSUPER_ADMINロールのユーザーを取得（違う場合はnull）
 *  SUPER_ADMINは自分自身を代理店として扱い、自分のフォーム・クライアントを管理できる。 */
export async function requireAgency(): Promise<User | null> {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'AGENCY' && user.role !== 'SUPER_ADMIN') return null
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
 * - SUPER_ADMIN: 自分が所有するフォーム
 * - AGENCY: 自分が所有するフォーム
 * - CLIENT / CLIENT_EDITOR: 自分に割り当てられたフォーム
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

  if (user.role === 'AGENCY' || user.role === 'SUPER_ADMIN') return form.userId === user.id
  if (user.role === 'CLIENT' || user.role === 'CLIENT_EDITOR') return form.clientId === user.id

  return false
}

/**
 * フォームの編集権チェック
 * - AGENCY/SUPER_ADMIN: 自分が所有するフォーム (allowed=true, fullAccess=true)
 * - CLIENT_EDITOR: 自分に割り当てられたフォーム (allowed=true, fullAccess=true)
 * - CLIENT: 編集不可 (allowed=false)
 *
 * fullAccess は将来「項目編集のみ」と「全編集」を分けたくなったときの拡張点。
 * 現仕様では CLIENT_EDITOR と AGENCY/SUPER_ADMIN は同等扱い。
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

  if ((user.role === 'AGENCY' || user.role === 'SUPER_ADMIN') && form.userId === user.id) {
    return { allowed: true, fullAccess: true }
  }
  if (user.role === 'CLIENT_EDITOR' && form.clientId === user.id) {
    return { allowed: true, fullAccess: true }
  }
  // CLIENT は閲覧のみ、編集不可
  return { allowed: false, fullAccess: false }
}

/** フォーム新規作成権 — AGENCY/SUPER_ADMIN のみ */
export function canCreateForm(user: User): boolean {
  return user.role === 'AGENCY' || user.role === 'SUPER_ADMIN'
}

/** フォーム削除権 — AGENCY/SUPER_ADMIN ∧ owner のみ */
export function canDeleteForm(user: User, form: { userId: string }): boolean {
  return (user.role === 'AGENCY' || user.role === 'SUPER_ADMIN') && form.userId === user.id
}

/** ライセンス購入権 — AGENCY/SUPER_ADMIN ∧ owner のみ */
export function canPurchaseLicense(user: User, form: { userId: string }): boolean {
  return (user.role === 'AGENCY' || user.role === 'SUPER_ADMIN') && form.userId === user.id
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit**

```bash
git add lib/access.ts
git commit -m "feat: 認可ヘルパーに CLIENT_EDITOR 対応と canCreateForm/canDeleteForm/canPurchaseLicense を追加"
```

---

## Task 4: `/api/forms` ハンドラを認可ヘルパー対応に

**Files:**
- Modify: `app/api/forms/route.ts`

**狙い:** GET で CLIENT_EDITOR も担当フォームが見えるようにし、POST に `canCreateForm` ガードを追加する。

- [ ] **Step 1: ファイル全体を以下に置き換え**

`app/api/forms/route.ts` を以下に置き換える：

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { canCreateForm } from '@/lib/access'

/** GET /api/forms - ユーザーのフォーム一覧を取得 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // CLIENT/CLIENT_EDITOR は割り当てられたフォーム、AGENCY/SUPER_ADMIN は自分が所有するフォーム
    const where = (user.role === 'CLIENT' || user.role === 'CLIENT_EDITOR')
      ? { clientId: user.id }
      : { userId: user.id }

    const forms = await prisma.form.findMany({
      where,
      include: {
        _count: { select: { responses: true } },
        steps: { include: { fields: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(forms)
  } catch (error) {
    console.error('GET /api/forms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/forms - 新規フォームを作成 (AGENCY/SUPER_ADMIN のみ) */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      // Clerkユーザーが未登録の場合は自動作成
      user = await prisma.user.create({
        data: {
          clerkId,
          email: '', // Clerkから取得すべきだが簡易化
        },
      })
    }

    // フォーム新規作成権チェック
    if (!canCreateForm(user)) {
      return NextResponse.json({ error: 'フォーム作成権限がありません' }, { status: 403 })
    }

    const body = await req.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const form = await prisma.form.create({
      data: {
        title,
        userId: user.id,
        settings: {
          successMessage: '送信が完了しました。ありがとうございます。',
          notifyEmails: [],
          autoReply: false,
        },
        steps: {
          create: {
            order: 0,
            title: 'ステップ 1',
          },
        },
      },
      include: {
        steps: { include: { fields: true } },
      },
    })

    return NextResponse.json(form, { status: 201 })
  } catch (error) {
    console.error('POST /api/forms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit**

```bash
git add app/api/forms/route.ts
git commit -m "feat: /api/forms GET で CLIENT_EDITOR 対応、POST に canCreateForm ガード追加"
```

---

## Task 5: `/api/forms/[formId]` ハンドラを認可ヘルパー対応に

**Files:**
- Modify: `app/api/forms/[formId]/route.ts`

**狙い:** GET は `canAccessForm`、PUT は `canEditForm`、DELETE は `canDeleteForm` を使って認可する。CLIENT_EDITOR が PUT で項目編集できるようにする。

- [ ] **Step 1: ファイル全体を以下に置き換え**

`app/api/forms/[formId]/route.ts` を以下に置き換える：

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { canDeleteForm, canEditForm } from '@/lib/access'

/** GET /api/forms/:formId - フォーム詳細を取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params

    // 公開フォーム取得（認証なし）と認証済みアクセスの両方を許可する従来の挙動を維持。
    // ただし form 自体は誰でも見られるという既存仕様を踏襲する。
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        steps: {
          include: { fields: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        _count: { select: { responses: true } },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json(form)
  } catch (error) {
    console.error('GET /api/forms/[formId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT /api/forms/:formId - フォームを更新 (AGENCY/SUPER_ADMIN 所有 or CLIENT_EDITOR 担当) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { formId } = await params
    const body = await req.json()
    const { title, description, status, settings, steps } = body

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 編集権チェック（AGENCY/SUPER_ADMIN owner または CLIENT_EDITOR 担当）
    const edit = await canEditForm(user, formId)
    if (!edit.allowed) {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })
    }

    // ステップとフィールドの更新（トランザクション）
    const form = await prisma.$transaction(async (tx) => {
      // フォーム基本情報を更新
      await tx.form.update({
        where: { id: formId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(settings !== undefined && { settings }),
        },
      })

      // ステップの全置換
      if (steps) {
        // 既存のステップを削除（Cascade でフィールドも消える）
        await tx.step.deleteMany({ where: { formId } })

        // 新しいステップを作成
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          await tx.step.create({
            data: {
              id: step.id,
              formId,
              order: i,
              title: step.title,
              fields: {
                create: (step.fields || []).map((f: Record<string, unknown>, j: number) => ({
                  id: f.id as string,
                  order: j,
                  type: (f.type as string).toUpperCase(),
                  label: f.label as string,
                  placeholder: (f.placeholder as string) || null,
                  helpText: (f.helpText as string) || null,
                  required: (f.required as boolean) || false,
                  options: f.options || null,
                  efoSettings: f.efoSettings || null,
                  logic: f.logic || null,
                  linkUrl: (f.linkUrl as string) || null,
                })),
              },
            },
          })
        }
      }

      return tx.form.findUnique({
        where: { id: formId },
        include: {
          steps: {
            include: { fields: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      })
    })

    logAudit(req, user.id, { action: 'FORM_UPDATED', resource: 'form', resourceId: formId, detail: { status, title } })

    return NextResponse.json(form)
  } catch (error) {
    console.error('PUT /api/forms/[formId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/forms/:formId - フォームを削除 (AGENCY/SUPER_ADMIN owner のみ) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { formId } = await params
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true, userId: true, title: true },
    })
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (!canDeleteForm(user, form)) {
      return NextResponse.json({ error: 'フォーム削除権限がありません' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.response.deleteMany({ where: { formId } }),
      prisma.form.delete({ where: { id: formId } }),
    ])

    logAudit(_req, user.id, { action: 'FORM_DELETED', resource: 'form', resourceId: formId, detail: { title: form.title } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/forms/[formId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

```

> 注: GET の認可強化（`canAccessForm` 適用）は本タスクのスコープ外。既存仕様では公開フォーム取得用に認証なしでも GET 可能だったため、後方互換を維持する。

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit**

```bash
git add app/api/forms/[formId]/route.ts
git commit -m "feat: /api/forms/[formId] の PUT/DELETE を canEditForm/canDeleteForm に統一"
```

---

## Task 6: 関連 API (analytics / definition / events / responses / upload / submit) の認可確認

**Files:**
- Modify (必要なら): `app/api/forms/[formId]/analytics/route.ts`, `app/api/forms/[formId]/definition/route.ts`, `app/api/forms/[formId]/events/route.ts`, `app/api/forms/[formId]/responses/route.ts`, `app/api/forms/[formId]/upload/route.ts`, `app/api/forms/[formId]/submit/route.ts`, `app/api/stripe/checkout/route.ts`

**狙い:** これらの API がロール文字列で直接判定している場合、`canAccessForm` / `canEditForm` / `canPurchaseLicense` に差し替える。CLIENT_EDITOR の挙動が期待通り（閲覧系は CLIENT と同じ、編集系はオーナーと同じ、購入系は不可）となるよう調整する。

- [ ] **Step 1: 該当ファイルを一つずつ読み、ロール直書きを認可ヘルパーに置き換え**

各ファイルを順に開いて確認する：

Run: `grep -n "role === " app/api/forms/\[formId\]/*/route.ts app/api/stripe/checkout/route.ts 2>/dev/null`

各ヒットについて以下のルールで書き換え：

- 「フォーム編集系の API (definition の PUT、step/field の CUD など)」 → `canEditForm(user, formId)` の `allowed` で 403
- 「フォーム閲覧系の API (analytics 取得、responses 取得、events 取得)」 → `canAccessForm(user, formId)` で 403
- 「Stripe checkout (ライセンス購入)」 → `canPurchaseLicense(user, form)` で 403
- 「公開エンドポイント (submit、フォーム回答送信)」 → 認可チェック不要（公開フォームへの回答送信）

- [ ] **Step 2: 修正できるファイルがあれば書き換え（実装時にコードを読みつつ）**

例: `app/api/forms/[formId]/definition/route.ts` に PUT があり、ロール直書きで判定していた場合：

```diff
- if (user.role !== 'AGENCY' && user.role !== 'SUPER_ADMIN') {
-   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
- }
+ const edit = await canEditForm(user, formId)
+ if (!edit.allowed) {
+   return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })
+ }
```

各ファイルでこの判定パターンが見つかったら同様に修正。見つからなければファイルは変更不要。

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 4: Commit (修正があれば)**

```bash
git add app/api/forms/[formId] app/api/stripe
git commit -m "feat: フォーム関連 API の認可を canEditForm/canAccessForm/canPurchaseLicense に統一"
```

修正対象がなかった場合は「修正不要」とコメントしてコミットスキップ。

---

## Task 7: 代理店向けクライアント作成 API で role を受け付ける

**Files:**
- Modify: `app/api/agency/clients/route.ts`

**狙い:** POST `/api/agency/clients` の body に `role?: 'CLIENT' | 'CLIENT_EDITOR'` を追加し、未指定なら `'CLIENT'` とする。代理店が SUPER_ADMIN/AGENCY を作れないように `clientRoleSchema` でガード。

- [ ] **Step 1: ファイルの POST 関数を修正**

`app/api/agency/clients/route.ts` の POST 関数を以下に書き換える（GET は既存維持）：

```ts
/** POST /api/agency/clients - クライアント作成（メール+パスワード+ロール） */
export async function POST(req: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role: rawRole } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
  }

  // ロール検証 (CLIENT or CLIENT_EDITOR のみ、未指定なら CLIENT)
  const roleParsed = clientRoleSchema.optional().default('CLIENT').safeParse(rawRole)
  if (!roleParsed.success) {
    return NextResponse.json({ error: '不正な権限指定です' }, { status: 400 })
  }
  const role = roleParsed.data

  try {
    // Clerkでクライアントアカウント作成
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName: name || undefined,
    })

    // DBに指定ロールで作成
    const client = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        name: name || null,
        role,
      },
    })

    // 代理店とクライアントを紐付け
    await prisma.agencyClient.create({
      data: { agencyId: agency.id, clientId: client.id },
    })

    // ログイン案内メール送信
    await resend.emails.send({
      from: 'ContactHub <noreply@contact-hub.app>',
      to: email,
      subject: 'ContactHub アカウントのご案内',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#333">ContactHub へようこそ</h2>
          <p>${name ? `${name} 様、` : ''}ContactHub のアカウントが作成されました。</p>
          <p>以下の情報でログインしてください。</p>
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>メールアドレス：</strong>${email}</p>
            <p style="margin:4px 0;"><strong>初期パスワード：</strong>${password}</p>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/sign-in"
               style="display:inline-block;background:#c49a6c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
              ログインする
            </a>
          </p>
          <p style="color:#999;font-size:12px;margin-top:24px;">
            ログイン後、パスワードは設定画面から変更できます。<br>
            ご不明な点はご担当者にお問い合わせください。
          </p>
        </div>
      `,
    })

    logAudit(req, agency.id, { action: 'CLIENT_CREATED', resource: 'client', resourceId: client.id, detail: { email, name: name || null, role } })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/agency/clients error:', error)
    const clerkError = error as { errors?: { message: string }[] }
    const message = clerkError?.errors?.[0]?.message || 'クライアントの作成に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

ファイル冒頭の import に追加：

```ts
import { clientRoleSchema } from '@/lib/validations/role'
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit**

```bash
git add app/api/agency/clients/route.ts
git commit -m "feat: 代理店クライアント作成 API で role 指定を受け付け (clientRoleSchema)"
```

---

## Task 8: 代理店向けクライアント詳細ページのアカウント API で role 切替を受け付ける

**Files:**
- Modify: `app/api/agency/clients/[clientId]/account/route.ts`

**狙い:** PATCH `/api/agency/clients/[clientId]/account` の body に `role?: 'CLIENT' | 'CLIENT_EDITOR'` を追加し、ロール変更時は監査ログを記録する。

- [ ] **Step 1: PATCH ハンドラを修正**

`app/api/agency/clients/[clientId]/account/route.ts` を以下に書き換える：

```ts
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
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit**

```bash
git add app/api/agency/clients/[clientId]/account/route.ts
git commit -m "feat: 代理店アカウント更新 API でロール切替 (CLIENT/CLIENT_EDITOR) を受け付け"
```

---

## Task 9: 代理店向けクライアント作成 UI に「権限」セレクトを追加

**Files:**
- Modify: `app/(dashboard)/clients/page.tsx`

**狙い:** 新規作成フォームに権限セレクトを追加し、API に `role` を送信する。

- [ ] **Step 1: 既存ファイルに以下の変更を加える**

ファイル冒頭の `emptyForm` を以下に変更：

```tsx
const emptyForm = { name: '', email: '', password: '', role: 'CLIENT' as 'CLIENT' | 'CLIENT_EDITOR' }
```

新規作成フォームの JSX（パスワード入力の直後）に以下を追加：

```tsx
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">権限</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'CLIENT' | 'CLIENT_EDITOR' })}
                  className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  <option value="CLIENT">閲覧のみ (クライアント)</option>
                  <option value="CLIENT_EDITOR">フォーム編集可 (編集者クライアント)</option>
                </select>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  「フォーム編集可」を選ぶと、クライアントが担当フォームの項目を編集できるようになります。
                </p>
              </div>
```

`handleCreate` 関数は変更不要 (body にそのまま `form` を JSON.stringify している前提なので `role` も含まれる)。

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/clients/page.tsx"
git commit -m "feat: クライアント作成フォームに権限セレクトを追加"
```

---

## Task 10: 代理店向けクライアント詳細ページのアカウント設定にロール変更を追加

**Files:**
- Modify: `app/(dashboard)/clients/[clientId]/page.tsx`

**狙い:** アカウント設定カードに権限ドロップダウンを追加し、保存時に role 変更も送信できるようにする。

- [ ] **Step 1: 既存ファイルに変更を加える**

`Relation` 型に `client.role` を含める：

```tsx
interface ClientDetail {
  id: string
  name: string | null
  email: string
  role: 'CLIENT' | 'CLIENT_EDITOR'  // 追加
  createdAt: string
}
```

> 注: `/api/agency/clients` のレスポンスでも `role` を select に含める必要がある。`app/api/agency/clients/route.ts` の GET の `select` に `role: true` を追加。これは Task 7 の修正時に併せて行うか、本タスクの前に小修正として行う。本ステップでは別途行う。

`accountForm` の state を以下に変更：

```tsx
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '', role: 'CLIENT' as 'CLIENT' | 'CLIENT_EDITOR' })
```

`load` 関数で初期化する箇所を以下に変更：

```tsx
        setAccountForm({ name: found.client.name ?? '', email: found.client.email, password: '', role: found.client.role })
```

`handleSaveAccount` 関数の body 構築部分を以下に変更（既存ロジックに role 追加）：

```tsx
    const body: Record<string, unknown> = {}
    if (trimmedName !== (relation.client.name ?? '')) body.name = trimmedName
    if (trimmedEmail !== relation.client.email) body.email = trimmedEmail
    if (accountForm.password) body.password = accountForm.password
    if (accountForm.role !== relation.client.role) body.role = accountForm.role
```

成功時のトースト列挙部分にも role を追加：

```tsx
      if ('role' in body) parts.push('権限')
```

カード内の JSX、パスワード入力の直後に権限セレクトを追加：

```tsx
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">権限</label>
              <select
                value={accountForm.role}
                onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value as 'CLIENT' | 'CLIENT_EDITOR' })}
                className="w-full h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"
              >
                <option value="CLIENT">閲覧のみ (クライアント)</option>
                <option value="CLIENT_EDITOR">フォーム編集可 (編集者クライアント)</option>
              </select>
            </div>
```

- [ ] **Step 2: `/api/agency/clients` GET レスポンスに role を含める**

`app/api/agency/clients/route.ts` の GET 内の `client.select` に `role: true` を追加：

```ts
      client: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,  // 追加
          createdAt: true,
          _count: { select: { clientForms: true } },
        },
      },
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/clients/[clientId]/page.tsx" app/api/agency/clients/route.ts
git commit -m "feat: クライアント詳細ページのアカウント設定に権限変更を追加"
```

---

## Task 11: 管理者画面 (`/admin/users`) のロール表示に CLIENT_EDITOR を追加

**Files:**
- Modify: `app/(admin)/admin/users/page.tsx`

**狙い:** ROLE_LABELS と色分けに CLIENT_EDITOR を追加し、編集モーダルでも選択可能にする。

- [ ] **Step 1: ROLE_LABELS を更新**

```tsx
const ROLE_LABELS = {
  SUPER_ADMIN: 'スーパーアドミン',
  AGENCY: '代理店',
  CLIENT: 'クライアント',
  CLIENT_EDITOR: '編集者クライアント',
} as const
```

- [ ] **Step 2: ロールバッジの色分けを更新**

該当箇所（テーブル行内、`<span className={...}>` でロールバッジを表示しているところ）を以下に書き換える：

```tsx
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'AGENCY' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'CLIENT_EDITOR' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
```

- [ ] **Step 3: 編集モーダル / 作成フォームのロールセレクトは ROLE_LABELS から自動生成しているはずなので変更不要**

確認: `Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)` のパターンになっていれば、CLIENT_EDITOR が自動的に option に追加される。

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 5: Commit**

```bash
git add "app/(admin)/admin/users/page.tsx"
git commit -m "feat: 管理者ユーザー一覧/編集モーダルに CLIENT_EDITOR を追加"
```

---

## Task 12: フォーム一覧 / 編集画面のボタン可視性を切替

**Files:**
- Modify: `app/(dashboard)/forms/page.tsx`
- Modify: `app/(dashboard)/forms/[formId]/edit/page.tsx`

**狙い:** CLIENT_EDITOR が「フォーム新規作成」ボタンや「フォーム削除」ボタンを見られないようにする。

- [ ] **Step 1: フォーム一覧画面の新規作成ボタンを条件付き表示**

`app/(dashboard)/forms/page.tsx` で「新規作成」ボタンを表示している箇所を探し、以下のように条件付きに変更：

```tsx
{(user?.role === 'AGENCY' || user?.role === 'SUPER_ADMIN') && (
  <Button onClick={...}>
    {/* 既存の新規作成ボタン */}
  </Button>
)}
```

> ファイルを読んでみて、ユーザー情報をどこから取得しているかを確認する。`/api/me` から取得しているのが既存パターン。state に `me` 等の名前で持っているか、新規追加する。

- [ ] **Step 2: フォーム編集画面でアクセス権 + 削除ボタンの可視性を更新**

`app/(dashboard)/forms/[formId]/edit/page.tsx` で：

1. ページ読み込み時にユーザー情報を取得 (`/api/me`)
2. フォーム削除ボタンを `(user?.role === 'AGENCY' || user?.role === 'SUPER_ADMIN') && form.userId === user.id` 条件で表示
3. CLIENT_EDITOR がアクセスした場合に既存の編集 UI がそのまま使えることを目視確認

具体的な差分は実装時に該当ファイルを読んでパターン適用。基本は「ロール直書きで AGENCY/SUPER_ADMIN を要求している箇所があれば CLIENT_EDITOR も追加する」「削除ボタンはオーナーのみに残す」の 2 つ。

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/forms/page.tsx" "app/(dashboard)/forms/[formId]/edit/page.tsx"
git commit -m "feat: CLIENT_EDITOR にはフォーム新規作成/削除ボタンを非表示"
```

---

## Task 13: ダッシュボードレイアウト / ナビゲーションの調整

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

**狙い:** ナビゲーションでロール文字列を直接判定している箇所に CLIENT_EDITOR の挙動を追加する。基本的に CLIENT_EDITOR は CLIENT と同じナビゲーションでよい（フォーム一覧へのアクセスは元々 CLIENT もできる）。

- [ ] **Step 1: 既存ファイルを読み、ロール直書き箇所を確認**

Run: `grep -n "role === " app/\(dashboard\)/layout.tsx`

各ヒットについて、CLIENT 専用の分岐があれば CLIENT_EDITOR も含めるよう以下のようなパターンで修正：

```diff
- {user.role === 'CLIENT' && ( ... )}
+ {(user.role === 'CLIENT' || user.role === 'CLIENT_EDITOR') && ( ... )}
```

- 「代理店向け機能」(`AGENCY/SUPER_ADMIN` 専用ナビ): 変更不要
- 「クライアント向け機能」(`CLIENT` 専用ナビ): CLIENT_EDITOR も含める

修正対象がない場合はスキップ。

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit (修正があれば)**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat: ダッシュボードナビゲーションを CLIENT_EDITOR 対応に"
```

---

## Task 14: 残りのロール直書き箇所を一掃

**Files:**
- Modify: 必要に応じて各種ファイル

**狙い:** プロジェクト全体で `role === 'CLIENT'` や `role === 'AGENCY'` 等の直書きを grep し、CLIENT_EDITOR が抜けている箇所がないか確認・修正する。

- [ ] **Step 1: 全体 grep**

Run: `grep -rn "role === " app/ lib/ components/ 2>/dev/null`

各ヒットを確認し、以下のルールで判定：

- **代理店専用** (`role === 'AGENCY' || role === 'SUPER_ADMIN'`): 変更不要
- **CLIENT専用** (`role === 'CLIENT'`): CLIENT_EDITOR も含めるべきか確認 (大抵は含めるべき)
- **個別判定** (`role === 'CLIENT_EDITOR'`): 新規追加箇所として確認

- [ ] **Step 2: 必要なら修正、型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 3: Commit (修正があれば)**

```bash
git add -p  # 差分を確認してから add
git commit -m "fix: 残りのロール直書き箇所を CLIENT_EDITOR 対応に"
```

修正なしの場合はスキップ。

---

## Task 15: 手動 QA を実施する

**狙い:** 設計書 §7 のチェックリストを実機で実行する。

- [ ] **Step 1: ローカル起動 + データ準備**

Run: `npm run dev`
Expected: `http://localhost:3000` 起動。

DB に CLIENT_EDITOR ユーザーを 1 名作っておく（管理者画面の作成フォームで `編集者クライアント` を選んで作成）。AGENCY と紐付ける。

- [ ] **Step 2: 代理店編チェック (`/clients`)**

- [ ] 新規作成フォームの「権限」セレクトに「閲覧のみ」「フォーム編集可」が表示される
- [ ] CLIENT_EDITOR でクライアントを作成 → 一覧で「編集者クライアント」と表示される
- [ ] CLIENT として作成 → 既存と同じ挙動
- [ ] クライアント詳細ページの「アカウント設定」で権限を CLIENT ↔ CLIENT_EDITOR 切替できる
- [ ] 権限切替時に通知メールが送信されない (パスワード変更時のみ送信、設計通り)

- [ ] **Step 3: CLIENT_EDITOR としてログインしたチェック**

- [ ] フォーム一覧で担当フォームが見える
- [ ] フォーム編集画面に入れる
- [ ] 項目追加・編集・削除・並び替え、ステップ操作、タイトル/説明変更、公開状態変更ができる
- [ ] フォーム削除ボタンが表示されない
- [ ] フォーム新規作成導線がない (UI 上)
- [ ] ライセンス購入ボタンが表示されない
- [ ] 送信データの閲覧、メモ、ステータス更新ができる
- [ ] アカウント設定 (自分の名前・パスワード変更) は CLIENT と同じく可能

- [ ] **Step 4: CLIENT としてログインしたチェック (後方互換)**

- [ ] 既存通り送信データ閲覧のみできる
- [ ] フォーム編集ボタンが表示されない
- [ ] API を直接叩いても 403:

```bash
curl -X PUT http://localhost:3000/api/forms/<formId> \
  -H "Content-Type: application/json" \
  -H "Cookie: <CLIENT のセッション cookie>" \
  -d '{"title":"changed"}'
# Expected: 403 編集権限がありません
```

- [ ] **Step 5: 管理者編チェック (`/admin/users`)**

- [ ] 編集モーダルのロール選択肢に「編集者クライアント」が出る
- [ ] CLIENT_EDITOR に変更できる、また CLIENT に戻せる
- [ ] 一覧のロールバッジに「編集者クライアント」が色分けで表示される

- [ ] **Step 6: API 直接叩きのセキュリティチェック**

- [ ] CLIENT_EDITOR セッションで `DELETE /api/forms/<id>` → 403:

```bash
curl -X DELETE http://localhost:3000/api/forms/<formId> \
  -H "Cookie: <CLIENT_EDITOR のセッション cookie>"
# Expected: 403 フォーム削除権限がありません
```

- [ ] CLIENT_EDITOR セッションで `POST /api/forms` → 403:

```bash
curl -X POST http://localhost:3000/api/forms \
  -H "Content-Type: application/json" \
  -H "Cookie: <CLIENT_EDITOR のセッション cookie>" \
  -d '{"title":"new form"}'
# Expected: 403 フォーム作成権限がありません
```

- [ ] 代理店が `POST /api/agency/clients` に `role: 'SUPER_ADMIN'` を送る → 400:

```bash
curl -X POST http://localhost:3000/api/agency/clients \
  -H "Content-Type: application/json" \
  -H "Cookie: <代理店のセッション cookie>" \
  -d '{"email":"x@x.com","password":"abcdefgh","role":"SUPER_ADMIN"}'
# Expected: 400 不正な権限指定です
```

- [ ] **Step 7: 監査ログ確認 (`/admin/audit`)**

- [ ] 代理店がクライアントのロールを変更した記録が `ACCOUNT_UPDATED` で残る (changedFields, oldRole, newRole 付き)

- [ ] **Step 8: 最終ビルド/型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 9: git status 確認**

Run: `git status`
Expected: clean (未コミット変更なし)

---

## 完了条件

- 上記 15 タスクすべての完了
- Task 15 のチェックリストで発見された不具合がすべて解消されていること
- `npx tsc --noEmit` がエラーなく通る
- main ブランチへ PR / マージできる状態
