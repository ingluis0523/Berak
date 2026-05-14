import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'

export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user?.is_admin) redirect('/dashboard')
  return <>{children}</>
}
