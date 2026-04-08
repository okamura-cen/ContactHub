'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { BuilderStep, BuilderField } from '@/types/builder'
import { buildZodSchema } from '@/lib/validations/field-validators'
import { FormRenderer } from './FormRenderer'
import { Button } from '@/components/ui/button'

interface StepFormProps {
  steps: BuilderStep[]
  formId: string
  isPreview?: boolean
  settings: {
    successMessage?: string
    redirectUrl?: string
    recaptchaEnabled?: boolean
  }
}

/** セッションIDを生成または取得 */
function getSessionId(): string {
  const key = 'efo_session_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem(key, id)
  }
  return id
}

/** ステップ式フォーム制御コンポーネント */
export function StepForm({ steps, formId, settings, isPreview }: StepFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const startTimeRef = useRef(Date.now())
  const formRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string>('')

  // セッションID初期化 & VIEW イベント送信（プレビュー時はスキップ）
  useEffect(() => {
    sessionIdRef.current = getSessionId()
    if (isPreview) return
    fetch(`/api/forms/${formId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'VIEW', sessionId: sessionIdRef.current }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalSteps = steps.length
  const currentStep = steps[currentStepIndex]
  const isLastStep = currentStepIndex === totalSteps - 1
  const progressPercent = ((currentStepIndex + 1) / (totalSteps + 1)) * 100 // +1 for confirmation

  // ステップ遷移アニメーション
  const animateTransition = useCallback((callback: () => void) => {
    setTransitioning(true)
    setTimeout(() => {
      callback()
      setTransitioning(false)
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)
  }, [])

  // フィールド値変更
  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    // エラーをクリア
    setErrors((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }, [])

  // フィールドblur時のバリデーション
  const handleBlur = useCallback((fieldId: string) => {
    const field = currentStep?.fields.find((f) => f.id === fieldId)
    if (!field || ['heading', 'divider'].includes(field.type)) return

    const schema = buildZodSchema([field])
    const result = schema.safeParse({ [fieldId]: values[fieldId] })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const msg = fieldErrors[fieldId]?.[0]
      if (msg) {
        setErrors((prev) => ({ ...prev, [fieldId]: msg }))
      }
    } else {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }, [currentStep, values])

  // 現在ステップのバリデーション
  const validateCurrentStep = useCallback((): boolean => {
    if (!currentStep) return false
    const validatableFields = currentStep.fields.filter(
      (f) => !['heading', 'divider'].includes(f.type)
    )
    const schema = buildZodSchema(validatableFields)
    const fieldValues: Record<string, unknown> = {}
    validatableFields.forEach((f) => {
      fieldValues[f.id] = values[f.id]
    })

    const result = schema.safeParse(fieldValues)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const newErrors: Record<string, string> = {}
      Object.entries(fieldErrors).forEach(([key, msgs]) => {
        if (msgs && msgs.length > 0) {
          newErrors[key] = msgs[0]
        }
      })
      setErrors(newErrors)

      // 最初のエラーフィールドにフォーカス
      const firstErrorField = validatableFields.find((f) => newErrors[f.id])
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField.id)
        el?.focus()
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }
    setErrors({})
    return true
  }, [currentStep, values])

  // 次へ
  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return
    // ステップ完了イベント送信（プレビュー時はスキップ）
    if (!isPreview) {
      fetch(`/api/forms/${formId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'STEP_COMPLETE', stepIndex: currentStepIndex, sessionId: sessionIdRef.current }),
      }).catch(() => {})
    }
    if (isLastStep) {
      setShowConfirmation(true)
      return
    }
    animateTransition(() => {
      setCurrentStepIndex((prev) => prev + 1)
    })
  }, [validateCurrentStep, isLastStep, animateTransition, formId, currentStepIndex])

  // 戻る
  const handleBack = useCallback(() => {
    if (showConfirmation) {
      setShowConfirmation(false)
      return
    }
    if (currentStepIndex > 0) {
      animateTransition(() => {
        setCurrentStepIndex((prev) => prev - 1)
      })
    }
  }, [currentStepIndex, showConfirmation, animateTransition])

  // 送信
  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      let recaptchaToken: string | undefined
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
      if (settings.recaptchaEnabled && siteKey && typeof window !== 'undefined' && (window as unknown as { grecaptcha?: { execute: (key: string, options: { action: string }) => Promise<string> } }).grecaptcha) {
        try {
          recaptchaToken = await (window as unknown as { grecaptcha: { execute: (key: string, options: { action: string }) => Promise<string> } }).grecaptcha.execute(siteKey, { action: 'submit' })
        } catch {
          // reCAPTCHA失敗時も送信続行
        }
      }

      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: values,
          recaptchaToken,
          metadata: {
            completionTimeMs: Date.now() - startTimeRef.current,
          },
        }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        // 送信完了イベント
        fetch(`/api/forms/${formId}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'SUBMIT', sessionId: sessionIdRef.current }),
        }).catch(() => {})
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl
          return
        }
        setSubmitMessage(result.successMessage || settings.successMessage || '送信が完了しました。')
        setSubmitted(true)
        // iframe内の場合、親に高さを通知
        window.parent?.postMessage({ type: 'efo-form-submitted', formId }, '*')
      } else {
        setErrors({ _form: result.error || '送信に失敗しました。時間をおいて再度お試しください。' })
      }
    } catch {
      setErrors({ _form: '送信に失敗しました。時間をおいて再度お試しください。' })
    } finally {
      setSubmitting(false)
    }
  }, [formId, values, settings.successMessage])

  // iframe高さ自動通知
  useEffect(() => {
    const notify = () => {
      const height = document.body.scrollHeight
      window.parent?.postMessage({ type: 'efo-form-resize', formId, height }, '*')
    }
    notify()
    const observer = new ResizeObserver(notify)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [formId, currentStepIndex, showConfirmation, submitted])

  // 完了画面
  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-semibold mb-2">送信完了</h2>
        <p className="text-[hsl(var(--muted-foreground))]">{submitMessage}</p>
      </div>
    )
  }

  // 確認画面
  if (showConfirmation) {
    const allFields = steps.flatMap((s) => s.fields).filter((f) => !['heading', 'paragraph', 'divider'].includes(f.type))

    return (
      <div ref={formRef}>
        {/* 進捗バー */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))] mb-1">
            <span>確認</span>
            <span>100%</span>
          </div>
          <div className="h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
            <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300" style={{ width: '100%' }} />
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">入力内容の確認</h2>
        <div className="space-y-3 mb-6">
          {allFields.map((field) => {
            const val = values[field.id]
            let displayVal: string
            if (field.type === 'name' && typeof val === 'object' && val !== null) {
              const n = val as { sei: string; mei: string; seiKana: string; meiKana: string }
              displayVal = `${n.sei} ${n.mei}（${n.seiKana} ${n.meiKana}）`
            } else if (field.type === 'zip' && typeof val === 'object' && val !== null) {
              const z = val as { zipcode: string; prefecture: string; city: string; address: string }
              displayVal = `〒${z.zipcode} ${z.prefecture}${z.city}${z.address}`
            } else if (field.type === 'file' && typeof val === 'object' && val !== null) {
              const f = val as { name: string; size: number }
              const size = f.size < 1024 * 1024
                ? `${(f.size / 1024).toFixed(1)} KB`
                : `${(f.size / (1024 * 1024)).toFixed(1)} MB`
              displayVal = `${f.name}（${size}）`
            } else if (Array.isArray(val)) {
              displayVal = val.join(', ')
            } else if (typeof val === 'boolean') {
              displayVal = val ? '同意する' : '同意しない'
            } else {
              displayVal = String(val || '')
            }

            return (
              <div key={field.id} className="flex border-b border-[hsl(var(--border))] pb-2">
                <span className="w-1/3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  {field.label}
                </span>
                <span className="w-2/3 text-sm">{displayVal || '(未入力)'}</span>
              </div>
            )
          })}
        </div>

        {errors._form && (
          <p className="text-sm text-[hsl(var(--destructive))] mb-4">{errors._form}</p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            修正する
          </Button>
          {isPreview ? (
            <div className="flex-1 flex items-center justify-center rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-700 font-medium">
              プレビューのため送信できません
            </div>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? '送信中...' : '送信する'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 通常ステップ
  return (
    <div ref={formRef}>
      {/* 進捗バー */}
      {totalSteps > 1 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))] mb-1">
            <span>{currentStep?.title || `ステップ ${currentStepIndex + 1}`}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* フォームフィールド */}
      <div
        className={`transition-all duration-200 ${
          transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {currentStep && (
          <FormRenderer
            fields={currentStep.fields}
            values={values}
            errors={errors}
            onChange={handleChange}
            onBlur={handleBlur}
            formId={formId}
          />
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex gap-3 mt-8">
        {currentStepIndex > 0 && (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            戻る
          </Button>
        )}
        <Button onClick={handleNext} className="flex-1">
          {isLastStep ? '確認画面へ' : '次へ'}
        </Button>
      </div>
    </div>
  )
}
