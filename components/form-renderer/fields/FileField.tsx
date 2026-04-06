'use client'

import { useRef, useState, useCallback } from 'react'
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
  const [isDragging, setIsDragging] = useState(false)

  const uploadFile = useCallback(async (file: File) => {
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
  }, [formId, onChange, onBlur])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await uploadFile(file)
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
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={`w-full p-8 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors
              ${isDragging
                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]'
              }
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--primary))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">アップロード中...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  ここにドラッグ＆ドロップ
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  または<span className="text-[hsl(var(--primary))] underline">ファイルを選択</span>（最大10MB）
                </p>
              </div>
            )}
          </div>
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
