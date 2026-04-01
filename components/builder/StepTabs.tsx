'use client'

import { BuilderStep } from '@/types/builder'
import { Button } from '@/components/ui/button'

interface StepTabsProps {
  steps: BuilderStep[]
  activeStepId: string
  onSelect: (stepId: string) => void
  onAdd: () => void
  onDelete: (stepId: string) => void
  onRename: (stepId: string, title: string) => void
}

/** ステップタブ：ステップの追加・削除・切り替え */
export function StepTabs({ steps, activeStepId, onSelect, onAdd, onDelete, onRename }: StepTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[hsl(var(--border))] px-4 bg-[hsl(var(--card))]">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`group flex items-center gap-1 px-3 py-2 text-sm border-b-2 cursor-pointer transition-colors ${
            activeStepId === step.id
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--foreground))] font-medium'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
          onClick={() => onSelect(step.id)}
        >
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onRename(step.id, e.currentTarget.textContent || step.title)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLElement).blur()
              }
            }}
            className="outline-none min-w-[40px]"
          >
            {step.title}
          </span>
          {steps.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(step.id) }}
              className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-opacity ml-1 text-xs"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        onClick={onAdd}
        className="text-xs text-[hsl(var(--muted-foreground))]"
      >
        + ステップ追加
      </Button>
    </div>
  )
}
