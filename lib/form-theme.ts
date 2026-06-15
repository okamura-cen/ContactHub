import { FormSettings } from '@/types/builder'

/** HEXカラーをHSL空間値（"H S% L%" 形式）に変換する。
 *  変換できない場合は入力値をそのまま返す（CSS変数 hsl(var(--xxx)) 用）。 */
export function hexToHslValues(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** 公開フォーム（/f/[formId]：iframe・JS自動調整版の表示元）の簡易デザイン調整CSSを生成する。
 *
 *  iframe 内のフォームは React コンポーネント（shadcn/Tailwind）で描画されるため、
 *  セレクタはその要素構造に合わせる:
 *   - 入力欄: .efo-form input / textarea / select（枠線色は --input 変数で上書きしエラー時の赤枠を保持）
 *   - ボタン: .efo-form button
 *   - ラベル: .efo-form label
 *   - カード: .efo-card（client.tsx で付与）
 *   - 項目: .efo-fields（FormRenderer で付与）
 */
export function buildPublicFormThemeCss(s: Partial<FormSettings>): string {
  const lines: string[] = []

  if (s.formMaxWidth) {
    lines.push(`.efo-card{max-width:${s.formMaxWidth}px;}`)
  }
  if (s.formBgColor) {
    lines.push(`.efo-card{background:${s.formBgColor};}`)
  }
  if (s.borderRadius != null) {
    lines.push(
      `.efo-form input,.efo-form textarea,.efo-form select,.efo-form button{border-radius:${s.borderRadius}px;}`
    )
  }
  if (s.inputBorderColor) {
    // --input を上書き（input/textarea/select は border-[hsl(var(--input))] を使用）。
    // エラー時は --destructive を使うため赤枠は維持される。
    lines.push(`.efo-form{--input:${hexToHslValues(s.inputBorderColor)};}`)
  }
  if (s.labelColor) {
    lines.push(`.efo-form label{color:${s.labelColor};}`)
  }
  if (s.fieldGap != null) {
    // space-y-6（margin ベース）を gap ベースに切り替える
    lines.push(`.efo-fields{display:flex;flex-direction:column;gap:${s.fieldGap}px;}`)
    lines.push(`.efo-fields>*{margin-top:0 !important;}`)
  }

  return lines.join('\n')
}
