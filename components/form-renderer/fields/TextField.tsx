'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TextFieldProps {
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

/** 汎用テキスト入力フィールド */
export function TextField({ id, label, placeholder, helpText, required, error, value, onChange, onBlur }: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          error={!!error}
          style={{ fontSize: '16px' }}
        />
        {!error && value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">✓</span>
        )}
      </div>
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
