import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'

export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  // Allow: admins, users with no role yet (bootstrap), users whose role grants ver_configuracion
  const hasRole = !!user?.rol
  const blocked = user && hasRole && !user.is_admin && !user.hasPermission('ver_configuracion')
  if (blocked) redirect('/dashboard')
  return <>{children}</>
}
