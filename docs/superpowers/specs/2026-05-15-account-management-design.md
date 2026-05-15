# アカウント管理機能 設計書

- 作成日: 2026-05-15
- 対象ブランチ: `claude/peaceful-mahavira-4852e4`

## 1. 目的

管理者・代理店が他ユーザーのアカウント情報（名前 / メールアドレス / パスワード）を変更できるようにする。

- **管理者 (SUPER_ADMIN)**: すべてのユーザーのアカウント修正・パスワード変更を行える
- **代理店 (AGENCY)**: 自身が担当するクライアントのアカウント修正・パスワード変更を行える

現状、管理者画面では名前・ロールしか編集できず、代理店はクライアント作成のみ可能で編集機能がない。本機能でこのギャップを解消する。

## 2. スコープ

### 対象

- 管理者画面 `/admin/users` 編集モーダルへの項目追加（メール / パスワード）
- 代理店向け `/clients/[clientId]` 詳細ページへ「アカウント設定」カードを新設
- 共通アカウント更新ヘルパー `lib/account-update.ts` の新設
- 新規 API: `PATCH /api/agency/clients/[clientId]/account`
- 既存 API: `PATCH /api/admin/users/[userId]` の拡張
- パスワード変更時の通知メール送信
- 監査ログ記録 (`ACCOUNT_UPDATED`)

### 対象外

- ロール変更 UI を代理店に開放すること（代理店は CLIENT のアカウントのみ更新可、ロール変更は不可）
- 自動テスト基盤の整備（手動 QA で担保）
- パスワードリセットメール方式（直接入力方式のみ）
- メールアドレス変更時の通知メール送信
- 多要素認証や追加のセキュリティ機構

## 3. アーキテクチャ

```
┌─ UI ─────────────────────────────────────────────────────────────┐
│  /admin/users (既存)            /clients/[clientId] (既存)        │
│    └─ 編集モーダルを拡張         └─「アカウント設定」カードを新設 │
│       (name/email/password/role)   (name/email/password)         │
└──────────────────────────────────────────────────────────────────┘
                │ fetch                              │ fetch
                ▼                                    ▼
┌─ API ────────────────────────────────────────────────────────────┐
│  PATCH /api/admin/users/[userId]                                 │
│    ・requireSuperAdmin で認可                                    │
│                                                                  │
│  PATCH /api/agency/clients/[clientId]/account  (新規)            │
│    ・requireAgency + agencyHasClient で認可                      │
│    ・対象は CLIENT ロールのユーザーに限定                        │
└──────────────────────────────────────────────────────────────────┘
                │                                    │
                └──────────────┬─────────────────────┘
                               ▼
┌─ lib/account-update.ts (新規・共通ヘルパー) ─────────────────────┐
│  updateUserAccount(target, { name?, email?, password? }, actor)  │
│    1. email 指定時:    Clerk emailAddresses 更新 → DB email 更新 │
│    2. password 指定時: Clerk password 更新 → 通知メール送信      │
│    3. name 指定時:     DB name 更新                              │
│    4. AuditLog 書き込み (action: ACCOUNT_UPDATED, 変更項目記録)  │
└──────────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┼───────────────┐
                ▼              ▼               ▼
              Clerk           DB         Resend (メール)
            users API     prisma.user     パスワード変更通知
```

### 設計の柱

- **権限境界は API 層で確定**: 共通ヘルパーは「認可済み」の前提で動作し、認可ロジックを内包しない。
- **共通ヘルパーは部分更新**: 渡された項目のみを処理する。空欄や未指定は「変更しない」扱い。
- **外部反映 (Clerk) を先・DB を後**: Clerk 失敗時に DB に不整合が残らないようにする。
- **メール送信は best-effort**: 送信失敗で更新自体は失敗扱いにせず、警告ログ + UI 上の警告トーストで通知。

## 4. API 仕様

### 4.1 `PATCH /api/admin/users/[userId]` (既存を拡張)

**認可**: `requireSuperAdmin()`

**リクエストボディ** (すべて任意・指定された項目のみ更新):

```ts
{
  name?: string | null   // null / 空文字で名前クリア
  email?: string         // メール形式
  password?: string      // 8 文字以上 72 文字以下
  role?: UserRole        // 既存機能
}
```

**自己防衛**:

- `userId === admin.id` の場合 `role` 変更は拒否（ロックアウト防止）
- 自分自身のメール・パスワード変更は許可

**処理**:

1. zod でリクエストボディを検証
2. 対象ユーザーを取得 (404 判定)
3. `role` が含まれていれば `prisma.user.update` で更新
4. `name` / `email` / `password` のいずれかが含まれていれば `updateUserAccount(target, input, admin, req)` を呼ぶ
5. 更新後ユーザーを返す

### 4.2 `PATCH /api/agency/clients/[clientId]/account` (新規)

**認可**:

1. `requireAgency()` で AGENCY または SUPER_ADMIN を取得
2. `agencyHasClient(agency.id, clientId)` で担当関係を確認 (false → 404)
3. 対象ユーザーの `role === 'CLIENT'` を確認（他の AGENCY や SUPER_ADMIN を編集できないようにする防壁）。違う場合 403

**リクエストボディ**:

```ts
{
  name?: string | null
  email?: string
  password?: string
  // role は受け付けない
}
```

**処理**:

1. zod で検証（role フィールドは strict にせず無視、もしくは zod の `.strict()` で 400）
2. 担当・ロール検証後、`updateUserAccount(client, input, agency, req)` を呼ぶ
3. 更新後クライアントを返す

> 既存の `PATCH /api/agency/clients/[clientId]` は `agencyClient.logoUrl` 更新用に残し、アカウント情報は別パス `/account` に分離する（リソースが別物のため）。

### 4.3 `lib/account-update.ts` (新規・共通ヘルパー)

```ts
export interface AccountUpdateInput {
  name?: string | null
  email?: string
  password?: string
}

export interface AccountUpdateResult {
  user: User             // 更新後の DB レコード
  passwordChanged: boolean
  emailChanged: boolean
  emailNotificationSent: boolean  // 将来用に false でも返す
}

/**
 * 認可済み前提の共通アカウント更新処理。
 * - 部分更新（指定項目のみ処理）
 * - Clerk → DB → 通知メール → 監査ログ の順で実行
 */
export async function updateUserAccount(
  target: User,
  input: AccountUpdateInput,
  actor: User,
  req: NextRequest,
): Promise<AccountUpdateResult>
```

**処理順序**:

1. **入力サニタイズ**: 空文字の email/password は「未指定」扱いに正規化。`name` は trim() し、空文字なら null。
2. **Clerk 更新** (該当時):
   - email: 新メールを `emailAddresses.createEmailAddress` で追加 → verification skip → primary に設定 → 旧 emailAddress を削除（Clerk SDK の仕様に従い実装時に最終確認）
   - password: `clerk.users.updateUser(clerkId, { password })`
   - Clerk が失敗したら DB を触らず例外を投げる
3. **DB 更新**: `prisma.user.update({ where: { id }, data: { name?, email? } })`
4. **パスワード通知メール** (passwordChanged 時のみ): Resend で送信。既存 `app/api/agency/clients/route.ts` のテンプレートに揃える。送信失敗はログのみで握りつぶす。
5. **監査ログ**: `logAudit(req, actor.id, { action: 'ACCOUNT_UPDATED', resource: 'user', resourceId: target.id, detail: { changedFields } })`

## 5. UI 変更

### 5.1 `/admin/users` 編集モーダル拡張

既存モーダル（名前 + ロール）に **メール** と **パスワード** を追加：

```
┌─ ユーザー編集 ────────────────────────┐
│ user@example.com                      │  ← 旧メール表示
│ ─────────────────────────────────── │
│ 名前       [山田 太郎              ] │
│ メール     [user@example.com       ] │  ← 編集可
│ パスワード [空欄なら変更しない     ] │  ← 空欄=変更しない / 入力時のみPATCH
│ ロール     [代理店 ▼]                │  ← 自分自身なら disable
│                                       │
│         [キャンセル] [保存する]       │
└───────────────────────────────────────┘
```

仕様：

- パスワード欄が空ならボディに含めず送信、入力されていれば送信
- 自分自身を編集している場合は **ロール選択を無効化** + ヒント文表示
- 保存後の通知トーストに「パスワードを変更し、通知メールを送信しました」など、変更内容を反映

### 5.2 `/clients/[clientId]` 詳細ページに「アカウント設定」カードを追加

> 注: 既存の `/clients/[clientId]` 詳細ページの現状実装を実装フェーズで確認し、既存 Card と統一したスタイルで差し込む。

```
┌─ アカウント設定 ──────────────────────────────┐
│  クライアントの名前・メール・パスワードを       │
│  代理店として変更できます。                     │
│ ─────────────────────────────────────────── │
│ 名前       [株式会社○○            ]         │
│ メール     [client@example.com     ]         │
│ パスワード [空欄なら変更しない     ]         │
│           パスワード変更時に新パスワードを       │
│           クライアントへメール通知します。       │
│                                                │
│                       [変更を保存]             │
└────────────────────────────────────────────────┘
```

仕様：

- 1 つの「変更を保存」ボタンで部分更新を送信
- 変更前のメールを「現在のメール」として明示
- 変更成功時はトーストで完了通知

### 5.3 自己編集の扱い

- 管理者画面で自分のロールを下げると即時アクセスを失う可能性があるため、**自分のロール変更だけ** UI で disable
- 自分の名前・メール・パスワード変更は許可

## 6. バリデーション・エラーハンドリング

### 6.1 入力バリデーション

**フロント側** (UX 即時フィードバック):

- email: HTML5 `type="email"` + 簡易正規表現
- password: 入力時に「8 文字以上」を表示、不足ならボタン disable
- 全項目空ならボタン disable

**サーバ側** (権威):

- zod スキーマで `AccountUpdateInput` を検証 (既存 `lib/validations/` の流儀に合わせる)
  - `name`: `string().max(100).nullable().optional()`
  - `email`: `string().email().optional()`
  - `password`: `string().min(8).max(72).optional()`
  - `role` (admin API のみ): `nativeEnum(UserRole).optional()`

### 6.2 エラー応答

| エラー要因 | HTTP | レスポンス | 動作 |
|------------|------|------------|------|
| 認可失敗 | 403 | `{ error: 'Forbidden' }` | 何もしない |
| 対象ユーザー不在 | 404 | `{ error: 'User not found' }` | 何もしない |
| バリデーション失敗 | 400 | `{ error: '<内容>' }` | 何もしない |
| Clerk のメール重複 / 弱パスワード | 400 | Clerk のメッセージをそのまま返す | DB 触らず |
| Clerk 通信失敗 | 502 | `{ error: 'Clerk API error' }` | DB 触らず |
| DB 更新失敗（Clerk 成功後） | 500 | `{ error: 'DB update failed' }` | 警告ログを残す。運用で監査ログから対処 |
| メール送信失敗 | 200 | `{ user, warning: 'メール送信に失敗しました' }` | 更新自体は成功扱い。UI は warning フィールドを検出して警告トーストを表示。サーバ側は警告ログを残す |

### 6.3 監査ログ

`logAudit(req, actor.id, { action: 'ACCOUNT_UPDATED', resource: 'user', resourceId: target.id, detail: { changedFields: [...] } })`

- `changedFields` には `'name' | 'email' | 'password' | 'role'` のうち実際に変更された項目のみを記録
- パスワードや新メールの値そのものは記録しない

## 7. テスト方針

現状リポジトリ調査の結果、自動テスト基盤は整備されていない。今回は新規にテスト基盤を作るのは範囲外とし、**手動 QA チェックリスト + 型/ビルドチェック** で担保する。

### 7.1 手動 QA チェックリスト

**管理者編 (`/admin/users`)**

- [ ] 他ユーザーの名前のみ変更 → 反映される、メールは送られない
- [ ] 他ユーザーのメールのみ変更 → Clerk・DB 両方反映、Clerk で新メールでログインできる
- [ ] 他ユーザーのパスワードのみ変更 → 新パスでログインできる、通知メールが届く
- [ ] 他ユーザーのロール変更（既存挙動の維持確認）
- [ ] 自分自身のロール変更ボタンが disable
- [ ] 自分自身のパスワードは変更可
- [ ] 重複メールへの変更 → 400 とエラーメッセージ
- [ ] パスワード 7 文字 → 400

**代理店編 (`/clients/[clientId]`)**

- [ ] 自分が担当するクライアントの名前・メール・パスワードを変更できる
- [ ] パスワード変更で通知メールがクライアントに届く
- [ ] 担当外のクライアント ID 直叩き (`PATCH /api/agency/clients/<他社>/account`) → 404
- [ ] 対象が CLIENT ロール以外 (例: 他の AGENCY) を直叩き → 403
- [ ] CLIENT ロールのユーザー本人が同 API を呼んでも 403

**監査ログ確認**:

- [ ] `/admin/audit` に `ACCOUNT_UPDATED` ログが正しい `changedFields` で残る

### 7.2 軽量な型/ビルドチェック

- `npm run build` で TypeScript エラー 0 を確認
- `npm run lint` を通す（既存の ESLint ルール準拠）

## 8. 変更対象ファイル一覧

### 新規

- `lib/account-update.ts` — 共通アカウント更新ヘルパー
- `app/api/agency/clients/[clientId]/account/route.ts` — 代理店向け PATCH エンドポイント

### 変更

- `app/api/admin/users/[userId]/route.ts` — PATCH に name/email/password 対応を追加
- `app/(admin)/admin/users/page.tsx` — 編集モーダルにメール・パスワード欄追加 + 自己編集時のロール disable
- `app/(dashboard)/clients/[clientId]/page.tsx` — 「アカウント設定」カードの追加
- 必要に応じて `lib/validations/` 配下に zod スキーマを追加

## 9. リスクと留意点

- **Clerk のメール変更 API**: SDK のバージョンによりプライマリメール切替の手順が異なる。実装時に context7 で最新ドキュメント確認。
- **Clerk → DB 順序の中断**: Clerk 反映後 DB 失敗のケースは稀だが起こり得る。監査ログとアラート運用で対処。
- **代理店が他代理店/管理者を編集できないこと**: `role === 'CLIENT'` チェックを必ず入れる（テストケース漏れ厳禁）。
- **メール変更時にユーザーへ通知しない**: 仕様として明示。将来のセキュリティ強化要望に応じて追加検討。

## 10. 関連リソース

- 既存実装: `app/api/admin/users/[userId]/route.ts`, `app/api/agency/clients/route.ts`, `lib/access.ts`, `lib/admin.ts`, `lib/audit.ts`
- Clerk SDK: `@clerk/nextjs@^6`
- 認可ヘルパー: `requireSuperAdmin` (`lib/admin.ts`), `requireAgency` / `agencyHasClient` (`lib/access.ts`)
