import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Persona, Asistencia, GrupoMiembro } from '@/types'
import { AsistenciaClient } from './asistencia-client'
import { getCurrentUser } from '@/lib/current-user'

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
    .select('*, grupo:grupos(id,nombre,lider_id,sublider_id,anfitrion_id)')
    .eq('id', eventoId)
    .single()

  if (!evento) notFound()

  const currentUser = await getCurrentUser()
  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')

  let myGroupIds: string[] = []
  let scopedPersonaIds: string[] = []

  if (!hasFullAccess) {
    const { resolveUserScope } = await import('@/lib/resolve-user-scope')
    const { myGroupIds: gIds, scopedPersonaIds: pIds } = await resolveUserScope(supabase, currentUser)
    myGroupIds = gIds
    scopedPersonaIds = pIds
  }

  // Validate permission and group constraints
  const canSeeAsistencia = (
    currentUser?.hasPermission('ver_asistencias') ||
    currentUser?.hasPermission('registrar_asistencias') ||
    currentUser?.hasPermission('editar_asistencias') ||
    currentUser?.hasPermission('asistencias')
  ) ?? true
  if (!canSeeAsistencia) notFound()

  if (!hasFullAccess) {
    const isGlobal = !evento.grupo_id
    if (isGlobal) {
      if (!grupoFiltro || !myGroupIds.includes(grupoFiltro)) {
        notFound()
      }
    } else {
      if (!myGroupIds.includes(evento.grupo_id)) {
        notFound()
      }
    }
  }

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
  let grupoOrigen: { id: string; nombre: string; lider_id?: string | null; sublider_id?: string | null; anfitrion_id?: string | null } | null = null
  if (!grupoId && grupoFiltro) {
    const { data: g } = await supabase
      .from('grupos')
      .select('id, nombre, lider_id, sublider_id, anfitrion_id')
      .eq('id', grupoFiltro)
      .single()
    grupoOrigen = g
  }

  // Get current user id for registrado_por
  const { data: { user } } = await supabase.auth.getUser()

  const grupoRaw = evento.grupo
  const grupo = (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { id: string; nombre: string; lider_id?: string | null; sublider_id?: string | null; anfitrion_id?: string | null } | null

  // For global events, only show visitors registered by the group's leaders/members or the current user
  let filteredAsistencias = asistenciasExistentes ?? []
  if (!grupoId && grupoParaMiembros) {
    const activeGroup = grupoOrigen || grupo
    const liderIds = [
      activeGroup?.lider_id,
      activeGroup?.sublider_id,
      activeGroup?.anfitrion_id
    ].filter(Boolean) as string[]

    const associatedPersonaIds = Array.from(new Set([
      ...liderIds,
      ...miembros.map((m) => m.persona_id as string)
    ]))

    let allowedRegisterUserIds: string[] = []
    if (associatedPersonaIds.length > 0) {
      const { data: userRecords } = await supabase
        .from('usuarios')
        .select('id')
        .in('persona_id', associatedPersonaIds)
      allowedRegisterUserIds = (userRecords ?? []).map((u) => u.id)
    }

    if (user?.id && !allowedRegisterUserIds.includes(user.id)) {
      allowedRegisterUserIds.push(user.id)
    }

    filteredAsistencias = (asistenciasExistentes ?? []).filter((a) => {
      // Keep members
      if (!a.es_visitante && a.persona_id) return true
      // Keep visitors that belong to this group:
      // Either they have the grupo_id stored in `notas` matching this group,
      // OR (for old records) we fall back to checking if they were registered by the group's leaders
      if (a.notas && a.notas.startsWith('grupo_id:')) {
        const storedGroupId = a.notas.replace('grupo_id:', '').trim()
        return storedGroupId === grupoParaMiembros
      }
      return a.registrado_por && allowedRegisterUserIds.includes(a.registrado_por)
    })
  }

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
      asistenciasIniciales={filteredAsistencias as (Asistencia & { persona: Persona | null })[]}
      usuarioId={user?.id ?? null}
      hasFullAccess={hasFullAccess}
      scopedPersonaIds={scopedPersonaIds}
      permisos={currentUser?.permisos ?? []}
    />
  )
}
