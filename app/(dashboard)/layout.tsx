'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'

const navItems = [
  { href: '/',           label: 'ダッシュボード', icon: '🏠' },
  { href: '/forms',      label: 'フォーム管理',   icon: '📋' },
  { href: '/responses',  label: '送信データ',     icon: '📬' },
  { href: '/analytics',  label: '分析',           icon: '📊' },
  { href: '/settings',   label: '設定',           icon: '⚙️' },
]

/** サイドバー付きダッシュボードレイアウト */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* サイドバー */}
        <aside className="hidden md:flex w-56 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] shrink-0">
          <div className="px-4 py-4 border-b border-[hsl(var(--border))]">
            <Link href="/">
              <Image src="/contacthub_logo_yoko.svg" alt="ContactHub" width={180} height={40} style={{ width: '100%', height: 'auto' }} priority />
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-[hsl(var(--border))]">
            <UserButton signInUrl="/sign-in" />
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-auto min-w-0">
          {/* モバイルヘッダー */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
            <Link href="/">
              <Image src="/contacthub_logo_tate.svg" alt="ContactHub" width={100} height={44} priority />
            </Link>
            <UserButton signInUrl="/sign-in" />
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
