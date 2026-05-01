'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { BuilderStep, BuilderField, FieldType, FormSettings } from '@/types/builder'
import { FieldPalette } from '@/components/builder/FieldPalette'
import { BuilderCanvas } from '@/components/builder/BuilderCanvas'
import { PropertyPanel } from '@/components/builder/PropertyPanel'
import { StepTabs } from '@/components/builder/StepTabs'
import { EmbedCodeDialog } from '@/components/builder/EmbedCodeDialog'
import { FormSettingsDialog } from '@/components/builder/FormSettingsDialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

const defaultLabels: Record<FieldType, string> = {
  text: 'テキスト',
  email: 'メールアドレス',
  tel: '電話番号',
  textarea: 'お問い合わせ内容',
  select: 'セレクト',
  radio: 'ラジオボタン',
  checkbox: 'チェックボックス',
  date: '日付',
  zip: '郵便番号',
  name: 'お名前',
  agree: '個人情報の取り扱いに同意する',
  file: 'ファイル添付',
  heading: '見出し',
  paragraph: 'テキストをここに入力してください',
  divider: '',
}

function FormBuilderContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const formId = params.formId as string
  const backUrl = searchParams.get('back') || '/forms'

  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState<BuilderStep[]>([])
  const [activeStepId, setActiveStepId] = useState('')
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [settings, setSettings] = useState<FormSettings>({
    successMessage: '送信が完了しました。ありがとうございます。',
    notifyEmails: [],
    autoReply: false,
  })
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT')
  const [licenseStatus, setLicenseStatus] = useState<'PENDING' | 'ACTIVE' | 'EXPIRED' | 'DELETED'>('PENDING')
  const [saving, setSaving] = useState(false)
  const [purchasingLicense, setPurchasingLicense] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEmbed, setShowEmbed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // ユーザーロールの確認
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((u) => {
      if (u.role === 'CLIENT') setIsClient(true)
      if (u.role === 'SUPER_ADMIN') setIsSuperAdmin(true)
    }).catch(() => {})
  }, [])

  // SUPER_ADMIN は購入不要（常にライセンス有効として扱う）
  const effectiveLicenseActive = isSuperAdmin || licenseStatus === 'ACTIVE'

  // フォームデータの読み込み
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/forms/${formId}`)
        if (!res.ok) {
          router.push('/forms')
          return
        }
        const form = await res.json()
        setTitle(form.title)
        setFormStatus(form.status || 'DRAFT')
        setLicenseStatus(form.licenseStatus || 'PENDING')
        const s = form.settings as Record<string, unknown> || {}
        setSettings({
          successMessage: s.successMessage as string || '送信が完了しました。',
          redirectUrl: s.redirectUrl as string || undefined,
          notifyEmails: s.notifyEmails as string[] || [],
          autoReply: s.autoReply as boolean || false,
          autoReplyMessage: s.autoReplyMessage as string || undefined,
          primaryColor: s.primaryColor as string || undefined,
          fontFamily: s.fontFamily as string || undefined,
          customCss: s.customCss as string || undefined,
          recaptchaEnabled: s.recaptchaEnabled as boolean || false,
          lpEnabled: s.lpEnabled as boolean || false,
          lpLogoUrl: s.lpLogoUrl as string || undefined,
          lpHeroImageUrl: s.lpHeroImageUrl as string || undefined,
          lpHeading: s.lpHeading as string || undefined,
          lpDescription: s.lpDescription as string || undefined,
          lpBgColor: s.lpBgColor as string || undefined,
          lpFooterCompany: s.lpFooterCompany as string || undefined,
          lpFooterText: s.lpFooterText as string || undefined,
          lpFooterLinks: s.lpFooterLinks as { label: string; url: string }[] || undefined,
          lpTextColor: s.lpTextColor as string || undefined,
          lpFooterBgColor: s.lpFooterBgColor as string || undefined,
        })

        const builderSteps: BuilderStep[] = (form.steps || []).map(
          (s: { id: string; title: string; fields: Array<{
            id: string; type: string; label: string; placeholder?: string;
            helpText?: string; required: boolean; options?: string[];
            efoSettings?: { realtimeValidation: boolean; autoFormat: boolean; autoComplete: boolean }
            logic?: { action: 'show' | 'hide'; operator: 'AND' | 'OR'; conditions: { fieldId: string; operator: string; value?: string }[] }
          }> }) => ({
            id: s.id,
            title: s.title,
            fields: (s.fields || []).map(
              (f) => ({
                id: f.id,
                type: f.type.toLowerCase() as FieldType,
                label: f.label,
                placeholder: f.placeholder || undefined,
                helpText: f.helpText || undefined,
                required: f.required,
                options: f.options || undefined,
                efoSettings: f.efoSettings || undefined,
                logic: f.logic || undefined,
              })
            ),
          })
        )

        if (builderSteps.length === 0) {
          const defaultStep = { id: crypto.randomUUID(), title: 'ステップ 1', fields: [] }
          setSteps([defaultStep])
          setActiveStepId(defaultStep.id)
        } else {
          setSteps(builderSteps)
          setActiveStepId(builderSteps[0].id)
        }
      } catch {
        toast({ title: 'フォームの読み込みに失敗しました', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [formId, router, toast])

  const activeStep = steps.find((s) => s.id === activeStepId)
  const selectedField = activeStep?.fields.find((f) => f.id === selectedFieldId) || null

  // フィールド追加
  const handleAddField = useCallback((type: FieldType) => {
    const newField: BuilderField = {
      id: crypto.randomUUID(),
      type,
      label: defaultLabels[type] || type,
      required: false,
      ...((['select', 'radio', 'checkbox'].includes(type)) && {
        options: ['選択肢1', '選択肢2', '選択肢3'],
      }),
      ...((['email', 'tel', 'zip', 'name'].includes(type)) && {
        efoSettings: { realtimeValidation: true, autoFormat: true, autoComplete: true },
      }),
    }
    setSteps((prev) =>
      prev.map((s) =>
        s.id === activeStepId
          ? { ...s, fields: [...s.fields, newField] }
          : s
      )
    )
    setSelectedFieldId(newField.id)
  }, [activeStepId])

  // フィールド移動
  const handleMoveUp = useCallback((fieldId: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== activeStepId) return s
        const idx = s.fields.findIndex((f) => f.id === fieldId)
        if (idx <= 0) return s
        const fields = [...s.fields]
        ;[fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]]
        return { ...s, fields }
      })
    )
  }, [activeStepId])

  const handleMoveDown = useCallback((fieldId: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== activeStepId) return s
        const idx = s.fields.findIndex((f) => f.id === fieldId)
        if (idx < 0 || idx >= s.fields.length - 1) return s
        const fields = [...s.fields]
        ;[fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]]
        return { ...s, fields }
      })
    )
  }, [activeStepId])

  const handleDeleteField = useCallback((fieldId: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === activeStepId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      )
    )
    if (selectedFieldId === fieldId) setSelectedFieldId(null)
  }, [activeStepId, selectedFieldId])

  const handleFieldChange = useCallback((updated: BuilderField) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === activeStepId
          ? { ...s, fields: s.fields.map((f) => (f.id === updated.id ? updated : f)) }
          : s
      )
    )
  }, [activeStepId])

  // ステップ操作
  const handleAddStep = useCallback(() => {
    const newStep: BuilderStep = {
      id: crypto.randomUUID(),
      title: `ステップ ${steps.length + 1}`,
      fields: [],
    }
    setSteps((prev) => [...prev, newStep])
    setActiveStepId(newStep.id)
  }, [steps.length])

  const handleDeleteStep = useCallback((stepId: string) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((s) => s.id !== stepId))
    if (activeStepId === stepId) {
      setActiveStepId(steps.find((s) => s.id !== stepId)?.id || '')
    }
  }, [steps, activeStepId])

  const handleRenameStep = useCallback((stepId: string, title: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, title } : s))
    )
  }, [])

  // ライセンス購入
  const handlePurchaseLicense = useCallback(async () => {
    setPurchasingLicense(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        toast({ title: data.error || 'エラーが発生しました', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'エラーが発生しました', variant: 'destructive' })
    } finally {
      setPurchasingLicense(false)
    }
  }, [formId, toast])

  // 保存
  const handleSave = useCallback(async (publish = false) => {
    // 公開時はライセンス確認（SUPER_ADMIN は常にバイパス）
    if (publish && formStatus !== 'PUBLISHED' && !effectiveLicenseActive) {
      toast({ title: 'フォームを公開するにはライセンスの購入が必要です', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const newStatus = publish
        ? (formStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')
        : undefined
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          settings,
          steps,
          ...(newStatus !== undefined && { status: newStatus }),
        }),
      })
      if (res.ok) {
        if (newStatus) setFormStatus(newStatus)
        toast({
          title: newStatus === 'PUBLISHED' ? 'フォームを公開しました'
            : newStatus === 'DRAFT' ? 'フォームを非公開にしました'
            : '保存しました',
          variant: 'success',
        })
      } else {
        throw new Error('Save failed')
      }
    } catch {
      toast({ title: '保存に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [formId, formStatus, effectiveLicenseActive, title, settings, steps, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] -m-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>
            ← 戻る
          </Button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] rounded px-2 py-1"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* ライセンス状態バッジ（代理店のみ） */}
          {!isClient && isSuperAdmin && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
              管理者（購入不要）
            </span>
          )}
          {!isClient && !isSuperAdmin && licenseStatus === 'ACTIVE' && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              ライセンス有効
            </span>
          )}
          {!isClient && !isSuperAdmin && (licenseStatus === 'PENDING' || licenseStatus === 'EXPIRED') && (
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
              onClick={handlePurchaseLicense}
              disabled={purchasingLicense}
            >
              {purchasingLicense ? '処理中...' : licenseStatus === 'EXPIRED' ? 'ライセンスを更新' : 'ライセンスを購入（¥10,000/年）'}
            </Button>
          )}
          {!isClient && (
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              設定
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/f/${formId}?preview=true`, '_blank')}
          >
            プレビュー
          </Button>
          {!isClient && (
            <Button variant="outline" size="sm" onClick={() => {
              const url = `${window.location.origin}/f/${formId}`
              navigator.clipboard.writeText(url)
              toast({ title: 'ページURLをコピーしました', variant: 'success' })
            }}>
              ページURL
            </Button>
          )}
          {!isClient && (
            <Button variant="outline" size="sm" onClick={() => setShowEmbed(true)}>
              埋め込みコード
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
          {!isClient && (
            <Button
              size="sm"
              variant={formStatus === 'PUBLISHED' ? 'outline' : 'default'}
              onClick={() => handleSave(true)}
              disabled={saving || (formStatus !== 'PUBLISHED' && !effectiveLicenseActive)}
              title={formStatus !== 'PUBLISHED' && !effectiveLicenseActive ? 'ライセンスを購入すると公開できます' : ''}
            >
              {formStatus === 'PUBLISHED' ? '非公開にする' : '公開する'}
            </Button>
          )}
        </div>
      </div>

      {/* ステップタブ */}
      <StepTabs
        steps={steps}
        activeStepId={activeStepId}
        onSelect={setActiveStepId}
        onAdd={handleAddStep}
        onDelete={handleDeleteStep}
        onRename={handleRenameStep}
      />

      {/* 3ペインレイアウト */}
      <div className="flex flex-1 overflow-hidden">
        <FieldPalette onAdd={handleAddField} />
        <BuilderCanvas
          fields={activeStep?.fields || []}
          selectedFieldId={selectedFieldId}
          onSelect={setSelectedFieldId}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDelete={handleDeleteField}
        />
        <PropertyPanel
          field={selectedField}
          allFields={activeStep?.fields || []}
          onChange={handleFieldChange}
        />
      </div>

      {/* ダイアログ */}
      <EmbedCodeDialog open={showEmbed} onOpenChange={setShowEmbed} formId={formId} />
      <FormSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  )
}

/** フォームビルダー（編集画面） */
export default function FormBuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[80vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" /></div>}>
      <FormBuilderContent />
    </Suspense>
  )
}
