/** 繰り返し入力フィールド（text/date を複数追加できる機能）の共通ユーティリティ
 *
 *  text/date フィールドの options（JSON）に { repeatable, maxItems } を持たせる。
 *  - repeatable: true で繰り返しを有効化
 *  - maxItems: 上限個数（1〜5、未設定時は既定値 5）
 *
 *  ※ select/radio/checkbox は options が string[]（選択肢配列）なので衝突しない。
 */

/** 上限個数の許容範囲（管理者が設定できる最大値） */
export const REPEATABLE_MAX_LIMIT = 5
/** maxItems 未設定時の既定上限 */
export const REPEATABLE_DEFAULT_MAX = 5

export interface RepeatableOptions {
  repeatable?: boolean
  maxItems?: number
}

export interface RepeatableConfig {
  repeatable: boolean
  maxItems: number
}

/** フィールドの繰り返し設定を読み取る（type は大小文字どちらでも可）。
 *  text/date 以外、または options がオブジェクトでない場合は repeatable:false を返す。 */
export function getRepeatableConfig(field: { type: string; options?: unknown }): RepeatableConfig {
  const t = String(field.type).toLowerCase()
  if (t !== 'text' && t !== 'date') {
    return { repeatable: false, maxItems: REPEATABLE_DEFAULT_MAX }
  }
  const o = field.options
  if (!o || typeof o !== 'object' || Array.isArray(o)) {
    return { repeatable: false, maxItems: REPEATABLE_DEFAULT_MAX }
  }
  const r = o as RepeatableOptions
  const repeatable = r.repeatable === true
  let maxItems =
    typeof r.maxItems === 'number' && !Number.isNaN(r.maxItems)
      ? Math.floor(r.maxItems)
      : REPEATABLE_DEFAULT_MAX
  if (maxItems < 1) maxItems = 1
  if (maxItems > REPEATABLE_MAX_LIMIT) maxItems = REPEATABLE_MAX_LIMIT
  return { repeatable, maxItems }
}
