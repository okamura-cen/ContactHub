import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PublicFormClient } from './client'

interface PageProps {
  params: Promise<{ formId: string }>
  searchParams: Promise<{ preview?: string }>
}

/** 公開フォームページ（SSR + Client Component） */
export default async function PublicFormPage({ params, searchParams }: PageProps) {
  const { formId } = await params
  const { preview } = await searchParams

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      steps: {
        include: { fields: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!form) {
    notFound()
  }

  // プレビューモード以外では公開済みかつライセンス有効のみ表示
  if (preview !== 'true') {
    if (form.status !== 'PUBLISHED') {
      notFound()
    }
    if (form.licenseStatus !== 'ACTIVE') {
      notFound()
    }
  }

  const builderSteps = form.steps.map((s) => ({
    id: s.id,
    title: s.title,
    fields: s.fields.map((f) => ({
      id: f.id,
      type: f.type.toLowerCase() as 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'zip' | 'name' | 'agree' | 'file' | 'heading' | 'paragraph' | 'divider',
      label: f.label,
      placeholder: f.placeholder || undefined,
      helpText: f.helpText || undefined,
      required: f.required,
      options: (f.options as string[]) || undefined,
      efoSettings: f.efoSettings as { realtimeValidation: boolean; autoFormat: boolean; autoComplete: boolean } | undefined,
      logic: (f.logic as unknown as import('@/types/builder').FieldLogic) || undefined,
    })),
  }))

  const settings = form.settings as Record<string, unknown> | null

  return (
    <PublicFormClient
      formId={form.id}
      title={form.title}
      steps={builderSteps}
      isPreview={preview === 'true'}
      settings={{
        successMessage: (settings?.successMessage as string) || '送信が完了しました。',
        redirectUrl: (settings?.redirectUrl as string) || undefined,
        primaryColor: (settings?.primaryColor as string) || undefined,
        fontFamily: (settings?.fontFamily as string) || undefined,
        customCss: (settings?.customCss as string) || undefined,
        recaptchaEnabled: (settings?.recaptchaEnabled as boolean) || false,
      }}
    />
  )
}
