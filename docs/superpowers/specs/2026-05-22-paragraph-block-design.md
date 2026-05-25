# 段落ブロック (PARAGRAPH) 機能 設計書

- 作成日: 2026-05-22
- 対象ブランチ: 未定（実装時に worktree 推奨）

## 1. 目的

フォーム上部や任意の位置に、装飾付きの「注意書き・案内文ブロック」を追加できるようにする。代理店・CLIENT_EDITOR が管理画面から HTML を書かずに、安全に注意書きエリアを構築できる。

具体例: スクリーンショット (ap-test.net/jd-jewels-test/repair/form) で「オンライン修理サービスをご希望の方は…」と表示されている薄い枠線付きの案内エリアを、ContactHub のビルダー画面から追加できるようにする。

## 2. スコープ

### 対象

- 既存の `FieldType.PARAGRAPH` enum を実際に利用可能にする（schema 上だけ存在し、ビルダー UI とレンダラーには未実装）
- ビルダー画面 (`/forms/[formId]/edit`) で「📝 段落ブロック」を追加・編集できる UI
- 公開フォーム (FormRenderer) で段落ブロックを描画
- 3 種類の装飾プリセット: プレーン / 注意書き枠 / 強調枠
- 本文の改行反映
- 任意のタイトル
- 任意の 1 リンク（リンクテキスト + URL）
- zod バリデーション (本文必須・URL 形式・リンクテキスト/URL のセット入力)

### 対象外

- DB スキーマ変更（既存 `Field` モデルを流用するので migration 不要）
- Markdown 記法サポート（リンクは別フィールドで指定）
- 複数リンク対応（1 ブロックにつき 1 リンクまで）
- 太字・色文字・画像・動画埋め込みなどのリッチコンテンツ
- 自動テスト基盤の整備（手動 QA で担保）

## 3. アーキテクチャ

```
┌─ DB (既存・変更なし) ──────────────────────────────────────────────┐
│  Field {                                                           │
│    type: PARAGRAPH                                                 │
│    label: string         ← 「タイトル（任意）」用に流用             │
│    helpText: string      ← 「本文」用に流用                         │
│    linkUrl: string?      ← 「リンクURL」(既存フィールドを流用)       │
│    options: JSON         ← { style, linkText } を格納               │
│    placeholder, required ← 未使用（無視）                            │
│  }                                                                 │
│  → スキーマ変更なし、マイグレーション不要                          │
└────────────────────────────────────────────────────────────────────┘

┌─ ビルダー UI (代理店/CLIENT_EDITOR が使う管理画面) ─────────────────┐
│  FieldPalette                                                      │
│    └─ 「📝 段落ブロック」ボタンを追加 → クリックで PARAGRAPH 追加  │
│                                                                    │
│  PropertyPanel (PARAGRAPH 選択中の設定 UI)                          │
│    ├─ タイトル (任意)                                              │
│    ├─ 本文 (テキストエリア、改行可)                                │
│    ├─ スタイル: ○ プレーン  ○ 注意書き枠  ○ 強調枠 (ラジオ)        │
│    ├─ リンクテキスト (任意)                                        │
│    └─ リンク URL (任意)                                            │
│                                                                    │
│  BuilderCanvas                                                     │
│    └─ プレビューで PARAGRAPH を実際の表示に近い形で描画            │
└────────────────────────────────────────────────────────────────────┘

┌─ FormRenderer (公開フォーム = 埋め込み先で表示) ────────────────────┐
│  StepForm が field.type で分岐                                      │
│    └─ PARAGRAPH なら新規 ParagraphBlock コンポーネントを描画       │
│       props: { title?, body, style, linkText?, linkUrl? }          │
│       スタイル別に Tailwind クラスを切替                            │
│       本文の改行は whitespace-pre-line で反映                       │
│       リンクは本文末尾に表示、target="_blank" rel="noopener"        │
└────────────────────────────────────────────────────────────────────┘
```

### 設計の柱

- **DB スキーマ変更なし**: `Field` モデルの既存カラム (`label` / `helpText` / `linkUrl` / `options`) を流用。本番反映時のリスクゼロ。前回の CLIENT_EDITOR 機能で発生した「本番 DB の enum 更新漏れ」のような問題が起きない。
- **既存 enum をようやく実装**: `FieldType.PARAGRAPH` は schema にだけ存在していた未実装機能。今回ようやく動かす。
- **新規コンポーネント1つ**: `ParagraphBlock` (form-renderer 側) と PropertyPanel での設定 UI が主な追加。
- **シンプル優先**: Markdown 記法やリッチエディタは導入せず、プレーンテキスト + 改行 + 単一リンクで運用。

## 4. フィールド仕様と装飾プリセット

### 4.1 Field モデルの流用マッピング

| Field カラム | 用途 (PARAGRAPH 時) | 例 |
|---|---|---|
| `type` | `'PARAGRAPH'` 固定 | - |
| `label` | タイトル（任意） | "ご案内" or 空 |
| `helpText` | 本文（必須、改行可） | "オンライン修理サービスを…" |
| `linkUrl` | リンク URL（任意） | "/online-repair-info" |
| `options` | `{ style, linkText }` を JSON で格納 | `{ "style": "notice", "linkText": "オンラインお修理受付について" }` |
| `placeholder` / `required` | 未使用（無視） | - |

`options` の型:

```ts
type ParagraphOptions = {
  style: 'plain' | 'notice' | 'emphasis'  // 装飾プリセット
  linkText?: string                        // リンクテキスト (linkUrl があれば表示)
}
```

### 4.2 装飾プリセット 3 種

**プレーン (plain)** — 装飾なし、ただの段落

Tailwind: `text-sm text-foreground`

**注意書き枠 (notice)** — 薄いグレー背景 + 細い枠線

Tailwind: `border border-border bg-muted/40 rounded-md p-4 text-sm`

**強調枠 (emphasis)** — 左側に色帯 + 薄い背景 + 太字

Tailwind: `border-l-4 border-primary bg-primary/5 rounded-md p-4 text-sm font-medium`

> 注: 色は ContactHub の既存 CSS 変数 (`--primary`, `--muted`, `--border`) に揃える。埋め込み先では ContactHub の CSS スコープが効く前提。

### 4.3 本文の改行・整形

- **本文の改行**: テキストエリアでユーザーが入力した改行 (`\n`) をそのまま `<p className="whitespace-pre-line">` で反映。`<br>` 変換は行わない（XSS 対策＋シンプル）。
- **「※」マーク**: ユーザーが本文に直接 `※` を書く前提（リスト UI は提供しない）。
- **タイトル (label)**: 空でなければ `<h4 className="font-semibold mb-2">` で本文の上に表示。

### 4.4 リンク表示位置

「本文末尾に独立した行で」表示する最小実装:

```tsx
{body && <p className="whitespace-pre-line">{body}</p>}
{linkUrl && linkText && (
  <p className="mt-2">
    <a href={linkUrl} target="_blank" rel="noopener noreferrer"
       className="text-primary underline">
      {linkText}
    </a>
  </p>
)}
```

> スクショのように「本文中（「※」リストの 3 行目）にリンクを差し込む」配置は Markdown を採用しないと厳密には再現できない。今回は「本文末尾にリンク行を追加」する妥協案で進める。

### 4.5 ビルダー UI 詳細

**FieldPalette (左ペイン)**: 既存の入力フィールド一覧の下に「装飾」セクションを設け、「📝 段落ブロック」ボタンを追加。クリックで現在のステップに PARAGRAPH を追加。

**PropertyPanel (右ペイン、PARAGRAPH 選択中)**:

```
┌─ 段落ブロックの設定 ────────────────────┐
│ タイトル (任意)                          │
│  [_________________________]            │
│                                          │
│ 本文 *                                   │
│ ┌──────────────────────────────────┐    │
│ │                                  │    │
│ │                                  │    │
│ └──────────────────────────────────┘    │
│ 改行で改段。「※」も普通に入力できます。  │
│                                          │
│ スタイル                                 │
│  ○ プレーン  ● 注意書き枠  ○ 強調枠     │
│                                          │
│ リンクテキスト (任意)                    │
│  [_________________________]            │
│                                          │
│ リンク URL (任意)                        │
│  [_________________________]            │
└──────────────────────────────────────────┘
```

**BuilderCanvas (中央プレビュー)**: PropertyPanel の入力を反映してリアルタイムで装飾済みプレビューを表示。

## 5. バリデーション・エラー処理・セキュリティ

### 5.1 サーバー側 zod バリデーション

`PUT /api/forms/[formId]` の steps[].fields[] 検証に、`type === 'PARAGRAPH'` の場合の以下のチェックを追加:

```ts
// 本文は必須、空文字不可
helpText: z.string().trim().min(1, '本文を入力してください')

// タイトルは任意
label: z.string().max(100).optional().nullable()

// リンク URL は任意。指定時は http/https に限定 (javascript: 等を弾く)
linkUrl: z
  .string()
  .url('URL の形式が正しくありません')
  .refine(
    (u) => u.startsWith('http://') || u.startsWith('https://'),
    'http:// または https:// で始まる URL を入力してください'
  )
  .optional()
  .nullable()

// options は { style, linkText } を格納
options: z.object({
  style: z.enum(['plain', 'notice', 'emphasis']).default('plain'),
  linkText: z.string().max(100).optional(),
}).optional()

// 横断検証:
//   linkUrl があるなら options.linkText も必須
//   options.linkText があるなら linkUrl も必須
```

### 5.2 クライアント側ガード

ビルダーの「保存」押下時に即時フィードバック:

- 本文が空 → toast「本文を入力してください」で early return
- リンク URL とリンクテキストの片方だけ入っている → toast「リンクテキストと URL は両方入力してください」
- リンク URL の形式が不正 → toast「正しい URL を入力してください」（HTML5 `type="url"` + try `new URL()`）

サーバー側 zod が最終ガード、UI は即時フィードバック用。

### 5.3 レンダラー側のフォールバック

`ParagraphBlock` で受け取る値が不正な場合のフォールバック:

- `style` が想定外文字列 → `'plain'` として扱う
- `body` が空 → コンポーネント自体を描画しない (null を返す)
- `linkUrl` または `linkText` が片方だけ → リンクなしで本文だけ表示

これで「壊れたフォームでフォーム自体が表示されなくなる」事態を防ぐ。

### 5.4 セキュリティ

- **本文の HTML 直書き不許可**: `whitespace-pre-line` で改行だけ反映。`<script>` 等を含むテキストを書いてもそのまま文字列として表示される（React の自動エスケープ）。
- **リンクの target/rel 強制**: `target="_blank" rel="noopener noreferrer"` を必ず付与。
- **URL スキーム制限**: zod の refine で `http://` / `https://` のみ許可。`javascript:` / `data:` / `file:` などを弾く。
- **代理店間の影響範囲**: PARAGRAPH を不適切に使っても影響範囲はそのフォームを埋め込んだサイトの閲覧者のみ。他の代理店・他のクライアントには波及しない。

### 5.5 既存機能への影響

- フォーム送信時の集計対象から PARAGRAPH を除外（`['HEADING','PARAGRAPH','DIVIDER'].includes(f.type)` で既に対応済み）
- 送信データ保存時に PARAGRAPH は値を持たないため、`response.data` には含めない（既存ロジックで対応済み）

## 6. テスト方針

自動テスト基盤がないため、**手動 QA + 型/ビルドチェック**で担保。

### 6.1 手動 QA チェックリスト

**ビルダー (`/forms/[formId]/edit`)**

- [ ] FieldPalette に「📝 段落ブロック」が表示される
- [ ] 段落ブロックを追加できる
- [ ] PropertyPanel でタイトル/本文/スタイル/リンクテキスト/リンク URL を編集できる
- [ ] BuilderCanvas でリアルタイムにプレビュー表示される
- [ ] 「プレーン / 注意書き枠 / 強調枠」を切り替えると見た目が変わる
- [ ] 本文の改行が反映される
- [ ] 本文を空にして保存 → エラートースト
- [ ] リンク URL だけ入力して保存 → エラートースト
- [ ] `javascript:alert(1)` を URL に入れる → エラートースト

**公開フォーム (埋め込み先で表示)**

- [ ] 注意書き枠の段落ブロックが薄い背景・枠線付きで表示される
- [ ] 改行が正しく反映される
- [ ] リンクをクリックすると `target="_blank"` で別タブで開く
- [ ] スクショと近い見た目になる

**権限**

- [ ] CLIENT_EDITOR が PARAGRAPH を追加・編集・削除できる（canEditForm 経由で許可）
- [ ] CLIENT が編集画面に入れない（既存の `setIsClient` リダイレクトで対応済み）

**回帰確認**

- [ ] 既存の入力フィールド (TEXT/EMAIL/NAME など) は引き続き正常に動く
- [ ] 既存フォームを開いたとき、表示が崩れない
- [ ] フォーム送信時、PARAGRAPH 以外のフィールドは送信データに含まれる

### 6.2 型/ビルドチェック

- `npx tsc --noEmit` でエラー 0
- `npm run build` でビルド成功

## 7. 変更対象ファイル一覧

### 新規作成

- `components/form-renderer/fields/ParagraphBlock.tsx` — 公開フォーム側の描画コンポーネント

### 変更

- `components/builder/FieldPalette.tsx` — 「段落ブロック」追加ボタン
- `components/builder/PropertyPanel.tsx` — PARAGRAPH 選択時の設定 UI
- `components/builder/BuilderCanvas.tsx` — プレビュー描画分岐
- `components/form-renderer/StepForm.tsx` — `type === 'PARAGRAPH'` の分岐で `ParagraphBlock` を描画
- `app/api/forms/[formId]/route.ts` (PUT) — zod スキーマに PARAGRAPH 検証ロジックを追加
- 必要に応じて `lib/validations/` 配下に `paragraphOptionsSchema` を切り出し

## 8. リスクと留意点

- **DB スキーマ変更なし**: 本番反映時のリスクは限定的。Vercel デプロイで自動的に新コードが反映される（前回追加した `prisma migrate deploy` も走るが、migration ファイル変更はないので no-op）。
- **既存フォームへの影響**: `Field` モデルの既存カラム流用なので、既存の TEXT/EMAIL 等のフィールドは何も変わらない。PARAGRAPH を使う新規フィールドだけ新しい `options` 形式を持つ。
- **CSS スコープ**: 埋め込み先サイトの CSS との衝突は ContactHub の既存埋め込みアーキテクチャに依存。今回は新規 Tailwind クラスを使うだけで、既存と同じ仕組みに乗る。
- **本文中のリンク**: スクショの「※の 3 行目に埋め込まれたリンク」は本仕様では再現できない（リンクは本文末尾に追加される）。完全再現が必要になったら Markdown 記法サポートの追加検討。
- **HEADING / DIVIDER**: 同じく schema 上のみ存在する未実装機能だが、本タスクでは PARAGRAPH のみ実装。HEADING / DIVIDER は同様のパターンで将来追加可能。

## 9. 関連リソース

- 既存実装: `components/form-renderer/`, `components/builder/`, `app/api/forms/[formId]/route.ts`
- Prisma schema: `prisma/schema.prisma` の `Field` モデルと `FieldType` enum
- 参考: スクリーンショット (ap-test.net/jd-jewels-test/repair/form/) の「修理受付フォーム」上部の注意書き枠
