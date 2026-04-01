'use client'

import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface EmbedCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formId: string
}

/** 埋め込みコード生成ダイアログ */
export function EmbedCodeDialog({ open, onOpenChange, formId }: EmbedCodeDialogProps) {
  const [tab, setTab] = useState<'iframe' | 'js' | 'direct'>('direct')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const iframeCode = `<iframe
  src="${appUrl}/f/${formId}"
  width="100%"
  height="600"
  frameborder="0"
  loading="lazy"
></iframe>`

  const jsCode = `<div id="efo-form-${formId}"></div>
<script src="${appUrl}/embed.js"
  data-form-id="${formId}">
</script>`

  const directCode = `<!-- ContactHub フォーム埋め込み（CSS カスタマイズ可能） -->
<div id="efo-form-${formId}"></div>
<script src="${appUrl}/embed-direct.js"
  data-form-id="${formId}">
</script>

<!-- カスタマイズ例:
<style>
  .efo-form-container { max-width: 500px; }
  .efo-input { border-radius: 0; border-color: #333; }
  .efo-btn--next { background: #e63946; }
  .efo-label { font-size: 1rem; color: #1d3557; }
</style>
-->`

  const codes = { iframe: iframeCode, js: jsCode, direct: directCode }
  const code = codes[tab]

  const descriptions = {
    iframe: 'シンプルな埋め込み。スタイルは固定。',
    js: 'iframe を自動生成し、高さを自動調整。',
    direct: 'フォームHTMLを直接展開。CSSクラス付きでカスタマイズ自由。',
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>埋め込みコード</DialogTitle>
      </DialogHeader>
      <div className="mt-4">
        <div className="flex gap-2 mb-2">
          <Button
            size="sm"
            variant={tab === 'direct' ? 'default' : 'outline'}
            onClick={() => setTab('direct')}
          >
            HTMLダイレクト
          </Button>
          <Button
            size="sm"
            variant={tab === 'iframe' ? 'default' : 'outline'}
            onClick={() => setTab('iframe')}
          >
            iframe
          </Button>
          <Button
            size="sm"
            variant={tab === 'js' ? 'default' : 'outline'}
            onClick={() => setTab('js')}
          >
            JS自動調整
          </Button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">{descriptions[tab]}</p>
        <pre className="bg-[hsl(var(--secondary))] p-4 rounded-md text-xs overflow-x-auto max-h-[300px]">
          <code>{code}</code>
        </pre>
        <Button onClick={copyToClipboard} className="mt-3 w-full" variant="outline">
          コピー
        </Button>
        {tab === 'direct' && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-md">
            <p className="text-xs font-medium text-emerald-800 mb-1">CSSカスタマイズ可能なクラス一覧:</p>
            <div className="text-[10px] text-emerald-700 space-y-0.5 font-mono">
              <p>.efo-form-container - フォーム全体</p>
              <p>.efo-field - 各フィールド</p>
              <p>.efo-label - ラベル</p>
              <p>.efo-input / .efo-textarea / .efo-select - 入力欄</p>
              <p>.efo-btn--next / .efo-btn--back - ボタン</p>
              <p>.efo-progress-fill - 進捗バー</p>
              <p>.efo-error - エラーメッセージ</p>
              <p>.efo-field--email / .efo-field--tel 等 - タイプ別</p>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
