'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { User, Mail, CreditCard, KeyRound } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'スターター',
  PRO: 'プロ',
  AGENCY: '代理店',
}

interface Profile {
  id: string
  email: string
  name: string | null
  plan: string
  createdAt: string
  role: string
}

// ---------- AGENCY settings ----------

function AgencySettings({ profile }: { profile: Profile }) {
  const { toast } = useToast()
  const [name, setName] = useState(profile.name || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/agency/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        toast({ title: 'プロフィールを更新しました', variant: 'success' })
      } else {
        const { error } = await res.json()
        toast({ title: error || '更新に失敗しました', variant: 'destructive' })
      }
    } catch {
      toast({ title: '更新に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          アカウントの設定を管理します
        </p>
      </div>

      {/* プロフィール */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User size={16} />
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">代理店名</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 株式会社〇〇"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アカウント情報 */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail size={16} />
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">メールアドレス</label>
            <p className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] rounded-md px-3 py-2.5">
              {profile.email}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">登録日</label>
            <p className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] rounded-md px-3 py-2.5">
              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('ja-JP') : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* プラン */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={16} />
            プラン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{PLAN_LABELS[profile.plan] ?? profile.plan}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                現在のご契約プランです
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {PLAN_LABELS[profile.plan] ?? profile.plan}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* パスワード */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound size={16} />
            パスワード
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            パスワードの変更はユーザーアイコン（画面左下）からお手続きください。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- CLIENT settings ----------

function ClientSettings({ profile }: { profile: Profile }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          アカウントの設定を確認できます
        </p>
      </div>

      {/* アカウント情報 */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail size={16} />
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">名前</label>
            <p className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] rounded-md px-3 py-2.5">
              {profile.name || '(未設定)'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">メールアドレス</label>
            <p className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] rounded-md px-3 py-2.5">
              {profile.email}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">登録日</label>
            <p className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] rounded-md px-3 py-2.5">
              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('ja-JP') : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* プラン */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={16} />
            プラン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{PLAN_LABELS[profile.plan] ?? profile.plan}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                現在のご契約プランです
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {PLAN_LABELS[profile.plan] ?? profile.plan}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* パスワード */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound size={16} />
            パスワード
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            パスワードの変更はユーザーアイコン（画面左下）からお手続きください。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- Page entry ----------

export default function SettingsPage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((u) => {
        setProfile(u)
        setLoading(false)
      })
      .catch(() => {
        toast({ title: 'データの取得に失敗しました', variant: 'destructive' })
        setLoading(false)
      })
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!profile) return null

  if (profile.role === 'AGENCY' || profile.role === 'SUPER_ADMIN') return <AgencySettings profile={profile} />
  return <ClientSettings profile={profile} />
}
