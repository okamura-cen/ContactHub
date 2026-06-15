'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RepeatableFieldProps {
  id: string
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  error?: string
  /** 入力種類: text（一行テキスト）/ date（日付） */
  inputType: 'text' | 'date'
  /** 上限個数 */
  maxItems: number
  /** 値は文字列の配列 */
  value: string[]
  onChange: (value: string[]) => void
  onBlur: () => void
}

/** 繰り返し入力フィールド（text/date を複数追加できる） */
export function RepeatableField({
  id,
  label,
  placeholder,
  helpText,
  required,
  error,
  inputType,
  maxItems,
  value,
  onChange,
  onBlur,
}: RepeatableFieldProps) {
  // 最低1欄は常に表示する
  const items = value.length > 0 ? value : ['']

  const updateItem = (index: number, v: string) => {
    const next = [...items]
    next[index] = v
    onChange(next)
  }

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [''])
  }

  const addItem = () => {
    if (items.length >= maxItems) return
    onChange([...items, ''])
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Input
              id={i === 0 ? id : `${id}-${i}`}
              type={inputType === 'date' ? 'date' : 'text'}
              placeholder={placeholder}
              value={item || ''}
              onChange={(e) => updateItem(i, e.target.value)}
              onBlur={onBlur}
              error={!!error}
              style={{ fontSize: '16px' }}
              className="flex-1"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                aria-label="この項目を削除"
                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-md border border-[hsl(var(--border))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--accent))]"
              >
                －
              </button>
            )}
          </div>
        ))}
      </div>

      {items.length < maxItems && (
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-[hsl(var(--primary))] hover:underline"
        >
          ＋追加
        </button>
      )}

      {helpText && !error && <p className="text-sm text-[hsl(var(--muted-foreground))]">{helpText}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  )
}
