'use client'

import { Label } from '@/components/ui/label'

interface CheckboxFieldProps {
  id: string
  label: string
  helpText?: string
  required: boolean
  options: string[]
  error?: string
  value: string[]
  onChange: (value: string[]) => void
  onBlur: () => void
}

/** チェックボックスフィールド（複数選択） */
export function CheckboxField({ id, label, helpText, required, options, error, value, onChange, onBlur }: CheckboxFieldProps) {
  const vals = value || []

  const toggle = (opt: string) => {
    if (vals.includes(opt)) {
      onChange(vals.filter((v) => v !== opt))
    } else {
      onChange([...vals, opt])
    }
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-[hsl(var(--accent))] min-h-[44px]"
          >
            <input
              type="checkbox"
              value={opt}
              checked={vals.includes(opt)}
              onChange={() => toggle(opt)}
              onBlur={onBlur}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <span className="text-base">{opt}</span>
          </label>
        ))}
      </div>
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
