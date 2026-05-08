import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Persona, Asistencia, GrupoMiembro } from '@/types'
import { AsistenciaClient } from './asistencia-client'

interface PageProps {
  params: Promise<{ eventoId: string }>
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

export default async function AsistenciaPage({ params }: PageProps) {
  const { eventoId } = await params
  const supabase = await createClient()

  // Load event
  const { data: evento } = await supabase
    .from('eventos')
    .select('*, grupo:grupos(id,nombre)')
    .eq('id', eventoId)
    .single()

  if (!evento) notFound()

  const grupoId = evento.grupo_id as string | null

  // Load existing attendances
  const { data: asistenciasExistentes } = await supabase
    .from('asistencias')
    .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
    .eq('evento_id', eventoId)

  // Load members: if event has a group, load group members; otherwise empty (user will search)
  let miembros: (GrupoMiembro & { persona: Persona })[] = []

  if (grupoId) {
    const { data: miembrosData } = await supabase
      .from('grupo_miembros')
      .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
      .eq('grupo_id', grupoId)
      .eq('activo', true)
      .order('created_at')

    miembros = (miembrosData ?? []) as (GrupoMiembro & { persona: Persona })[]
  }

  // Get current user id for registrado_por
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AsistenciaClient
      evento={{
        id: evento.id,
        nombre: evento.nombre,
        fecha: evento.fecha,
        hora_inicio: evento.hora_inicio,
        hora_fin: evento.hora_fin,
        estado: evento.estado,
        grupo: evento.grupo as { id: string; nombre: string } | null,
        grupo_id: grupoId,
      }}
      miembrosIniciales={miembros}
      asistenciasIniciales={(asistenciasExistentes ?? []) as (Asistencia & { persona: Persona | null })[]}
      usuarioId={user?.id ?? null}
    />
  )
}
