/** 自動返信メール本文のプレースホルダー展開ユーティリティ
 *
 * サポートする構文:
 *  - {{ラベル}} … 対応するフィールドの回答（HTMLエスケープ済み）を挿入
 *  - {{全回答}} … 全フィールドの回答を表形式で挿入
 */

import type { Field } from '@prisma/client'

type FieldLike = Pick<Field, 'id' | 'type' | 'label'>

/** HTMLエスケープ */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** フィールド値を表示用のプレーン文字列に整形 */
export function formatFieldValue(field: Pick<FieldLike, 'type'>, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''

  switch (field.type) {
    case 'AGREE':
      return value ? '同意済み' : '未同意'
    case 'CHECKBOX':
      if (Array.isArray(value)) return value.join(', ')
      return String(value)
    case 'NAME': {
      const v = value as { sei?: string; mei?: string; seiKana?: string; meiKana?: string }
      const name = `${v.sei || ''} ${v.mei || ''}`.trim()
      const kana = `${v.seiKana || ''} ${v.meiKana || ''}`.trim()
      return kana ? `${name}（${kana}）` : name
    }
    case 'ZIP': {
      const v = value as { zipcode?: string; prefecture?: string; city?: string; address?: string }
      const zip = v.zipcode ? `〒${v.zipcode} ` : ''
      const addr = `${v.prefecture || ''}${v.city || ''}${v.address || ''}`
      return (zip + addr).trim()
    }
    case 'FILE': {
      const v = value as { name?: string }
      return v?.name || ''
    }
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

/** {{全回答}} 用のHTML表を生成 */
function renderAnswersTable(fields: FieldLike[], data: Record<string, unknown>): string {
  const rows = fields
    .filter((f) => !['HEADING', 'DIVIDER', 'PARAGRAPH'].includes(f.type))
    .map((f) => {
      const v = formatFieldValue(f, data[f.id])
      const display = v || '(未入力)'
      return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9fafb;">${escapeHtml(f.label)}</td><td style="padding:8px;border:1px solid #ddd;">${escapeHtml(display)}</td></tr>`
    })
    .join('')
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0;">${rows}</table>`
}

/** 自動返信メール本文のプレースホルダーを展開 */
export function expandAutoReplyTemplate(
  template: string,
  fields: FieldLike[],
  data: Record<string, unknown>
): string {
  // ラベル→整形済み値 のマップを構築
  const labelMap = new Map<string, string>()
  for (const f of fields) {
    if (['HEADING', 'DIVIDER', 'PARAGRAPH'].includes(f.type)) continue
    labelMap.set(f.label, formatFieldValue(f, data[f.id]))
  }
  const answersTable = renderAnswersTable(fields, data)

  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const k = key.trim()
    if (k === '全回答') return answersTable
    if (labelMap.has(k)) return escapeHtml(labelMap.get(k) || '')
    // 該当ラベルがない場合は空文字
    return ''
  })
}
