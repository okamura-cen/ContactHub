'use client'

import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SelectFieldProps {
  id: string
  label: string
  helpText?: string
  required: boolean
  options: string[]
  error?: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
}

/** セレクトボックスフィールド */
export function SelectField({ id, label, helpText, required, options, error, value, onChange, onBlur }: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      <Select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        error={!!error}
        style={{ fontSize: '16px' }}
      >
        <option value="">選択してください</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Select>
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
