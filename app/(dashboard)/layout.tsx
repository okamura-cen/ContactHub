'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'

const navItems = [
  { href: '/', label: 'フォーム一覧', icon: '📋' },
]

/** サイドバー付きダッシュボードレイアウト */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* サイドバー */}
        <aside className="hidden md:flex w-64 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="p-6 border-b border-[hsl(var(--border))]">
            <Link href="/" className="text-xl font-bold text-[hsl(var(--primary))]">
              ContactHub
            </Link>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">EFOフォーム作成SaaS</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-[hsl(var(--border))]">
            <UserButton signInUrl="/sign-in" />
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-auto">
          {/* モバイルヘッダー */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
            <Link href="/" className="text-lg font-bold text-[hsl(var(--primary))]">
              ContactHub
            </Link>
            <UserButton signInUrl="/sign-in" />
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
