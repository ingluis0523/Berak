import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import GruposClient from './grupos-client'

export const metadata: Metadata = { title: 'Grupos' }

export default async function GruposPage() {
  const supabase = await createClient()

  const [{ data: grupos }, { data: redes }] = await Promise.all([
    supabase
      .from('grupos')
      .select('*, lider:personas!lider_id(id,nombres,apellidos), red:redes(id,nombre)')
      .is('deleted_at', null)
      .order('nombre'),
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

  return <GruposClient grupos={enrichedGrupos} redes={redes ?? []} />
}
