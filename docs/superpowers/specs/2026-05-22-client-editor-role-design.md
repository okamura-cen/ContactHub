# CLIENT_EDITOR ロール追加 設計書

- 作成日: 2026-05-22
- 対象ブランチ: 未定（実装時に worktree 推奨）

## 1. 目的

「クライアントだけどフォーム項目の追加・修正ができる」ユーザー層からの要望に応え、新しいユーザーロール `CLIENT_EDITOR` を追加する。

- 既存 CLIENT は閲覧と送信データ管理のみ（変更なし、後方互換維持）
- 新規 CLIENT_EDITOR は CLIENT の全権限に加えて、担当フォームの項目・ステップ・タイトル/説明・公開状態を編集できる
- フォーム新規作成、フォーム削除、ライセンス購入は引き続き AGENCY/SUPER_ADMIN のみ

## 2. スコープ

### 対象

- Prisma `UserRole` enum への `CLIENT_EDITOR` 追加と DB マイグレーション
- 認可ヘルパー `lib/access.ts` の整備（既存の未使用 `canEditForm` を活かし、`canCreateForm` / `canDeleteForm` / `canPurchaseLicense` を新設）
- フォーム編集系 API ハンドラの認可をロール文字列直書きからヘルパー呼び出しに置き換え
- 代理店向けクライアント作成 UI/API に「権限」セレクトを追加
- 代理店向けクライアント詳細ページのアカウント設定にロール変更を追加
- 管理者画面のロール表示・編集モーダルに CLIENT_EDITOR を追加
- CLIENT_EDITOR としてログインした際のフォーム編集導線（既存編集画面の権限チェック切替）
- ロール変更時の監査ログ記録

### 対象外

- 自動テスト基盤の整備（手動 QA で担保）
- CLIENT_EDITOR 専用の新規ダッシュボード画面（既存画面の権限チェック切替で十分）
- ロール変更時の対象ユーザーへの通知メール（既存「メール変更時は通知なし」と同じ方針）
- 既存 CLIENT データの自動マイグレーション（CLIENT のままで動作継続）

## 3. アーキテクチャ

```
┌─ DB (Prisma schema) ───────────────────────────────────────────────┐
│  enum UserRole {                                                   │
│    SUPER_ADMIN                                                     │
│    AGENCY                                                          │
│    CLIENT                                                          │
│    CLIENT_EDITOR  ← 新規追加                                       │
│  }                                                                 │
│  → npx prisma migrate dev --name add_client_editor_role            │
└────────────────────────────────────────────────────────────────────┘

┌─ lib/access.ts (認可ヘルパーの集約) ───────────────────────────────┐
│  canAccessForm(user, formId)                                       │
│    AGENCY/SUPER_ADMIN ∧ owner             → true                   │
│    CLIENT/CLIENT_EDITOR ∧ assigned-client → true                   │
│                                                                    │
│  canEditForm(user, formId)                                         │
│    AGENCY/SUPER_ADMIN ∧ owner       → { allowed, fullAccess: true }│
│    CLIENT_EDITOR ∧ assigned-client  → { allowed, fullAccess: true }│
│    CLIENT ∧ assigned-client         → { allowed: false }           │
│                                                                    │
│  canCreateForm(user)        AGENCY/SUPER_ADMIN のみ                │
│  canDeleteForm(user, form)  AGENCY/SUPER_ADMIN ∧ owner のみ        │
│  canPurchaseLicense(...)    AGENCY/SUPER_ADMIN ∧ owner のみ        │
└────────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼──────────────────┬──────────────────┐
            ▼                 ▼                  ▼                  ▼
┌─ Form 編集 API ─┐ ┌─ 代理店 API ──┐  ┌─ 管理者 API ──┐ ┌─ UI ────────┐
│  PUT /forms/.. │ │ POST /clients │  │ PATCH         │ │ 代理店:     │
│  DELETE        │ │  ↑ role 受付   │  │  ↑ role enum  │ │  作成画面   │
│   ↑ canEditForm│ │ PATCH /../   │  │   経由で       │ │  権限選択   │
│     を使う      │ │  .../account │  │   CLIENT_EDITOR│ │ 詳細画面   │
│  POST /forms   │ │   ↑ role 切替│  │   許可         │ │  権限変更   │
│   ↑ canCreate  │ │     許可     │  │                │ │ 管理者:     │
│     Form       │ │              │  │                │ │  既存モーダル│
└────────────────┘ └───────────────┘  └───────────────┘ └─────────────┘
                                                          │
                                                          ▼
                                                  ┌─ CLIENT_EDITOR ┐
                                                  │ ログイン後 UI: │
                                                  │  ・送信データ  │
                                                  │  ・フォーム編集│ ← CLIENT との差分
                                                  │  ・アカウント  │
                                                  └────────────────┘
```

### 設計の柱

- **DB の enum 拡張は最小限**: 既存 CLIENT データは変更しない。後方互換維持。
- **認可ロジックは `lib/access.ts` に集約**: 既存だが未使用の `canEditForm` を活用。新設も含めて API ハンドラから生のロール文字列比較を一掃する。
- **多重防御**: API レベル（認可ヘルパー）+ UI レベル（ボタン可視性）の 2 段ガード。UI が破られてもサーバーでブロック。
- **代理店経由のロール作成は限定 enum**: `clientRoleSchema = z.enum(['CLIENT', 'CLIENT_EDITOR'])` で代理店が SUPER_ADMIN/AGENCY を作成・昇格できないようにする。

## 4. DB マイグレーション + 認可ヘルパー詳細

### 4.1 Prisma スキーマ変更

```prisma
enum UserRole {
  SUPER_ADMIN
  AGENCY
  CLIENT
  CLIENT_EDITOR  // 追加
}
```

マイグレーション: `npx prisma migrate dev --name add_client_editor_role`

Postgres レベルでは `ALTER TYPE "UserRole" ADD VALUE 'CLIENT_EDITOR'`。既存データに影響なし。ロールバックは「該当値を使うユーザーを CLIENT に戻したうえで enum 値を削除」する手順になる（実用上は本機能投入後は CLIENT_EDITOR ユーザーが発生するため後戻りは慎重に）。

### 4.2 `lib/access.ts` 改修

既存関数の更新と新設をまとめる。

```ts
import type { User, Form } from '@prisma/client'

/** 現在のClerkユーザーからDBのUserを取得（既存・変更なし） */
export async function getCurrentUser(): Promise<User | null>

/** AGENCY/SUPER_ADMIN を要求（既存・変更なし） */
export async function requireAgency(): Promise<User | null>

/** 代理店が指定クライアントを担当しているか（既存・変更なし）
 *  CLIENT_EDITOR も AgencyClient に登録される前提で、CLIENT と同じ扱い */
export async function agencyHasClient(agencyId: string, clientId: string): Promise<boolean>

/** フォーム閲覧権 — CLIENT_EDITOR を追加 */
export async function canAccessForm(user: User, formId: string): Promise<boolean> {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { userId: true, clientId: true },
  })
  if (!form) return false
  if (user.role === 'AGENCY' || user.role === 'SUPER_ADMIN') return form.userId === user.id
  if (user.role === 'CLIENT' || user.role === 'CLIENT_EDITOR') return form.clientId === user.id
  return false
}

/** フォーム編集権 — CLIENT_EDITOR に編集を許可、CLIENT は不可 */
export async function canEditForm(
  user: User,
  formId: string,
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

/** フォーム新規作成権 — 新設 */
export function canCreateForm(user: User): boolean {
  return user.role === 'AGENCY' || user.role === 'SUPER_ADMIN'
}

/** フォーム削除権 — 新設 */
export function canDeleteForm(user: User, form: { userId: string }): boolean {
  return (user.role === 'AGENCY' || user.role === 'SUPER_ADMIN') && form.userId === user.id
}

/** ライセンス購入権 — 新設 */
export function canPurchaseLicense(user: User, form: { userId: string }): boolean {
  return (user.role === 'AGENCY' || user.role === 'SUPER_ADMIN') && form.userId === user.id
}
```

意味の整理：
- `allowed`: そもそも編集 API を叩けるか
- `fullAccess`: 全 PATCH フィールド許可（CLIENT_EDITOR と AGENCY/SUPER_ADMIN は同等）
- フォーム削除・新規作成・ライセンス購入は独立した関数で判定

## 5. API ハンドラと UI の具体仕様

### 5.1 既存 API ハンドラへの認可ヘルパー適用

実装時に対象ファイルを 1 つずつ読み、ロール文字列直書きの認可分岐を `canXxx` ヘルパーに置き換える。想定対象：

| エンドポイント | 旧判定 | 新判定 |
|---|---|---|
| `GET /api/forms` | role で where 切替 | role で where 切替（CLIENT/CLIENT_EDITOR は clientId 条件） |
| `GET /api/forms/[formId]` | role 直比較 | `canAccessForm` |
| `PUT /api/forms/[formId]` (編集) | role 直比較 | `canEditForm` |
| `DELETE /api/forms/[formId]` | role 直比較 | `canDeleteForm` |
| `POST /api/forms` (新規作成) | role 直比較 | `canCreateForm` |
| Step/Field CUD API（あれば） | role 直比較 | `canEditForm` |
| Stripe checkout / license API | role 直比較 | `canPurchaseLicense` |

> 注: 実際の対象ファイル一覧は実装プラン作成時に grep で網羅する。

### 5.2 クライアント作成 UI (`/clients`)

新規作成フォームに「権限」セレクトを追加：

```
┌─ 新規クライアント作成 ─────────────────────────┐
│  会社名: [株式会社○○        ]                  │
│  メール: [client@example.com  ]                │
│  パスワード: [••••••••       ]                │
│  権限: [閲覧のみ ▼]                           │
│         閲覧のみ (CLIENT)                      │
│         フォーム編集可 (CLIENT_EDITOR)         │
│  [作成してメール送信]                          │
└────────────────────────────────────────────────┘
```

API `POST /api/agency/clients` の body に `role?: 'CLIENT' | 'CLIENT_EDITOR'` を追加。未指定なら `'CLIENT'`。

### 5.3 クライアント詳細ページ (`/clients/[clientId]`) のアカウント設定にロール変更

既存「アカウント設定」カードに権限ドロップダウンを追加：

```
┌─ アカウント設定 ──────────────────────────────┐
│  名前: [株式会社○○            ]              │
│  メール: [client@example.com   ]              │
│  パスワード: [空欄なら変更しない]              │
│  権限: [編集者クライアント ▼]                 │
│         閲覧のみ (CLIENT)                      │
│         フォーム編集可 (CLIENT_EDITOR)         │
│  [変更を保存]                                  │
└────────────────────────────────────────────────┘
```

API `PATCH /api/agency/clients/[clientId]/account` の body に `role?: 'CLIENT' | 'CLIENT_EDITOR'` を追加。ロール変更時は監査ログに記録（後述 6.4）。

### 5.4 CLIENT_EDITOR としてログイン後の UI

- フォーム一覧画面 `/forms`: 担当フォームを表示（既存 CLIENT と同じ）
- フォーム編集画面 `/forms/[formId]/edit`: 認可チェックを `canEditForm` に切り替えると、CLIENT_EDITOR も入れるようになる
- フォーム編集画面の「フォーム削除」ボタン: CLIENT_EDITOR には非表示
- フォーム新規作成ボタン: CLIENT_EDITOR には非表示
- ライセンス購入ボタン: CLIENT_EDITOR には非表示
- 送信データ閲覧・メモ・ステータス更新: CLIENT と同じく可能
- アカウント設定（自分の名前・パスワード変更）: CLIENT と同じく可能

UI のボタン可視性は、`user.role === 'CLIENT_EDITOR'` を React コンポーネントで素直に判定する。サーバー側のヘルパーと二重に判定するが、シンプルさを優先する。

### 5.5 管理者画面 (`/admin/users`) のロール表示

ロールラベルと色分けに CLIENT_EDITOR を追加：

```tsx
const ROLE_LABELS = {
  SUPER_ADMIN: 'スーパーアドミン',
  AGENCY: '代理店',
  CLIENT: 'クライアント',
  CLIENT_EDITOR: '編集者クライアント',  // 追加
}

// バッジ色分け
// CLIENT_EDITOR は緑系 (bg-green-100 text-green-700) で CLIENT (gray) と区別
```

管理者の既存 PATCH (`/api/admin/users/[userId]`) は既に `UserRole` enum を受けるので、CLIENT_EDITOR も自動的に許可される（変更不要）。

## 6. バリデーション・エラーハンドリング

### 6.1 zod スキーマ

```ts
// 代理店がクライアント作成・更新時に指定できるロール
export const clientRoleSchema = z.enum(['CLIENT', 'CLIENT_EDITOR'])

// 管理者は全 enum 受付可（既存通り）
export const anyRoleSchema = z.nativeEnum(UserRole)
```

適用箇所：
- `POST /api/agency/clients` の body `role`: `clientRoleSchema.optional().default('CLIENT')`
- `PATCH /api/agency/clients/[clientId]/account` の body `role`: `clientRoleSchema.optional()`
- 管理者 API は `anyRoleSchema` のまま

### 6.2 認可エラー応答

| 状況 | HTTP | レスポンス |
|---|---|---|
| CLIENT が `PUT /api/forms/[formId]` を叩く | 403 | `{ error: '編集権限がありません' }` |
| CLIENT_EDITOR が `DELETE /api/forms/[formId]` を叩く | 403 | `{ error: 'フォーム削除権限がありません' }` |
| CLIENT_EDITOR が `POST /api/forms` を叩く | 403 | `{ error: 'フォーム作成権限がありません' }` |
| CLIENT_EDITOR が ライセンス購入 API を叩く | 403 | `{ error: '権限がありません' }` |
| 代理店が `role: 'SUPER_ADMIN'` をクライアント作成に指定 | 400 | zod のエラーメッセージ |
| その他バリデーション失敗 | 400 | zod のエラーメッセージ |

エラーメッセージは日本語、UI で toast 表示。

### 6.3 UI 側ガード（多重防御）

「フォーム削除」「フォーム新規作成」「ライセンス購入」ボタンは CLIENT_EDITOR には**表示しない**。
API レベル + UI レベルの 2 段ガードで、UI ガードが破れてもサーバーでブロック。

### 6.4 監査ログ

代理店がロール変更したときに `ACCOUNT_UPDATED` を記録：

```ts
logAudit(req, agency.id, {
  action: 'ACCOUNT_UPDATED',
  resource: 'user',
  resourceId: clientId,
  detail: { changedFields: ['role'], oldRole: target.role, newRole: role },
})
```

管理者 PATCH は既に同パターンで記録済み（前回機能の eb6b67e で実装済み）なので、変更不要。

## 7. テスト方針

自動テスト基盤がないため、手動 QA + 型/ビルドチェックで担保。

### 7.1 手動 QA チェックリスト

**代理店編 (`/clients`)**
- [ ] 新規作成フォームの「権限」セレクトに CLIENT / CLIENT_EDITOR が表示される
- [ ] CLIENT_EDITOR でクライアントを作成 → 一覧で「編集者クライアント」と表示
- [ ] CLIENT として作成 → 既存と同じ挙動（後方互換）
- [ ] クライアント詳細ページのアカウント設定で権限を CLIENT ↔ CLIENT_EDITOR 切替できる
- [ ] 権限切替時に通知メールは送らない

**CLIENT_EDITOR としてログイン**
- [ ] フォーム一覧画面で担当フォームが見える
- [ ] フォーム編集画面に入れる
- [ ] 項目追加・編集・削除・並び替え、ステップ操作、タイトル変更、公開状態変更ができる
- [ ] フォーム削除ボタンが表示されない／API も 403
- [ ] フォーム新規作成導線がない／API も 403
- [ ] ライセンス購入ボタンが表示されない／API も 403
- [ ] 送信データの閲覧、メモ、ステータス更新ができる
- [ ] アカウント設定（自分の名前・パスワード変更）は CLIENT と同じく可能

**CLIENT としてログイン（後方互換確認）**
- [ ] 既存通り送信データ閲覧のみ
- [ ] フォーム編集ボタン非表示、API も 403

**管理者編 (`/admin/users`)**
- [ ] 編集モーダルのロール選択肢に CLIENT_EDITOR が出る
- [ ] CLIENT_EDITOR に変更できる、また CLIENT に戻せる
- [ ] 一覧のロールバッジに「編集者クライアント」が表示される（色分けあり）

**API 直接叩き**
- [ ] CLIENT セッションで `PUT /api/forms/<id>` → 403
- [ ] CLIENT_EDITOR セッションで `DELETE /api/forms/<id>` → 403
- [ ] 代理店が `POST /api/agency/clients` に `role: 'SUPER_ADMIN'` を送る → 400

**監査ログ確認**
- [ ] 代理店がクライアントのロールを変更すると `ACCOUNT_UPDATED` ログに `changedFields: ['role']`, `oldRole`, `newRole` が記録される

### 7.2 軽量な型/ビルドチェック

- `npx prisma generate` で型を再生成
- `npx tsc --noEmit` で TypeScript エラー 0
- `npm run build` でビルド成功（環境変数が揃えば）

## 8. 変更対象ファイル一覧

### 変更

- `prisma/schema.prisma` — UserRole enum に CLIENT_EDITOR 追加
- `prisma/migrations/<timestamp>_add_client_editor_role/migration.sql` — 自動生成
- `lib/access.ts` — `canAccessForm` / `canEditForm` の更新、`canCreateForm` / `canDeleteForm` / `canPurchaseLicense` の新設
- `app/api/forms/route.ts` — `GET` の where 切替（CLIENT_EDITOR 追加）、`POST` で `canCreateForm` 使用
- `app/api/forms/[formId]/route.ts` — `canAccessForm` / `canEditForm` / `canDeleteForm` 使用
- Step/Field 系 API（存在する場合） — `canEditForm` 使用
- ライセンス購入関連 API（Stripe checkout 等） — `canPurchaseLicense` 使用
- `app/api/agency/clients/route.ts` — POST body に `role` 受付、`clientRoleSchema` 適用
- `app/api/agency/clients/[clientId]/account/route.ts` — PATCH body に `role` 受付、ロール変更時の監査ログ
- `app/(dashboard)/clients/page.tsx` — 作成フォームに「権限」セレクト追加
- `app/(dashboard)/clients/[clientId]/page.tsx` — アカウント設定に権限ドロップダウン追加
- `app/(admin)/admin/users/page.tsx` — ROLE_LABELS と色分けに CLIENT_EDITOR 追加
- `app/(dashboard)/forms/[formId]/edit/page.tsx`（または該当ファイル） — 編集権限チェックを `canEditForm` ベースに、削除/作成ボタンの可視性切替
- `app/(dashboard)/forms/page.tsx` — フォーム新規作成ボタンの可視性切替

### 新規

- `lib/validations/role.ts` — `clientRoleSchema`、`anyRoleSchema` の定義

## 9. リスクと留意点

- **Prisma マイグレーション**: 本番 DB に対する `ALTER TYPE ADD VALUE` は安全な操作だが、デプロイ手順としてマイグレーション → アプリリリースの順序を守る必要がある（先にアプリだけ出すと既存コードが新 enum を知らずに動く）。
- **既存ロール文字列の grep 漏れ**: `'CLIENT'` や `'AGENCY'` をロジック内で直書きしている箇所が他にも残っている可能性。実装時に網羅 grep で確認する。
- **CLIENT_EDITOR の権限境界の認識違い**: 「フォーム編集」が「項目編集だけか、ステップやタイトル・公開状態も含むか」は本設計で「全部含む」と決定済み。ただしフォーム削除・新規作成・ライセンス購入は禁止。実装時にこの境界を厳密に守ること。
- **代理店経由のロール昇格防止**: `clientRoleSchema` で限定 enum を強制。zod チェックを忘れると代理店が SUPER_ADMIN を作れてしまうので、テストで必ず検証する。
- **既存 CLIENT データの扱い**: 自動マイグレーションはせず、CLIENT のまま動作継続。「フォーム編集権を付与したい」場合は代理店が手動で CLIENT_EDITOR に切り替える運用とする。
- **UI ガードが破られた場合のサーバーガード**: ボタンを CSS で隠しただけでは攻撃者には無効。API レベルの認可ヘルパーが第一防御線である点を実装時に再確認する。

## 10. 関連リソース

- 既存実装: `lib/access.ts`, `lib/admin.ts`, `lib/account-update.ts`, `lib/audit.ts`, `app/api/agency/clients/route.ts`, `app/api/agency/clients/[clientId]/account/route.ts`, `app/api/admin/users/[userId]/route.ts`
- 前回設計書: `docs/superpowers/specs/2026-05-15-account-management-design.md`
- Prisma docs: <https://www.prisma.io/docs/orm/prisma-migrate>
