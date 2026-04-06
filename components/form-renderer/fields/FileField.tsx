'use client'

import { useRef, useState } from 'react'
import { Label } from '@/components/ui/label'

interface FileValue {
  url: string
  name: string
  size: number
  type: string
}

interface FileFieldProps {
  id: string
  label: string
  helpText?: string
  required: boolean
  error?: string
  value: FileValue | null
  formId: string
  onChange: (value: FileValue | null) => void
  onBlur: () => void
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileField({ id, label, helpText, required, error, value, formId, onChange, onBlur }: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/forms/${formId}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error || 'アップロードに失敗しました')
        return
      }

      const data = await res.json()
      onChange(data)
    } catch {
      setUploadError('アップロードに失敗しました')
    } finally {
      setUploading(false)
      onBlur()
    }
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
      </Label>
      {helpText && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{helpText}</p>
      )}

      {value ? (
        <div className="flex items-center gap-3 p-3 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--secondary))]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.name}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatBytes(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = '' }}
            className="text-xs text-[hsl(var(--destructive))] hover:underline shrink-0"
          >
            削除
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full p-6 border-2 border-dashed border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors disabled:opacity-50"
          >
            {uploading ? 'アップロード中...' : 'ファイルを選択（最大10MB）'}
          </button>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            対応形式: 画像、PDF、Word、Excel、テキスト
          </p>
        </div>
      )}

      {(error || uploadError) && (
        <p className="text-xs text-[hsl(var(--destructive))]">{error || uploadError}</p>
      )}
    </div>
  )
}
