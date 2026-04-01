'use client'

import { BuilderField } from '@/types/builder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface PropertyPanelProps {
  field: BuilderField | null
  onChange: (field: BuilderField) => void
}

/** プロパティパネル：選択中フィールドの設定 */
export function PropertyPanel({ field, onChange }: PropertyPanelProps) {
  if (!field) {
    return (
      <div className="w-[260px] border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center">
          フィールドを選択するとプロパティが表示されます
        </p>
      </div>
    )
  }

  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type)
  const isLayoutField = ['heading', 'divider'].includes(field.type)

  const updateField = (updates: Partial<BuilderField>) => {
    onChange({ ...field, ...updates })
  }

  const updateOption = (index: number, value: string) => {
    const options = [...(field.options || [])]
    options[index] = value
    updateField({ options })
  }

  const addOption = () => {
    updateField({ options: [...(field.options || []), `選択肢${(field.options?.length || 0) + 1}`] })
  }

  const removeOption = (index: number) => {
    const options = (field.options || []).filter((_, i) => i !== index)
    updateField({ options })
  }

  return (
    <div className="w-[260px] border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-y-auto h-full">
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold border-b border-[hsl(var(--border))] pb-2">
          プロパティ
        </h3>

        {/* ラベル */}
        <div className="space-y-1">
          <Label className="text-xs">ラベル</Label>
          <Input
            value={field.label}
            onChange={(e) => updateField({ label: e.target.value })}
            className="text-sm h-9"
          />
        </div>

        {/* プレースホルダー（レイアウト以外） */}
        {!isLayoutField && field.type !== 'agree' && (
          <div className="space-y-1">
            <Label className="text-xs">プレースホルダー</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => updateField({ placeholder: e.target.value })}
              className="text-sm h-9"
            />
          </div>
        )}

        {/* ヘルプテキスト */}
        {!isLayoutField && (
          <div className="space-y-1">
            <Label className="text-xs">ヘルプテキスト</Label>
            <Input
              value={field.helpText || ''}
              onChange={(e) => updateField({ helpText: e.target.value })}
              className="text-sm h-9"
              placeholder="入力のヒントを表示"
            />
          </div>
        )}

        {/* 必須 */}
        {!isLayoutField && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="prop-required"
              checked={field.required}
              onChange={(e) => updateField({ required: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="prop-required" className="text-xs cursor-pointer">
              必須項目にする
            </Label>
          </div>
        )}

        {/* 選択肢（select/radio/checkbox） */}
        {hasOptions && (
          <div className="space-y-2">
            <Label className="text-xs">選択肢</Label>
            {(field.options || []).map((opt, i) => (
              <div key={i} className="flex gap-1">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="text-sm h-8 flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-[hsl(var(--destructive))]"
                  onClick={() => removeOption(i)}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addOption} className="w-full text-xs">
              + 選択肢を追加
            </Button>
          </div>
        )}

        {/* EFO設定 */}
        {['email', 'tel', 'zip', 'name'].includes(field.type) && (
          <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
            <p className="text-xs font-semibold text-emerald-700">EFO設定</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.efoSettings?.realtimeValidation ?? true}
                  onChange={(e) =>
                    updateField({
                      efoSettings: {
                        ...field.efoSettings,
                        realtimeValidation: e.target.checked,
                        autoFormat: field.efoSettings?.autoFormat ?? true,
                        autoComplete: field.efoSettings?.autoComplete ?? true,
                      },
                    })
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">リアルタイムバリデーション</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.efoSettings?.autoFormat ?? true}
                  onChange={(e) =>
                    updateField({
                      efoSettings: {
                        ...field.efoSettings,
                        realtimeValidation: field.efoSettings?.realtimeValidation ?? true,
                        autoFormat: e.target.checked,
                        autoComplete: field.efoSettings?.autoComplete ?? true,
                      },
                    })
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">自動フォーマット</span>
              </label>
              {field.type === 'zip' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.efoSettings?.autoComplete ?? true}
                    onChange={(e) =>
                      updateField({
                        efoSettings: {
                          ...field.efoSettings,
                          realtimeValidation: field.efoSettings?.realtimeValidation ?? true,
                          autoFormat: field.efoSettings?.autoFormat ?? true,
                          autoComplete: e.target.checked,
                        },
                      })
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">住所自動補完</span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
