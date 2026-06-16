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

/** フィールド値を表示用のプレーン文字列に整形
 *  opts.nameHonorific: NAME（氏名）の末尾に「様」を付ける（自動返信メールの全回答差し込み用） */
export function formatFieldValue(
  field: Pick<FieldLike, 'type'>,
  value: unknown,
  opts?: { nameHonorific?: boolean }
): string {
  if (value === null || value === undefined || value === '') return ''

  switch (field.type) {
    case 'AGREE':
      return value ? '同意済み' : '未同意'
    case 'CHECKBOX':
      if (Array.isArray(value)) return value.join(', ')
      return String(value)
    case 'TEXT':
    case 'DATE':
      // 繰り返し入力（配列）は番号付き箇条書き、単一値は従来どおり
      if (Array.isArray(value)) {
        const items = value.filter((v) => String(v).trim() !== '')
        return items.map((v, i) => `${i + 1}. ${v}`).join('\n')
      }
      return String(value)
    case 'NAME': {
      const v = value as { sei?: string; mei?: string; seiKana?: string; meiKana?: string }
      const name = `${v.sei || ''} ${v.mei || ''}`.trim()
      const kana = `${v.seiKana || ''} ${v.meiKana || ''}`.trim()
      if (!name) return ''
      const base = kana ? `${name}（${kana}）` : name
      // 自動返信メールの全回答差し込み時のみ「様」を付ける
      return opts?.nameHonorific ? `${base} 様` : base
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

/** 回答内容を全件HTML表として描画
 *  - 自動返信メール本文の {{全回答}} 展開
 *  - 管理者通知メールの本体
 * の両方で使用 */
export function renderAnswersTable(
  fields: FieldLike[],
  data: Record<string, unknown>,
  opts?: { nameHonorific?: boolean }
): string {
  const rows = fields
    .filter((f) => !['HEADING', 'DIVIDER', 'PARAGRAPH'].includes(f.type))
    .map((f) => {
      const v = formatFieldValue(f, data[f.id], opts)
      const display = v || '(未入力)'
      // 番号付き箇条書き等の改行は <br> に変換してセル内で改行表示
      const displayHtml = escapeHtml(display).replace(/\r?\n/g, '<br>')
      return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9fafb;">${escapeHtml(f.label)}</td><td style="padding:8px;border:1px solid #ddd;">${displayHtml}</td></tr>`
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
  // 自動返信（お客様宛）の全回答テーブルでは氏名に「様」を付ける
  const answersTable = renderAnswersTable(fields, data, { nameHonorific: true })

  const expanded = template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const k = key.trim()
    if (k === '全回答') return answersTable
    if (labelMap.has(k)) return escapeHtml(labelMap.get(k) || '')
    // 該当ラベルがない場合は空文字
    return ''
  })

  // HTMLメールでは生の改行は空白に折り畳まれるため <br> に変換
  // （{{全回答}} で挿入される <table> 内には改行が含まれないため影響なし）
  return expanded.replace(/\r?\n/g, '<br>')
}
