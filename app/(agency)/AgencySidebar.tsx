'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Users, FileText, Settings } from 'lucide-react'

const navItems = [
  { href: '/agency',         label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/agency/clients', label: 'クライアント管理', icon: Users },
  { href: '/agency/forms',   label: 'フォーム管理',    icon: FileText },
  { href: '/agency/settings',label: '設定',            icon: Settings },
]

export default function AgencySidebar({ agencyName }: { agencyName: string }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/agency') return pathname === '/agency'
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] shrink-0">
      <div className="px-4 py-4 border-b border-[hsl(var(--border))]">
        <Link href="/agency">
          <Image
            src="/contacthub_logo_yoko.svg"
            alt="ContactHub"
            width={180}
            height={40}
            style={{ width: '100%', height: 'auto' }}
            priority
          />
        </Link>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 truncate">{agencyName}</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
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
      </nav>
      <div className="p-4 border-t border-[hsl(var(--border))]">
        <UserButton signInUrl="/sign-in" />
      </div>
    </aside>
  )
}
