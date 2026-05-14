import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GrupoDetalle from './grupo-detalle'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('grupos').select('nombre').eq('id', id).single()
  return { title: data?.nombre ?? 'Grupo' }
}

export default async function GrupoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: grupo } = await supabase
    .from('grupos')
    .select(`
      *,
      lider:personas!lider_id(id,nombres,apellidos),
      sublider:personas!sublider_id(id,nombres,apellidos),
      anfitrion:personas!anfitrion_id(id,nombres,apellidos),
      red:redes(id,nombre)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!grupo) notFound()

  const { data: miembros } = await supabase
    .from('grupo_miembros')
    .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
    .eq('grupo_id', id)
    .eq('activo', true)
    .order('fecha_ingreso', { ascending: false })

  // Fetch group events AND global events (grupo_id IS NULL)
  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, nombre, fecha, hora_inicio, hora_fin, estado, descripcion, grupo_id')
    .or(`grupo_id.eq.${id},grupo_id.is.null`)
    .order('fecha', { ascending: false })
    .limit(50)

  const eventoIds = (eventos ?? []).map((e) => e.id)

  // Get this group's member IDs to filter attendance stats correctly (also for global events)
  const { data: miembrosParaStats } = await supabase
    .from('grupo_miembros')
    .select('persona_id')
    .eq('grupo_id', id)
    .eq('activo', true)
  const memberIds = (miembrosParaStats ?? []).map((m) => m.persona_id).filter(Boolean)

  let asistenciasCountMap: Record<string, number> = {}
  if (eventoIds.length > 0 && memberIds.length > 0) {
    const { data: counts } = await supabase
      .from('asistencias')
      .select('evento_id')
      .in('evento_id', eventoIds)
      .in('persona_id', memberIds)
      .eq('estado', 'asistio')
      .eq('es_visitante', false)
    counts?.forEach((a) => {
      asistenciasCountMap[a.evento_id] = (asistenciasCountMap[a.evento_id] ?? 0) + 1
    })
  }

  const eventosWithCount = (eventos ?? []).map((e) => ({
    ...e,
    asistencias_count: asistenciasCountMap[e.id] ?? 0,
  }))

  return (
    <GrupoDetalle
      grupo={grupo}
      miembrosIniciales={miembros ?? []}
      eventosIniciales={eventosWithCount as import('@/types').Evento[]}
    />
  )
}
