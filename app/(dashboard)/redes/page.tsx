import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/current-user'
import RedesClient from './redes-client'

export const metadata: Metadata = { title: 'Redes' }

export default async function RedesPage() {
  const currentUser = await getCurrentUser()
  const hasFullAccess = currentUser?.is_admin || currentUser?.hasPermission('acceso_todas_redes')
  const canCrear  = currentUser?.hasPermission('crear_redes')  ?? true
  const canEditar = currentUser?.hasPermission('editar_redes') ?? true
  const canToggle = currentUser?.is_admin ?? false

  // null = show all | UUID = show only that red | undefined = show nothing
  const filterRedId = hasFullAccess ? null : (currentUser?.red_id ?? undefined)

  return (
    <RedesClient
      canCrear={canCrear}
      canEditar={canEditar}
      canToggle={canToggle}
      filterRedId={filterRedId}
    />
  )
}
