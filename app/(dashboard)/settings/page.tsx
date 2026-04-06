'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">アカウントや通知の設定を管理できます</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">準備中</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            設定ページは近日公開予定です。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
