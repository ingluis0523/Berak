import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/current-user'
import MinisteriosClient from './ministerios-client'

export const metadata: Metadata = { title: 'Ministerios' }

export default async function MinisteriosPage() {
  const currentUser = await getCurrentUser()
  const canCrear  = currentUser?.hasPermission('crear_ministerios')  ?? true
  const canEditar = currentUser?.hasPermission('editar_ministerios') ?? true

  return <MinisteriosClient canCrear={canCrear} canEditar={canEditar} />
}
