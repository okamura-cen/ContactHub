'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExportFormat } from '@/lib/export-table'

interface ExportMenuProps {
  /** ボタンを無効化（データ0件など） */
  disabled?: boolean
  /** 書き出し中（Excel生成など） */
  exporting?: boolean
  /** 形式が選択されたときに呼ばれる */
  onExport: (format: ExportFormat) => void
}

/** 「ダウンロード ▾」形式選択メニュー（CSV / Excel / JSON） */
export function ExportMenu({ disabled, exporting, onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false)

  const items: { label: string; format: ExportFormat }[] = [
    { label: 'CSV (.csv)', format: 'csv' },
    { label: 'Excel (.xlsx)', format: 'xlsx' },
    { label: 'JSON (.json)', format: 'json' },
  ]

  return (
    <div className="relative">
      <Button variant="outline" disabled={disabled || exporting} onClick={() => setOpen((v) => !v)}>
        {exporting ? '書き出し中...' : 'ダウンロード ▾'}
      </Button>
      {open && (
        <>
          {/* 外側クリックで閉じる */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 w-48 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-md py-1">
            {items.map((it) => (
              <button
                key={it.format}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                onClick={() => { setOpen(false); onExport(it.format) }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
