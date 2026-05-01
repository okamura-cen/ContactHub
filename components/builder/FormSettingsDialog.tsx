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
  const [tab, setTab] = useState<'general' | 'lp'>('general')

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  const handleSave = () => {
    onSave(local)
    onOpenChange(false)
  }

  const addFooterLink = () => {
    setLocal({ ...local, lpFooterLinks: [...(local.lpFooterLinks || []), { label: '', url: '' }] })
  }
  const updateFooterLink = (i: number, field: 'label' | 'url', value: string) => {
    const links = [...(local.lpFooterLinks || [])]
    links[i] = { ...links[i], [field]: value }
    setLocal({ ...local, lpFooterLinks: links })
  }
  const removeFooterLink = (i: number) => {
    setLocal({ ...local, lpFooterLinks: (local.lpFooterLinks || []).filter((_, j) => j !== i) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>フォーム設定</DialogTitle>
      </DialogHeader>
      {/* タブ切り替え */}
      <div className="flex gap-2 mt-3 mb-1">
        <Button size="sm" variant={tab === 'general' ? 'default' : 'outline'} onClick={() => setTab('general')}>基本設定</Button>
        <Button size="sm" variant={tab === 'lp' ? 'default' : 'outline'} onClick={() => setTab('lp')}>ランディングページ</Button>
      </div>
      <div className="mt-2 space-y-4 max-h-[60vh] overflow-y-auto">
        {tab === 'general' ? (<>
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
        </>) : (<>
        {/* ランディングページ設定 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="lp-enabled" checked={local.lpEnabled ?? false}
              onChange={(e) => setLocal({ ...local, lpEnabled: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor="lp-enabled" className="text-sm cursor-pointer font-medium">
              ランディングページを有効にする
            </Label>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            有効にすると公開ページ（/f/フォームID）にヘッダー・説明文・フッターが表示されます
          </p>
        </div>

        {(local.lpEnabled ?? false) && (<>
          <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
            <p className="text-sm font-medium">ヘッダー</p>
            <div className="space-y-1">
              <Label className="text-sm">ロゴ画像 URL</Label>
              <Input value={local.lpLogoUrl || ''} onChange={(e) => setLocal({ ...local, lpLogoUrl: e.target.value })}
                placeholder="https://example.com/logo.png" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">ヘッダー画像 URL</Label>
              <Input value={local.lpHeroImageUrl || ''} onChange={(e) => setLocal({ ...local, lpHeroImageUrl: e.target.value })}
                placeholder="https://example.com/hero.jpg" />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">フォーム上部に表示される画像（横幅いっぱいに表示）</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
            <p className="text-sm font-medium">コンテンツ</p>
            <div className="space-y-1">
              <Label className="text-sm">見出し</Label>
              <Input value={local.lpHeading || ''} onChange={(e) => setLocal({ ...local, lpHeading: e.target.value })}
                placeholder="お問い合わせ" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">説明文</Label>
              <Textarea value={local.lpDescription || ''} onChange={(e) => setLocal({ ...local, lpDescription: e.target.value })}
                rows={3} placeholder="以下のフォームからお気軽にお問い合わせください。" />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
            <p className="text-sm font-medium">デザイン</p>
            <div className="flex items-center gap-3">
              <Label className="text-sm w-24 shrink-0">背景色</Label>
              <input type="color" value={local.lpBgColor || '#f8fafc'}
                onChange={(e) => setLocal({ ...local, lpBgColor: e.target.value })}
                className="h-8 w-16 rounded cursor-pointer border border-[hsl(var(--border))]" />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{local.lpBgColor || '#f8fafc'}</span>
              {local.lpBgColor && (
                <button className="text-xs text-[hsl(var(--muted-foreground))] hover:underline"
                  onClick={() => setLocal({ ...local, lpBgColor: undefined })}>リセット</button>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
            <p className="text-sm font-medium">フッター</p>
            <div className="space-y-1">
              <Label className="text-sm">会社名</Label>
              <Input value={local.lpFooterCompany || ''} onChange={(e) => setLocal({ ...local, lpFooterCompany: e.target.value })}
                placeholder="株式会社〇〇" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">フッターテキスト</Label>
              <Textarea value={local.lpFooterText || ''} onChange={(e) => setLocal({ ...local, lpFooterText: e.target.value })}
                rows={2} placeholder="〒000-0000 東京都渋谷区..." />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">フッターリンク</Label>
              {(local.lpFooterLinks || []).map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={link.label} onChange={(e) => updateFooterLink(i, 'label', e.target.value)}
                    placeholder="プライバシーポリシー" className="flex-1" />
                  <Input value={link.url} onChange={(e) => updateFooterLink(i, 'url', e.target.value)}
                    placeholder="https://..." className="flex-1" />
                  <Button size="sm" variant="ghost" className="text-[hsl(var(--destructive))] shrink-0"
                    onClick={() => removeFooterLink(i)}>×</Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={addFooterLink}>
                + リンクを追加
              </Button>
            </div>
          </div>
        </>)}
        </>)}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
        <Button onClick={handleSave}>保存</Button>
      </DialogFooter>
    </Dialog>
  )
}
