import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'

export default async function RolesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.canSeeModule('roles')) redirect('/dashboard')
  return <>{children}</>
}
