'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'
import { LayoutDashboard, FileText, Inbox, BarChart2, Settings, ShieldCheck, Users, HelpCircle } from 'lucide-react'

const navItems = [
  { href: '/',          label: 'ダッシュボード',   icon: LayoutDashboard, clientHidden: false, agencyOnly: false },
  { href: '/forms',     label: 'フォーム管理',     icon: FileText,        clientHidden: false, agencyOnly: false },
  { href: '/clients',   label: 'クライアント管理', icon: Users,           clientHidden: true,  agencyOnly: true  },
  { href: '/responses', label: '送信データ',       icon: Inbox,           clientHidden: false, agencyOnly: false },
  { href: '/analytics', label: '分析',             icon: BarChart2,       clientHidden: false, agencyOnly: false },
  { href: '/settings',  label: '設定',             icon: Settings,        clientHidden: true,  agencyOnly: false },
  { href: '/help',      label: 'ヘルプ',           icon: HelpCircle,      clientHidden: false, agencyOnly: false },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isAgency, setIsAgency] = useState(false)
  const [agencyInfo, setAgencyInfo] = useState<{ name: string; email: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((u) => {
      if (u.role === 'SUPER_ADMIN') {
        setIsSuperAdmin(true)
        setIsAgency(true) // SUPER_ADMINは自分を代理店として扱う
      }
      if (u.role === 'AGENCY') setIsAgency(true)
      if (u.role === 'CLIENT') {
        setIsClient(true)
        if (u.agencyInfo) setAgencyInfo(u.agencyInfo)
      }
    }).catch(() => {})
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const visibleItems = navItems.filter((item) => {
    if (isClient && item.clientHidden) return false
    if (item.agencyOnly && !isAgency) return false
    return true
  })

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* サイドバー */}
        <aside className="hidden md:flex w-56 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] shrink-0">
          <div className="px-4 py-4 border-b border-[hsl(var(--border))]">
            {isClient && agencyInfo?.logoUrl ? (
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agencyInfo.logoUrl} alt="logo" className="h-8 object-contain" />
              </Link>
            ) : (
              <Link href="/">
                <Image src="/contacthub_logo_yoko.svg" alt="ContactHub" width={180} height={40} style={{ width: '100%', height: 'auto' }} priority />
              </Link>
            )}
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-purple-600 hover:bg-purple-50 mt-2 border-t border-[hsl(var(--border))] pt-3"
              >
                <ShieldCheck size={16} />
                管理者メニュー
              </Link>
            )}
          </nav>
          {isClient && agencyInfo && (
            <div className="px-4 py-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
              <p className="font-medium text-[hsl(var(--foreground))]">担当</p>
              <p className="truncate mt-0.5">{agencyInfo.name}</p>
            </div>
          )}
          <div className="p-4 border-t border-[hsl(var(--border))]">
            <UserButton signInUrl="/sign-in" />
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-auto min-w-0">
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
