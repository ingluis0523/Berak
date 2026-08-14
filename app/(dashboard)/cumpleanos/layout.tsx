import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'

export default async function CumpleanosLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const hasRole = !!user?.rol
  const blocked = user && hasRole && !user.is_admin && !user.permisos.some((p) => p.includes("configuracion"))
  if (blocked) redirect('/dashboard')
  return <>{children}</>
}
