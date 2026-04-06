'use client'

import { FieldType } from '@/types/builder'

interface PaletteItem {
  type: FieldType
  label: string
  category: 'basic' | 'choice' | 'efo' | 'layout'
  isEfo?: boolean
}

const paletteItems: PaletteItem[] = [
  // 基本入力
  { type: 'text', label: 'テキスト', category: 'basic' },
  { type: 'textarea', label: 'テキストエリア', category: 'basic' },
  { type: 'date', label: '日付', category: 'basic' },
  // 選択・日付
  { type: 'select', label: 'セレクト', category: 'choice' },
  { type: 'radio', label: 'ラジオボタン', category: 'choice' },
  { type: 'checkbox', label: 'チェックボックス', category: 'choice' },
  // EFO特化
  { type: 'email', label: 'メール', category: 'efo', isEfo: true },
  { type: 'tel', label: '電話番号', category: 'efo', isEfo: true },
  { type: 'zip', label: '郵便番号+住所', category: 'efo', isEfo: true },
  { type: 'name', label: '氏名+ふりがな', category: 'efo', isEfo: true },
  { type: 'agree', label: '同意チェック', category: 'efo', isEfo: true },
  { type: 'file', label: 'ファイル添付', category: 'basic' },
  // レイアウト
  { type: 'heading', label: '見出し', category: 'layout' },
  { type: 'divider', label: '区切り線', category: 'layout' },
]

const categoryLabels: Record<string, string> = {
  basic: '基本入力',
  choice: '選択・日付',
  efo: 'EFO特化',
  layout: 'レイアウト',
}

interface FieldPaletteProps {
  onAdd: (type: FieldType) => void
}

/** フィールドパレット：フィールドタイプをカテゴリ別に表示 */
export function FieldPalette({ onAdd }: FieldPaletteProps) {
  const categories = ['basic', 'choice', 'efo', 'layout'] as const

  return (
    <div className="w-[180px] border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-y-auto h-full">
      <div className="p-3">
        <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-3">
          フィールド追加
        </h3>
        {categories.map((cat) => (
          <div key={cat} className="mb-4">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
              {categoryLabels[cat]}
            </p>
            <div className="space-y-1">
              {paletteItems
                .filter((item) => item.category === cat)
                .map((item) => (
                  <button
                    key={item.type}
                    onClick={() => onAdd(item.type)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-2"
                  >
                    <span>{item.label}</span>
                    {item.isEfo && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                        EFO
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
