'use client'

import { BuilderField } from '@/types/builder'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface BuilderCanvasProps {
  fields: BuilderField[]
  selectedFieldId: string | null
  onSelect: (fieldId: string) => void
  onMoveUp: (fieldId: string) => void
  onMoveDown: (fieldId: string) => void
  onDelete: (fieldId: string) => void
}

const fieldTypeLabels: Record<string, string> = {
  text: 'テキスト',
  email: 'メール',
  tel: '電話番号',
  textarea: 'テキストエリア',
  select: 'セレクト',
  radio: 'ラジオ',
  checkbox: 'チェックボックス',
  date: '日付',
  zip: '郵便番号+住所',
  name: '氏名+ふりがな',
  agree: '同意チェック',
  heading: '見出し',
  paragraph: 'テキスト',
  divider: '区切り線',
}

const efoTypes = ['email', 'tel', 'zip', 'name', 'agree']

/** ビルダーキャンバス：フィールド一覧の表示と操作 */
export function BuilderCanvas({ fields, selectedFieldId, onSelect, onMoveUp, onMoveDown, onDelete }: BuilderCanvasProps) {
  if (fields.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
        <div className="text-center">
          <p className="text-lg mb-2">フィールドがありません</p>
          <p className="text-sm">左のパレットからフィールドを追加してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto space-y-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            onClick={() => onSelect(field.id)}
            className={`group flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              selectedFieldId === field.id
                ? 'border-[hsl(var(--primary))] bg-blue-50 shadow-sm'
                : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50'
            }`}
          >
            {/* フィールド情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{field.label}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {fieldTypeLabels[field.type] || field.type}
                </Badge>
                {efoTypes.includes(field.type) && (
                  <Badge variant="success" className="text-[10px] shrink-0">EFO</Badge>
                )}
                {field.required && (
                  <span className="text-[hsl(var(--destructive))] text-xs">必須</span>
                )}
              </div>
              {field.placeholder && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                  {field.placeholder}
                </p>
              )}
            </div>

            {/* 操作ボタン */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onMoveUp(field.id) }}
                disabled={index === 0}
              >
                ↑
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onMoveDown(field.id) }}
                disabled={index === fields.length - 1}
              >
                ↓
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[hsl(var(--destructive))]"
                onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
