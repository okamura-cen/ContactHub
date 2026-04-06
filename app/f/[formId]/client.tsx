'use client'

import React from 'react'
import { BuilderStep } from '@/types/builder'
import { StepForm } from '@/components/form-renderer/StepForm'

interface PublicFormClientProps {
  formId: string
  title: string
  steps: BuilderStep[]
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
export function PublicFormClient({ formId, title, steps, settings }: PublicFormClientProps) {
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
      {recaptchaEnabled && recaptchaSiteKey && (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`} />
      )}
      <div
        className="max-w-xl mx-auto bg-[hsl(var(--background))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6 md:p-8"
        style={primaryColor ? { '--primary': primaryColor } as React.CSSProperties : undefined}
      >
        <h1 className="text-xl font-bold mb-6 text-center">{title}</h1>
        <StepForm formId={formId} steps={steps} settings={settings} />
      </div>
    </div>
  )
}
