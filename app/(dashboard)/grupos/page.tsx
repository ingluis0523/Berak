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

  // Scope non-admin users to their own network
  if (!currentUser?.is_admin && currentUser?.red_id) {
    gruposQuery = gruposQuery.eq('red_id', currentUser.red_id)
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

  const canCrear  = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('crear_grupos')
  const canEditar = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('editar_grupos')

  return <GruposClient grupos={enrichedGrupos} redes={redes ?? []} canCrear={canCrear} canEditar={canEditar} />
}
