'use client'

import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EmailFieldProps {
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
 * メールアドレス入力フィールド（EFO対応）
 * - 全角→半角自動変換
 * - inputMode="email"
 * - 検証成功時にグリーンチェック表示
 */
export function EmailField({ id, label, placeholder, helpText, required, error, value, onChange, onBlur }: EmailFieldProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // 全角英数字・記号を半角に変換
    const converted = e.target.value.replace(/[Ａ-Ｚａ-ｚ０-９＠．＿＋－]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    )
    onChange(converted)
  }, [onChange])

  const isValidEmail = value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={placeholder || 'example@mail.com'}
          value={value || ''}
          onChange={handleChange}
          onBlur={onBlur}
          error={!!error}
          style={{ fontSize: '16px' }}
        />
        {!error && isValidEmail && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">✓</span>
        )}
      </div>
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
