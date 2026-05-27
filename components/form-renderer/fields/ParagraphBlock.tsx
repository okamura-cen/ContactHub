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
