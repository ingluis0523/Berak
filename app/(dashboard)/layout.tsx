import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/current-user'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4F8]">
      <Sidebar
        isAdmin={user?.is_admin ?? false}
        permisos={user?.permisos ?? []}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
