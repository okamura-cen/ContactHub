import { redirect } from 'next/navigation'
import { requireAgency } from '@/lib/access'
import { ToastProvider } from '@/components/ui/toast'
import AgencySidebar from './AgencySidebar'

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const agency = await requireAgency()
  if (!agency) redirect('/')

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <AgencySidebar agencyName={agency.name || agency.email} />
        <main className="flex-1 overflow-auto min-w-0">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
