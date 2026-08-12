import { DashboardShell } from '@/components/layout/dashboard-shell'
import { getCurrentUser } from '@/lib/current-user'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  return (
    <DashboardShell
      isAdmin={user?.is_admin ?? false}
      hasRole={!!user?.rol}
      permisos={user?.permisos ?? []}
    >
      {children}
    </DashboardShell>
  )
}
