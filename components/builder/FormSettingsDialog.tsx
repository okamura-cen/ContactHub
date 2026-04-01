'use client'

import { useState, useEffect } from 'react'
import { FormSettings } from '@/types/builder'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
        <Button onClick={handleSave}>保存</Button>
      </DialogFooter>
    </Dialog>
  )
}
