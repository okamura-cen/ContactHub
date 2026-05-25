# 段落ブロック (PARAGRAPH) 機能 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** フォームに装飾付きの注意書き・案内文ブロック (PARAGRAPH) を追加できるようにする。既存の `FieldType.PARAGRAPH` enum を実際に動作させる。

**Architecture:** DB スキーマ変更なし。既存 Field モデルの `label` (本文として流用) / `linkUrl` / `options` を活用。新規コンポーネント `ParagraphBlock` を form-renderer 側に追加し、StepForm から呼ぶ。ビルダー側は既存 PropertyPanel の paragraph 分岐に style/linkText/linkUrl の設定 UI を追加。

**Tech Stack:** Next.js 14 (App Router), TypeScript, React, Tailwind, zod

**設計書:** [docs/superpowers/specs/2026-05-22-paragraph-block-design.md](../specs/2026-05-22-paragraph-block-design.md)

**設計書からの変更点:** 設計書では「label=タイトル, helpText=本文」としていたが、既存実装の踏襲と YAGNI のため「label=本文、タイトル機能なし」に簡略化。スクショの再現には影響なし。

**テスト方針:** 自動テスト基盤がないため、各タスクは「実装 → `npx tsc --noEmit` → コミット」。最終タスクで手動 QA を実施。

---

## ファイル構造

### 新規作成

- `components/form-renderer/fields/ParagraphBlock.tsx` — 公開フォーム側の描画コンポーネント

### 変更

- `types/builder.ts` — `BuilderField` に `options` の型を JSON 形式 (style/linkText) として扱う方針追加。linkUrl は既存。
- `components/builder/PropertyPanel.tsx` — paragraph 選択時にスタイル選択、リンクテキスト、リンク URL 入力を追加
- `components/form-renderer/StepForm.tsx` — `field.type === 'paragraph'` の分岐で `ParagraphBlock` を描画
- `app/api/forms/[formId]/route.ts` — PUT body の zod 検証に PARAGRAPH 用のルールを追加（または既存 field 検証ロジックを強化）

---

## 設計上の決定事項

### Field カラム流用マッピング (PARAGRAPH 時)

| カラム | 用途 | 必須/任意 |
|---|---|---|
| `type` | `'paragraph'` 固定 | - |
| `label` | **本文（改行可）** | 必須 |
| `linkUrl` | リンク URL（http/https のみ） | 任意 |
| `options` | `{ style, linkText }` を JSON | options.style 必須 (default 'plain') |
| `placeholder`, `helpText`, `required`, `efoSettings`, `logic` | 未使用 | - |

### options JSON 型

```ts
type ParagraphOptions = {
  style: 'plain' | 'notice' | 'emphasis'
  linkText?: string
}
```

### 装飾プリセット

| style | Tailwind クラス |
|---|---|
| `plain` | `text-sm text-foreground` |
| `notice` | `border border-border bg-muted/40 rounded-md p-4 text-sm` |
| `emphasis` | `border-l-4 border-primary bg-primary/5 rounded-md p-4 text-sm font-medium` |

---

## Task 1: ParagraphBlock コンポーネントを新規作成

**Files:**
- Create: `components/form-renderer/fields/ParagraphBlock.tsx`

**狙い:** 公開フォーム側で段落ブロックを描画する純粋な表示コンポーネント。Props を受け取って `style` に応じた装飾を適用。

- [ ] **Step 1: ファイル新規作成**

`components/form-renderer/fields/ParagraphBlock.tsx` を以下の内容で作成：

```tsx
'use client'

import { isAbsoluteHttpUrl } from '@/lib/validations/url'

export type ParagraphStyle = 'plain' | 'notice' | 'emphasis'

export interface ParagraphBlockProps {
  body: string
  style?: ParagraphStyle
  linkText?: string
  linkUrl?: string
}

// 装飾プリセット
const STYLE_CLASSES: Record<ParagraphStyle, string> = {
  plain: 'text-sm text-[hsl(var(--foreground))]',
  notice:
    'border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] rounded-md p-4 text-sm text-[hsl(var(--foreground))]',
  emphasis:
    'border-l-4 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)] rounded-md p-4 text-sm font-medium text-[hsl(var(--foreground))]',
}

/**
 * 段落ブロック (FieldType: PARAGRAPH) の表示コンポーネント。
 * 入力フィールドではなく、装飾付きテキスト/リンクを描画する。
 *
 * - body: 必須。空なら何も描画しない (null を返す)。
 * - style: 想定外文字列は 'plain' にフォールバック。
 * - linkText + linkUrl: 両方揃って http/https の URL のときのみリンク表示。
 *   片方欠落・スキーム不正は無視 (本文のみ表示)。
 */
export function ParagraphBlock({ body, style, linkText, linkUrl }: ParagraphBlockProps) {
  if (!body || body.trim() === '') return null

  const resolvedStyle: ParagraphStyle =
    style === 'notice' || style === 'emphasis' ? style : 'plain'

  const showLink = !!(linkText && linkUrl && isAbsoluteHttpUrl(linkUrl))

  return (
    <div className={STYLE_CLASSES[resolvedStyle]}>
      <p className="whitespace-pre-line">{body}</p>
      {showLink && (
        <p className="mt-2">
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[hsl(var(--primary))] underline"
          >
            {linkText}
          </a>
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: URL 検証ヘルパーを新規作成（同タスク内）**

`lib/validations/url.ts` を以下の内容で作成：

```ts
/**
 * http:// または https:// で始まる絶対 URL かどうかを判定する。
 * javascript: / data: / file: などの危険なスキームを除外する用途。
 */
export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 4: Commit**

```bash
git add components/form-renderer/fields/ParagraphBlock.tsx lib/validations/url.ts
git commit -m "feat: ParagraphBlock コンポーネントと isAbsoluteHttpUrl ヘルパーを追加"
```

---

## Task 2: StepForm で PARAGRAPH を描画する

**Files:**
- Modify: `components/form-renderer/StepForm.tsx`

**狙い:** 既存の StepForm は PARAGRAPH を集計対象外として扱うだけで、表示していない。`field.type === 'paragraph'` のときに `ParagraphBlock` を描画する分岐を追加する。

- [ ] **Step 1: StepForm.tsx を読んでフィールド描画箇所を特定**

Run: `grep -n "switch\|field.type ===\|return.*null\|case '" components/form-renderer/StepForm.tsx | head -30`

フィールドタイプで分岐している箇所を見つける。`heading`/`paragraph`/`divider` を「除外」している箇所と、各フィールドタイプを描画している箇所を確認。

- [ ] **Step 2: PARAGRAPH 分岐を追加**

該当ファイルの import に追加：

```tsx
import { ParagraphBlock } from '@/components/form-renderer/fields/ParagraphBlock'
```

各フィールドをループでレンダリングしている箇所（実装ファイル内の `fields.map` または同等のループ）に PARAGRAPH 分岐を追加。具体的なパターンとしては、各 case の前に以下を入れる：

```tsx
if (field.type === 'paragraph') {
  const options = (field.options as { style?: string; linkText?: string } | undefined) ?? undefined
  const style = options?.style === 'notice' || options?.style === 'emphasis' ? options.style : 'plain'
  return (
    <ParagraphBlock
      key={field.id}
      body={field.label}
      style={style}
      linkText={options?.linkText}
      linkUrl={field.linkUrl ?? undefined}
    />
  )
}
```

> 注: 既存ファイルの構造に応じて配置を調整。StepForm.tsx の fields ループは複雑な場合がある（条件付き表示など）。実装時にファイルを読んで、各フィールドを描画している `return` ブロックの先頭に追加する。

- [ ] **Step 3: HEADING / DIVIDER 除外ロジックは現状維持**

既存の `['heading', 'divider'].includes(field.type)` の早期 return 等は変更しない（PARAGRAPH を除外していたら除外を外す、PARAGRAPH を「除外」したまま「描画」できるよう順序を調整する）。

具体的には、PARAGRAPH を「除外」する箇所があれば、その前で先に「描画」する。例：

```diff
- if (['heading', 'paragraph', 'divider'].includes(field.type)) {
+ if (field.type === 'paragraph') {
+   return (<ParagraphBlock ... />)
+ }
+ if (['heading', 'divider'].includes(field.type)) {
    return null  // ← HEADING/DIVIDER は引き続き未実装、何も描画しない
  }
```

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 5: Commit**

```bash
git add components/form-renderer/StepForm.tsx
git commit -m "feat: StepForm で PARAGRAPH を ParagraphBlock として描画"
```

---

## Task 3: PropertyPanel に PARAGRAPH 用設定 UI を追加

**Files:**
- Modify: `components/builder/PropertyPanel.tsx`

**狙い:** ビルダー画面で PARAGRAPH を選択しているとき、本文（既存）に加えてスタイル選択 / リンクテキスト / リンク URL の入力欄を追加する。

- [ ] **Step 1: PropertyPanel.tsx を確認**

既存の `field.type === 'paragraph'` 分岐の本文編集 UI（テキストエリア）を起点に、その下に新規 UI を追加する。

- [ ] **Step 2: 既存ファイルに UI 追加**

既存の paragraph 本文編集 (テキストエリア) の **直後**、かつ「プレースホルダー」「リンクURL（agree 型のみ）」セクションの **前** に以下を追加：

```tsx
        {/* PARAGRAPH 用の追加設定 */}
        {field.type === 'paragraph' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">スタイル</Label>
              <div className="flex gap-2">
                {(['plain', 'notice', 'emphasis'] as const).map((s) => {
                  const opts = (field.options as { style?: string } | undefined) ?? undefined
                  const current = (opts?.style === 'notice' || opts?.style === 'emphasis')
                    ? opts.style
                    : 'plain'
                  const label = s === 'plain' ? 'プレーン' : s === 'notice' ? '注意書き枠' : '強調枠'
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const prev = (field.options as Record<string, unknown> | undefined) ?? {}
                        updateField({ options: { ...prev, style: s } as unknown as string[] })
                      }}
                      className={`text-xs px-3 py-1.5 rounded-md border ${
                        current === s
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                          : 'border-[hsl(var(--border))]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">リンクテキスト（任意）</Label>
              <Input
                value={((field.options as { linkText?: string } | undefined)?.linkText) ?? ''}
                onChange={(e) => {
                  const prev = (field.options as Record<string, unknown> | undefined) ?? {}
                  updateField({ options: { ...prev, linkText: e.target.value } as unknown as string[] })
                }}
                className="text-sm h-9"
                placeholder="詳細はこちら"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">リンクURL（任意）</Label>
              <Input
                type="url"
                value={field.linkUrl ?? ''}
                onChange={(e) => updateField({ linkUrl: e.target.value })}
                className="text-sm h-9"
                placeholder="https://example.com/page"
              />
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                リンクテキストと URL を両方入力すると、本文の下にリンクが表示されます。
              </p>
            </div>
          </>
        )}
```

> 注: `BuilderField.options` の型は現状 `string[]` (select/radio 用)。paragraph では `{ style, linkText }` という別構造を入れる。TypeScript の型キャスト (`as unknown as string[]`) が必要。これは types/builder.ts を Task 6 で整理するまでの暫定対応。

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。型キャストで吸収されているはず。

- [ ] **Step 4: Commit**

```bash
git add components/builder/PropertyPanel.tsx
git commit -m "feat: PropertyPanel に PARAGRAPH 用のスタイル/リンク設定 UI を追加"
```

---

## Task 4: types/builder.ts の BuilderField.options を JSON 対応に拡張

**Files:**
- Modify: `types/builder.ts`

**狙い:** Task 3 で使った型キャスト (`as unknown as string[]`) を削除し、`options` を `string[]` または `Record<string, unknown>` を受けられるよう拡張する。

- [ ] **Step 1: BuilderField の options 型を拡張**

既存の `options?: string[]` を以下に変更：

```ts
  /** select/radio/checkbox: 選択肢一覧
   *  paragraph: { style: 'plain'|'notice'|'emphasis', linkText?: string }
   *  フィールドタイプによって意味が変わるため Record で柔軟に。 */
  options?: string[] | Record<string, unknown>
```

- [ ] **Step 2: Task 3 の型キャストを整理**

`components/builder/PropertyPanel.tsx` の `as unknown as string[]` キャストを削除する（`options` 型に Record を含めたので不要）。

具体的には Task 3 で書いた以下のような行：

```tsx
updateField({ options: { ...prev, style: s } as unknown as string[] })
```

を以下に変更：

```tsx
updateField({ options: { ...prev, style: s } })
```

リンクテキスト入力の onChange も同様。

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

他のファイル（PropertyPanel の select/radio 用 options など）で型エラーが出る可能性。

```tsx
const options = [...(field.options || [])]
options[index] = value
```

これは `field.options` が `Record` の場合は配列ではない。型ガードを追加：

```tsx
const options = [...(Array.isArray(field.options) ? field.options : [])]
options[index] = value
```

`addOption` / `removeOption` も同様に `Array.isArray` ガードを追加。

```tsx
const addOption = () => {
  const prev = Array.isArray(field.options) ? field.options : []
  updateField({ options: [...prev, `選択肢${prev.length + 1}`] })
}

const removeOption = (index: number) => {
  const prev = Array.isArray(field.options) ? field.options : []
  updateField({ options: prev.filter((_, i) => i !== index) })
}
```

`tsc --noEmit` を再実行してエラー 0 を確認。

- [ ] **Step 4: Commit**

```bash
git add types/builder.ts components/builder/PropertyPanel.tsx
git commit -m "refactor: BuilderField.options を string[] | Record に拡張し型キャストを除去"
```

---

## Task 5: PUT /api/forms/[formId] の zod 検証で PARAGRAPH をチェック

**Files:**
- Modify: `app/api/forms/[formId]/route.ts`

**狙い:** PARAGRAPH フィールドの保存時に本文必須・URL スキーム制限・リンクのセット入力を zod で検証する。

- [ ] **Step 1: ファイルを読み、既存の保存処理に zod 検証を追加できる箇所を確認**

現状 `PUT /api/forms/[formId]` は body から `{ title, description, status, settings, steps }` を取り出してそのまま保存している。zod 検証は未実装。

PARAGRAPH 用の最小検証を追加する。

- [ ] **Step 2: PARAGRAPH 検証ロジックを追加**

ファイル冒頭の import に追加：

```ts
import { z } from 'zod'
import { isAbsoluteHttpUrl } from '@/lib/validations/url'
```

PUT 関数内、`const { title, description, status, settings, steps } = body` の **直後**に以下の検証を追加：

```ts
    // PARAGRAPH フィールドのバリデーション
    // (既存の他フィールドは現状検証なしのため、本タスクでは PARAGRAPH のみに絞る)
    if (Array.isArray(steps)) {
      for (const step of steps) {
        if (!Array.isArray(step.fields)) continue
        for (const f of step.fields) {
          if (f.type !== 'paragraph' && f.type !== 'PARAGRAPH') continue

          // 本文必須
          const body = typeof f.label === 'string' ? f.label.trim() : ''
          if (!body) {
            return NextResponse.json(
              { error: '段落ブロックの本文を入力してください' },
              { status: 400 },
            )
          }

          // スタイル: 想定外値はサーバー側で plain に正規化する (フロントエンドで壊れた値が送られても安全側に倒す)
          const opts = (f.options ?? {}) as { style?: string; linkText?: string }
          if (opts.style !== undefined && !['plain', 'notice', 'emphasis'].includes(opts.style)) {
            return NextResponse.json(
              { error: '段落ブロックのスタイル指定が不正です' },
              { status: 400 },
            )
          }

          // リンク URL: http/https のみ
          if (f.linkUrl) {
            if (typeof f.linkUrl !== 'string' || !isAbsoluteHttpUrl(f.linkUrl)) {
              return NextResponse.json(
                { error: 'リンク URL は http:// または https:// で始まる必要があります' },
                { status: 400 },
              )
            }
          }

          // リンクテキストと URL のセット入力
          const hasLinkText = typeof opts.linkText === 'string' && opts.linkText.trim() !== ''
          const hasLinkUrl = typeof f.linkUrl === 'string' && f.linkUrl.trim() !== ''
          if (hasLinkText !== hasLinkUrl) {
            return NextResponse.json(
              { error: 'リンクテキストと URL は両方入力してください' },
              { status: 400 },
            )
          }
        }
      }
    }
```

> 注: `f.type` は大文字小文字どちらでも比較するため両方対応。Prisma に保存時は uppercase 化される (既存コード `(f.type as string).toUpperCase()` がある)。

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

`z` の import は実は使っていない（zod 検証ロジックを書く代わりに素朴な if 文で対応した）。`import { z } from 'zod'` は削除する。

- [ ] **Step 4: Commit**

```bash
git add app/api/forms/[formId]/route.ts
git commit -m "feat: /api/forms/[formId] PUT で PARAGRAPH フィールドの入力検証を追加"
```

---

## Task 6: ビルダー保存時のクライアント側ガード

**Files:**
- Modify: `app/(dashboard)/forms/[formId]/edit/page.tsx`

**狙い:** ビルダーで保存ボタンを押したときに、PARAGRAPH の不正状態を即時 toast で知らせる（UX 改善）。サーバー側ガード（Task 5）が最終防衛線。

- [ ] **Step 1: 既存の handleSave / save ロジックを確認**

ファイルを読んで、保存ボタンの handler を特定。

- [ ] **Step 2: 保存前バリデーションを追加**

handler の冒頭（fetch 呼び出し前）に以下を追加：

```tsx
    // PARAGRAPH フィールドのクライアント側バリデーション
    for (const step of steps) {
      for (const f of step.fields) {
        if (f.type !== 'paragraph') continue

        if (!f.label || !f.label.trim()) {
          toast({ title: '段落ブロックの本文を入力してください', variant: 'destructive' })
          return
        }

        const opts = (f.options as { linkText?: string } | undefined) ?? undefined
        const hasLinkText = !!(opts?.linkText && opts.linkText.trim())
        const hasLinkUrl = !!(f.linkUrl && f.linkUrl.trim())

        if (hasLinkText !== hasLinkUrl) {
          toast({
            title: 'リンクテキストと URL は両方入力してください',
            variant: 'destructive',
          })
          return
        }

        if (hasLinkUrl && f.linkUrl) {
          try {
            const u = new URL(f.linkUrl)
            if (u.protocol !== 'http:' && u.protocol !== 'https:') {
              throw new Error('invalid scheme')
            }
          } catch {
            toast({
              title: 'リンク URL は http:// または https:// で始まる正しい形式で入力してください',
              variant: 'destructive',
            })
            return
          }
        }
      }
    }
```

> 注: handler 内で `steps` 変数として state を参照していると想定。実際の変数名はファイルを読んで確認。

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: TypeScript エラー 0。

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/forms/[formId]/edit/page.tsx"
git commit -m "feat: ビルダー保存時に PARAGRAPH の入力チェックを追加"
```

---

## Task 7: 手動 QA を実施する

**狙い:** 設計書 §6.1 のチェックリストを実機で実行する。

- [ ] **Step 1: ローカル起動 + 段落ブロック作成**

Run: `npm run dev`
Expected: `http://localhost:3000` 起動。

AGENCY または CLIENT_EDITOR でログインし、既存 or 新規フォームの編集画面 (`/forms/<id>/edit`) を開く。

- [ ] **Step 2: ビルダー UI チェック**

- [ ] 左パレットの「レイアウト > テキスト」をクリック → 新しいフィールドが追加される
- [ ] 追加されたフィールドを選択 → 右パネルに「テキスト内容」「スタイル」「リンクテキスト」「リンク URL」が表示される
- [ ] スタイルボタン (プレーン/注意書き枠/強調枠) を切り替えると、選択中ボタンがハイライトされる
- [ ] 本文を入力できる、改行も入力できる
- [ ] リンクテキストと URL を入力できる

- [ ] **Step 3: バリデーションチェック**

- [ ] 本文を空にして保存 → トースト「段落ブロックの本文を入力してください」
- [ ] リンクテキストだけ入力して保存 → トースト「リンクテキストと URL は両方入力してください」
- [ ] リンク URL に `javascript:alert(1)` を入力して保存 → トースト「リンク URL は http:// または https:// ...」
- [ ] 正常な値（本文 + style=notice + リンクテキスト + https URL）で保存成功

- [ ] **Step 4: 公開フォームでの表示チェック**

保存したフォームを `/f/<id>` または埋め込みコード経由で開く。

- [ ] 注意書き枠の段落ブロックが薄いグレー背景・枠線付きで表示される
- [ ] プレーンスタイル: 装飾なし、ただの段落として表示
- [ ] 強調枠スタイル: 左に色帯、薄い背景色、太字
- [ ] 本文の改行が反映される
- [ ] リンクがクリックでき、`target="_blank"` で別タブで開く

- [ ] **Step 5: 権限チェック**

- [ ] CLIENT_EDITOR で同じフォームを編集 → 段落ブロックを追加・編集・削除できる
- [ ] CLIENT は編集画面に入れない (既存リダイレクトで対応)

- [ ] **Step 6: 回帰チェック**

- [ ] 既存の TEXT/EMAIL/NAME フィールドは引き続き正常に動く
- [ ] 既存フォームを開いて表示崩れがないか
- [ ] フォーム送信時、PARAGRAPH 以外のフィールドが送信データに含まれる

- [ ] **Step 7: 最終ビルド/型チェック**

Run: `npx tsc --noEmit && npm run build`
Expected: 両方ともエラー 0。

- [ ] **Step 8: git status 確認**

Run: `git status`
Expected: clean (未コミット変更なし)

---

## 完了条件

- 上記 7 タスクすべての完了
- Task 7 のチェックリストで発見された不具合がすべて解消されていること
- `npx tsc --noEmit` がエラーなく通る
- main ブランチへ PR / マージできる状態
