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

  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, nombre, fecha, hora_inicio, hora_fin, estado, descripcion')
    .eq('grupo_id', id)
    .order('fecha', { ascending: false })
    .limit(50)

  // Fetch attendance counts (asistio only, non-visitor) per event
  const eventoIds = (eventos ?? []).map((e) => e.id)
  let asistenciasCountMap: Record<string, number> = {}
  if (eventoIds.length > 0) {
    const { data: counts } = await supabase
      .from('asistencias')
      .select('evento_id')
      .in('evento_id', eventoIds)
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
