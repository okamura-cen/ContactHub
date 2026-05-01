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

interface LpSettings {
  lpEnabled?: boolean
  lpLogoUrl?: string
  lpHeroImageUrl?: string
  lpHeading?: string
  lpDescription?: string
  lpBgColor?: string
  lpFooterCompany?: string
  lpFooterText?: string
  lpFooterLinks?: { label: string; url: string }[]
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
  } & LpSettings
}

/** 公開フォームのクライアントコンポーネント */
export function PublicFormClient({ formId, title, steps, isPreview, settings }: PublicFormClientProps) {
  const { primaryColor, fontFamily, customCss, recaptchaEnabled } = settings
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const lp = settings.lpEnabled ? settings : null

  // テーマカラーをCSS変数に注入
  const styleVars = primaryColor ? `:root { --form-primary: ${primaryColor}; }` : ''
  const fontStyle = fontFamily ? `.efo-form { font-family: ${fontFamily}; }` : ''
  const injectedStyle = [styleVars, fontStyle, customCss].filter(Boolean).join('\n')

  const bgStyle = lp?.lpBgColor ? { backgroundColor: lp.lpBgColor } : undefined

  return (
    <div className="efo-form min-h-screen bg-[hsl(var(--secondary))]" style={{ ...bgStyle, fontFamily: fontFamily || undefined }}>
      {injectedStyle && <style dangerouslySetInnerHTML={{ __html: injectedStyle }} />}
      {recaptchaEnabled && recaptchaSiteKey && !isPreview && (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`} />
      )}

      {/* LP: ロゴヘッダー */}
      {lp?.lpLogoUrl && (
        <div className="flex justify-center py-6 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lp.lpLogoUrl} alt="Logo" className="h-10 object-contain" />
        </div>
      )}

      {/* LP: ヒーロー画像 */}
      {lp?.lpHeroImageUrl && (
        <div className="w-full max-w-3xl mx-auto px-4 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lp.lpHeroImageUrl} alt="" className="w-full rounded-lg object-cover max-h-[300px]" />
        </div>
      )}

      <div className="py-8 px-4">
        {isPreview && (
          <div className="max-w-xl mx-auto mb-3">
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-yellow-800">
              <span className="font-semibold">プレビューモード</span>
              <span className="text-yellow-600">— このフォームは表示確認用です。送信はできません。</span>
            </div>
          </div>
        )}

        {/* LP: 見出し・説明文 */}
        {lp && (lp.lpHeading || lp.lpDescription) && (
          <div className="max-w-xl mx-auto mb-6 text-center">
            {lp.lpHeading && <h1 className="text-2xl font-bold mb-2">{lp.lpHeading}</h1>}
            {lp.lpDescription && <p className="text-sm text-gray-600 whitespace-pre-wrap">{lp.lpDescription}</p>}
          </div>
        )}

        <div
          className="max-w-xl mx-auto bg-[hsl(var(--background))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6 md:p-8"
          style={primaryColor ? { '--primary': hexToHslValues(primaryColor) } as React.CSSProperties : undefined}
        >
          {/* LP無効時のみフォームタイトルを表示（LP有効時は上の見出しで代替） */}
          {!lp && <h1 className="text-xl font-bold mb-6 text-center">{title}</h1>}
          {lp && !lp.lpHeading && <h1 className="text-xl font-bold mb-6 text-center">{title}</h1>}
          <StepForm formId={formId} steps={steps} settings={settings} isPreview={isPreview} />
        </div>
      </div>

      {/* LP: フッター */}
      {lp && (lp.lpFooterCompany || lp.lpFooterText || (lp.lpFooterLinks && lp.lpFooterLinks.length > 0)) && (
        <footer className="mt-12 py-8 px-4 border-t border-gray-200">
          <div className="max-w-xl mx-auto text-center text-sm text-gray-500 space-y-2">
            {lp.lpFooterCompany && <p className="font-medium text-gray-700">{lp.lpFooterCompany}</p>}
            {lp.lpFooterText && <p className="whitespace-pre-wrap text-xs">{lp.lpFooterText}</p>}
            {lp.lpFooterLinks && lp.lpFooterLinks.length > 0 && (
              <div className="flex justify-center gap-4 pt-2">
                {lp.lpFooterLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-600 underline">
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
