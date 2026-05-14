import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Persona, Asistencia, GrupoMiembro } from '@/types'
import { AsistenciaClient } from './asistencia-client'

interface PageProps {
  params: Promise<{ eventoId: string }>
  searchParams: Promise<{ grupo_id?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventoId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('eventos')
    .select('nombre')
    .eq('id', eventoId)
    .single()
  return { title: data ? `Asistencia · ${data.nombre}` : 'Asistencia' }
}

export default async function AsistenciaPage({ params, searchParams }: PageProps) {
  const { eventoId } = await params
  const { grupo_id: grupoFiltro } = await searchParams
  const supabase = await createClient()

  // Load event
  const { data: evento } = await supabase
    .from('eventos')
    .select('*, grupo:grupos(id,nombre)')
    .eq('id', eventoId)
    .single()

  if (!evento) notFound()

  const grupoId = evento.grupo_id as string | null

  // For global events opened from a group, use the grupo_id param as context
  const grupoParaMiembros = grupoId ?? grupoFiltro ?? null

  // Load existing attendances
  const { data: asistenciasExistentes } = await supabase
    .from('asistencias')
    .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
    .eq('evento_id', eventoId)

  // Load members: use the resolved group (event's group or URL param for global events)
  let miembros: (GrupoMiembro & { persona: Persona })[] = []

  if (grupoParaMiembros) {
    const { data: miembrosData } = await supabase
      .from('grupo_miembros')
      .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
      .eq('grupo_id', grupoParaMiembros)
      .eq('activo', true)
      .order('created_at')

    miembros = (miembrosData ?? []) as (GrupoMiembro & { persona: Persona })[]
  }

  // Load group info when event is global but a group filter is given
  let grupoOrigen: { id: string; nombre: string } | null = null
  if (!grupoId && grupoFiltro) {
    const { data: g } = await supabase
      .from('grupos')
      .select('id, nombre')
      .eq('id', grupoFiltro)
      .single()
    grupoOrigen = g
  }

  // Get current user id for registrado_por
  const { data: { user } } = await supabase.auth.getUser()

  const grupoRaw = evento.grupo
  const grupo = (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { id: string; nombre: string } | null

  return (
    <AsistenciaClient
      evento={{
        id: evento.id,
        nombre: evento.nombre,
        fecha: evento.fecha,
        hora_inicio: evento.hora_inicio,
        hora_fin: evento.hora_fin,
        estado: evento.estado,
        grupo: grupo ?? grupoOrigen,
        grupo_id: grupoId,
      }}
      grupoOrigenId={grupoFiltro ?? grupoId}
      miembrosIniciales={miembros}
      asistenciasIniciales={(asistenciasExistentes ?? []) as (Asistencia & { persona: Persona | null })[]}
      usuarioId={user?.id ?? null}
    />
  )
}
