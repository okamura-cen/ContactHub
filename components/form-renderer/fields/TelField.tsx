'use client'

import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TelFieldProps {
  id: string
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  error?: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
}

/**
 * 電話番号入力フィールド（EFO対応）
 * - 全角数字→半角自動変換
 * - ハイフン自動挿入（090-1234-5678形式）
 * - inputMode="tel"でスマホ数字キーボード
 */
export function TelField({ id, label, placeholder, helpText, required, error, value, onChange, onBlur }: TelFieldProps) {
  const formatTel = useCallback((raw: string): string => {
    // 全角→半角変換
    let v = raw.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    // 数字とハイフンのみ残す
    v = v.replace(/[^\d-]/g, '')
    // ハイフンを除去して数字のみに
    const digits = v.replace(/-/g, '')

    // 自動ハイフン挿入
    if (digits.startsWith('0')) {
      if (digits.length <= 3) return digits
      if (digits.startsWith('0120') || digits.startsWith('0800')) {
        // フリーダイヤル: 0120-123-456
        if (digits.length <= 4) return digits
        if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 10)}`
      }
      if (digits.length >= 2 && ['090', '080', '070', '050'].includes(digits.slice(0, 3))) {
        // 携帯: 090-1234-5678
        if (digits.length <= 3) return digits
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
      }
      // 固定電話: 03-1234-5678 / 045-123-4567
      if (digits.length <= 2) return digits
      if (['03', '06', '04'].includes(digits.slice(0, 2))) {
        if (digits.length <= 2) return digits
        if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`
      }
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
    return digits
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTel(e.target.value)
    onChange(formatted)
  }, [formatTel, onChange])

  const isValid = value && /^0\d{1,4}-\d{1,4}-\d{4}$/.test(value)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={placeholder || '090-1234-5678'}
          value={value || ''}
          onChange={handleChange}
          onBlur={onBlur}
          error={!!error}
          style={{ fontSize: '16px' }}
        />
        {!error && isValid && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">✓</span>
        )}
      </div>
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
