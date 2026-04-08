import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/admin'
import { ToastProvider } from '@/components/ui/toast'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin()
  if (!admin) redirect('/')

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-3 flex items-center gap-4">
          <span className="font-bold text-sm text-[hsl(var(--primary))]">ContactHub</span>
          <span className="text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-2 py-0.5 rounded font-medium">SUPER ADMIN</span>
          <nav className="flex gap-4 ml-4">
            <a href="/admin/users" className="text-sm text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))]">ユーザー管理</a>
            <a href="/admin/agencies" className="text-sm text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))]">代理店管理</a>
          </nav>
          <a href="/" className="ml-auto text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">← 通常画面へ</a>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </div>
    </ToastProvider>
  )
}
