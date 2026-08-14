import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'

export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user?.canSeeModule('reportes')) {
    redirect('/dashboard')
  }
  return <>{children}</>
}
