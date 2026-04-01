'use client'

import { useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NameFieldProps {
  id: string
  label: string
  helpText?: string
  required: boolean
  error?: string
  /** { sei: string, mei: string, seiKana: string, meiKana: string } */
  value: { sei: string; mei: string; seiKana: string; meiKana: string }
  onChange: (value: { sei: string; mei: string; seiKana: string; meiKana: string }) => void
  onBlur: () => void
}

/**
 * 氏名入力フィールド（EFO対応）
 * - 姓・名の2カラムレイアウト
 * - ふりがな自動生成（IME compositionendイベント）
 * - ふりがなは手動編集可能
 */
export function NameField({ id, label, helpText, required, error, value, onChange, onBlur }: NameFieldProps) {
  const isComposingRef = useRef(false)
  const lastCompositionDataRef = useRef('')

  const val = value || { sei: '', mei: '', seiKana: '', meiKana: '' }
  const valRef = useRef(val)
  valRef.current = val

  const hiraganaToKatakana = (str: string): string => {
    return str.replace(/[\u3041-\u3096]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    )
  }

  const isHiragana = (str: string): boolean => {
    return /^[\u3041-\u3096\u3000-\u303f\s]+$/.test(str)
  }

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
    lastCompositionDataRef.current = ''
  }, [])

  const handleCompositionUpdate = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      // IME変換中のデータを保存（ひらがなの場合のみ）
      const data = e.data || ''
      if (isHiragana(data)) {
        lastCompositionDataRef.current = data
      }
    },
    []
  )

  const handleCompositionEnd = useCallback(
    (field: 'sei' | 'mei') => {
      isComposingRef.current = false
      const reading = lastCompositionDataRef.current
      if (reading) {
        const kana = hiraganaToKatakana(reading)
        const current = valRef.current
        if (field === 'sei') {
          onChange({ ...current, seiKana: kana })
        } else {
          onChange({ ...current, meiKana: kana })
        }
      }
      lastCompositionDataRef.current = ''
    },
    [onChange]
  )

  return (
    <div className="space-y-3">
      <Label>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${id}-sei`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">姓</Label>
          <Input
            id={`${id}-sei`}
            autoComplete="family-name"
            placeholder="山田"
            value={val.sei}
            onChange={(e) => onChange({ ...val, sei: e.target.value })}
            onCompositionStart={handleCompositionStart}
            onCompositionUpdate={handleCompositionUpdate}
            onCompositionEnd={() => handleCompositionEnd('sei')}
            onBlur={onBlur}
            error={!!error}
            style={{ fontSize: '16px' }}
          />
        </div>
        <div>
          <Label htmlFor={`${id}-mei`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">名</Label>
          <Input
            id={`${id}-mei`}
            autoComplete="given-name"
            placeholder="太郎"
            value={val.mei}
            onChange={(e) => onChange({ ...val, mei: e.target.value })}
            onCompositionStart={handleCompositionStart}
            onCompositionUpdate={handleCompositionUpdate}
            onCompositionEnd={() => handleCompositionEnd('mei')}
            onBlur={onBlur}
            error={!!error}
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${id}-sei-kana`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">セイ</Label>
          <Input
            id={`${id}-sei-kana`}
            placeholder="ヤマダ"
            value={val.seiKana}
            onChange={(e) => onChange({ ...val, seiKana: e.target.value })}
            onBlur={onBlur}
            error={!!error}
            style={{ fontSize: '16px' }}
          />
        </div>
        <div>
          <Label htmlFor={`${id}-mei-kana`} className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">メイ</Label>
          <Input
            id={`${id}-mei-kana`}
            placeholder="タロウ"
            value={val.meiKana}
            onChange={(e) => onChange({ ...val, meiKana: e.target.value })}
            onBlur={onBlur}
            error={!!error}
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
