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
    if (currentUser?.is_encargado_red && currentUser.red_id) {
      gruposQuery = gruposQuery.eq('red_id', currentUser.red_id)
    } else {
      const liderIds = currentUser?.lider_grupo_ids ?? []
      const miembroIds = currentUser?.miembro_grupo_ids ?? []
      const myGroupIds = Array.from(new Set([...liderIds, ...miembroIds]))
      if (myGroupIds.length > 0) {
        gruposQuery = gruposQuery.in('id', myGroupIds)
      } else {
        // user does not belong to or lead any group -> empty result
        gruposQuery = gruposQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }
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

  let filteredRedes = redes ?? []
  if (!hasFullAccess) {
    if (currentUser?.is_encargado_red && currentUser.red_id) {
      filteredRedes = (redes ?? []).filter((r) => r.id === currentUser.red_id)
    } else {
      const allowedRedIds = Array.from(new Set(enrichedGrupos.map((g) => g.red_id).filter(Boolean)))
      filteredRedes = (redes ?? []).filter((r) => allowedRedIds.includes(r.id))
    }
  }

  const canCrear  = currentUser?.hasPermission('crear_grupos')  ?? true
  const canEditar = currentUser?.hasPermission('editar_grupos') ?? true

  return <GruposClient grupos={enrichedGrupos} redes={filteredRedes} canCrear={canCrear} canEditar={canEditar} />
}
