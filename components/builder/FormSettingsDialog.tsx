'use client'

import { useState, useEffect } from 'react'
import { FormSettings } from '@/types/builder'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const FONT_OPTIONS = [
  { value: '', label: 'デフォルト（システムフォント）' },
  { value: '"Noto Sans JP", sans-serif', label: 'Noto Sans JP' },
  { value: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif', label: 'ヒラギノ角ゴ' },
  { value: '"Yu Gothic", "游ゴシック", sans-serif', label: '游ゴシック' },
  { value: '"M PLUS Rounded 1c", sans-serif', label: 'M PLUS Rounded 1c' },
]

interface FormSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: FormSettings
  onSave: (settings: FormSettings) => void
}

/** フォーム設定ダイアログ */
export function FormSettingsDialog({ open, onOpenChange, settings, onSave }: FormSettingsDialogProps) {
  const [local, setLocal] = useState<FormSettings>(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  const handleSave = () => {
    onSave(local)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>フォーム設定</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-1">
          <Label className="text-sm">完了メッセージ</Label>
          <Textarea
            value={local.successMessage}
            onChange={(e) => setLocal({ ...local, successMessage: e.target.value })}
            rows={2}
            placeholder="送信が完了しました。ありがとうございます。"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">リダイレクトURL</Label>
          <Input
            value={local.redirectUrl || ''}
            onChange={(e) => setLocal({ ...local, redirectUrl: e.target.value })}
            placeholder="https://example.com/thanks"
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">送信完了後に別ページへ遷移させる場合</p>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">通知メールアドレス</Label>
          <Input
            value={(local.notifyEmails || []).join(', ')}
            onChange={(e) =>
              setLocal({
                ...local,
                notifyEmails: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="admin@example.com, staff@example.com"
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">カンマ区切りで複数指定可</p>
        </div>
        <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-reply"
              checked={local.autoReply}
              onChange={(e) => setLocal({ ...local, autoReply: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="auto-reply" className="text-sm cursor-pointer">
              自動返信メールを送信する
            </Label>
          </div>
          {local.autoReply && (
            <div className="space-y-1">
              <Label className="text-sm">自動返信メッセージ</Label>
              <Textarea
                value={local.autoReplyMessage || ''}
                onChange={(e) => setLocal({ ...local, autoReplyMessage: e.target.value })}
                rows={4}
                placeholder="お問い合わせいただきありがとうございます。内容を確認の上、担当者よりご連絡いたします。"
              />
            </div>
          )}
        </div>

        {/* スパム対策 */}
        <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
          <p className="text-sm font-medium">スパム対策</p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recaptcha-enabled"
              checked={local.recaptchaEnabled ?? false}
              onChange={(e) => setLocal({ ...local, recaptchaEnabled: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="recaptcha-enabled" className="text-sm cursor-pointer">
              reCAPTCHA v3 を有効にする
            </Label>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            有効にするには環境変数 NEXT_PUBLIC_RECAPTCHA_SITE_KEY と RECAPTCHA_SECRET_KEY の設定が必要です
          </p>
        </div>

        {/* デザイン設定 */}
        <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
          <p className="text-sm font-medium">デザイン設定</p>
          <div className="flex items-center gap-3">
            <Label className="text-sm w-24 shrink-0">テーマカラー</Label>
            <input
              type="color"
              value={local.primaryColor || '#2563eb'}
              onChange={(e) => setLocal({ ...local, primaryColor: e.target.value })}
              className="h-8 w-16 rounded cursor-pointer border border-[hsl(var(--border))]"
            />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{local.primaryColor || '#2563eb'}</span>
            {local.primaryColor && (
              <button
                className="text-xs text-[hsl(var(--muted-foreground))] hover:underline"
                onClick={() => setLocal({ ...local, primaryColor: undefined })}
              >
                リセット
              </button>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-sm">フォント</Label>
            <select
              value={local.fontFamily || ''}
              onChange={(e) => setLocal({ ...local, fontFamily: e.target.value })}
              className="w-full h-9 px-3 text-sm border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))]"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">カスタムCSS</Label>
            <Textarea
              value={local.customCss || ''}
              onChange={(e) => setLocal({ ...local, customCss: e.target.value })}
              rows={5}
              placeholder={`.efo-form {\n  border-radius: 12px;\n}\n.efo-form button {\n  border-radius: 4px;\n}`}
              className="font-mono text-xs"
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">.efo-form をルートセレクタとして使用できます</p>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
        <Button onClick={handleSave}>保存</Button>
      </DialogFooter>
    </Dialog>
  )
}
