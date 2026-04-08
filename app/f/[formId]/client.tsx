'use client'

import React from 'react'
import { BuilderStep } from '@/types/builder'
import { StepForm } from '@/components/form-renderer/StepForm'

/** HEXカラーをHSL空間値（"H S% L%"形式）に変換 */
function hexToHslValues(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
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

interface PublicFormClientProps {
  formId: string
  title: string
  steps: BuilderStep[]
  isPreview?: boolean
  settings: {
    successMessage?: string
    redirectUrl?: string
    primaryColor?: string
    fontFamily?: string
    customCss?: string
    recaptchaEnabled?: boolean
  }
}

/** 公開フォームのクライアントコンポーネント */
export function PublicFormClient({ formId, title, steps, isPreview, settings }: PublicFormClientProps) {
  const { primaryColor, fontFamily, customCss, recaptchaEnabled } = settings
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  // テーマカラーをRGBに変換してCSS変数に注入
  const styleVars = primaryColor
    ? `:root { --form-primary: ${primaryColor}; }`
    : ''
  const fontStyle = fontFamily
    ? `.efo-form { font-family: ${fontFamily}; }`
    : ''
  const injectedStyle = [styleVars, fontStyle, customCss].filter(Boolean).join('\n')

  return (
    <div className="efo-form min-h-screen bg-[hsl(var(--secondary))] py-8 px-4" style={fontFamily ? { fontFamily } : undefined}>
      {injectedStyle && <style dangerouslySetInnerHTML={{ __html: injectedStyle }} />}
      {recaptchaEnabled && recaptchaSiteKey && !isPreview && (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`} />
      )}
      {isPreview && (
        <div className="max-w-xl mx-auto mb-3">
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-yellow-800">
            <span className="font-semibold">プレビューモード</span>
            <span className="text-yellow-600">— このフォームは表示確認用です。送信はできません。</span>
          </div>
        </div>
      )}
      <div
        className="max-w-xl mx-auto bg-[hsl(var(--background))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6 md:p-8"
        style={primaryColor ? { '--primary': hexToHslValues(primaryColor) } as React.CSSProperties : undefined}
      >
        <h1 className="text-xl font-bold mb-6 text-center">{title}</h1>
        <StepForm formId={formId} steps={steps} settings={settings} isPreview={isPreview} />
      </div>
    </div>
  )
}
