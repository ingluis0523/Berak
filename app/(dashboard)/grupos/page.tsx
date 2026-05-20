import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import GruposClient from './grupos-client'

export const metadata: Metadata = { title: 'Grupos' }

export default async function GruposPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  let gruposQuery = supabase
    .from('grupos')
    .select('*, lider:personas!lider_id(id,nombres,apellidos), red:redes(id,nombre)')
    .is('deleted_at', null)
    .order('nombre')

  // Scope non-admin users to their own network unless they have full access
  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')
  if (!hasFullAccess) {
    const liderIds = currentUser?.lider_grupo_ids ?? []
    const redId = currentUser?.red_id
    if (redId && liderIds.length > 0) {
      gruposQuery = gruposQuery.or(`red_id.eq.${redId},id.in.(${liderIds.join(',')})`)
    } else if (redId) {
      gruposQuery = gruposQuery.eq('red_id', redId)
    } else if (liderIds.length > 0) {
      gruposQuery = gruposQuery.in('id', liderIds)
    }
    // no red and no led groups → unfiltered (unassigned user, existing behavior)
  }

  const [{ data: grupos }, { data: redes }] = await Promise.all([
    gruposQuery,
    supabase
      .from('redes')
      .select('id, nombre')
      .is('deleted_at', null)
      .eq('estado', true)
      .order('nombre'),
  ])

  // Fetch member counts
  const { data: miembrosData } = await supabase
    .from('grupo_miembros')
    .select('grupo_id')
    .eq('activo', true)

  const countMap: Record<string, number> = {}
  miembrosData?.forEach((m) => {
    if (m.grupo_id) countMap[m.grupo_id] = (countMap[m.grupo_id] ?? 0) + 1
  })

  const enrichedGrupos = (grupos ?? []).map((g) => ({
    ...g,
    miembros_count: countMap[g.id] ?? 0,
  }))

  const canCrear  = currentUser?.hasPermission('crear_grupos')  ?? true
  const canEditar = currentUser?.hasPermission('editar_grupos') ?? true

  return <GruposClient grupos={enrichedGrupos} redes={redes ?? []} canCrear={canCrear} canEditar={canEditar} />
}
