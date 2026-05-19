import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import NuevoGrupoForm from './nuevo-grupo-form'

export const metadata: Metadata = { title: 'Nuevo grupo' }

export default async function NuevoGrupoPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  const hasFullAccess = currentUser?.is_admin || currentUser?.hasPermission('acceso_todas_redes')

  // For restricted users: pre-fill red_id with their own red
  const defaultRedId = (!hasFullAccess && currentUser?.red_id) ? currentUser.red_id : null
  const lockRed = !hasFullAccess && !!defaultRedId

  const [{ data: personas }, { data: redes }] = await Promise.all([
    supabase
      .from('personas')
      .select('id, nombres, apellidos')
      .is('deleted_at', null)
      .order('nombres'),
    supabase
      .from('redes')
      .select('id, nombre')
      .is('deleted_at', null)
      .eq('estado', true)
      .order('nombre'),
  ])

  return (
    <NuevoGrupoForm
      personas={personas ?? []}
      redes={redes ?? []}
      defaultRedId={defaultRedId}
      lockRed={lockRed}
    />
  )
}
