'use client'

import { BuilderStep } from '@/types/builder'
import { StepForm } from '@/components/form-renderer/StepForm'

interface PublicFormClientProps {
  formId: string
  title: string
  steps: BuilderStep[]
  settings: {
    successMessage?: string
    redirectUrl?: string
  }
}

/** 公開フォームのクライアントコンポーネント */
export function PublicFormClient({ formId, title, steps, settings }: PublicFormClientProps) {
  return (
    <div className="min-h-screen bg-[hsl(var(--secondary))] py-8 px-4">
      <div className="max-w-xl mx-auto bg-[hsl(var(--background))] rounded-lg shadow-sm border border-[hsl(var(--border))] p-6 md:p-8">
        <h1 className="text-xl font-bold mb-6 text-center">{title}</h1>
        <StepForm formId={formId} steps={steps} settings={settings} />
      </div>
    </div>
  )
}
