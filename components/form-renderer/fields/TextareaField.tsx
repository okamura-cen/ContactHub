'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface TextareaFieldProps {
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

/** テキストエリアフィールド */
export function TextareaField({ id, label, placeholder, helpText, required, error, value, onChange, onBlur }: TextareaFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        error={!!error}
        rows={5}
        style={{ fontSize: '16px' }}
      />
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
