'use client'

interface AgreeFieldProps {
  id: string
  label: string
  helpText?: string
  required: boolean
  error?: string
  value: boolean
  onChange: (value: boolean) => void
  onBlur: () => void
}

/** 同意チェックボックスフィールド */
export function AgreeField({ id, label, helpText, required, error, value, onChange, onBlur }: AgreeFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-[hsl(var(--input))] hover:bg-[hsl(var(--accent))] min-h-[44px]"
      >
        <input
          id={id}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          className="h-4 w-4 mt-0.5 accent-[hsl(var(--primary))]"
        />
        <span className="text-base">
          {label}
          {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
        </span>
      </label>
      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
