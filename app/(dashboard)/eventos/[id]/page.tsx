import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { formatDate, formatDateLong, ESTADO_EVENTO_LABELS, ESTADO_ASISTENCIA_LABELS, getInitials } from '@/lib/utils'
import type { Evento, Asistencia, Persona } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CalendarDays,
  Clock,
  Users,
  ClipboardCheck,
  Pencil,
  XCircle,
  ArrowLeft,
  UserCheck,
  UserX,
  Star,
} from 'lucide-react'
import { EventoCancelarButton } from './evento-cancelar-button'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ grupo_id?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('eventos')
    .select('nombre')
    .eq('id', id)
    .single()
  return { title: data?.nombre ?? 'Evento' }
}

export default async function EventoDetallePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { grupo_id: grupoFiltro } = await searchParams
  const [supabase, currentUser] = await Promise.all([createClient(), getCurrentUser()])
  const canCancel = currentUser?.hasPermission('cancelar_eventos') ?? false

  const { data: evento } = await supabase
    .from('eventos')
    .select('*, grupo:grupos(id,nombre), plantilla:eventos_plantilla(id,nombre,frecuencia)')
    .eq('id', id)
    .single()

  if (!evento) notFound()

  const evBase = evento as Evento & {
    grupo: unknown
    plantilla: unknown
  }
  const grupoRaw = evBase.grupo
  const plantillaRaw = evBase.plantilla
  const ev = {
    ...evBase,
    grupo: (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { id: string; nombre: string } | null,
    plantilla: (Array.isArray(plantillaRaw) ? plantillaRaw[0] : plantillaRaw) as { id: string; nombre: string; frecuencia: string } | null,
  }

  // For global events opened from a group, filter attendance to that group's members
  const grupoContexto = ev.grupo_id ?? grupoFiltro ?? null
  let memberIdsForFilter: string[] | null = null

  if (grupoContexto) {
    const { data: gm } = await supabase
      .from('grupo_miembros')
      .select('persona_id')
      .eq('grupo_id', grupoContexto)
      .eq('activo', true)
    memberIdsForFilter = (gm ?? []).map((m) => m.persona_id as string)
  }

  // Load attendances — filter by group members for global events
  let asistQuery = supabase
    .from('asistencias')
    .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
    .eq('evento_id', id)
    .order('created_at')

  if (!ev.grupo_id && memberIdsForFilter && memberIdsForFilter.length > 0) {
    // Global event: only show records for this group's members (+ visitors)
    asistQuery = asistQuery.or(
      `persona_id.in.(${memberIdsForFilter.join(',')}),es_visitante.eq.true,persona_id.is.null`
    )
  }

  const { data: asistencias } = await asistQuery
  const asist = (asistencias ?? []) as (Asistencia & { persona: Persona | null })[]

  const asistio    = asist.filter((a) => a.estado === 'asistio')
  const noAsistio  = asist.filter((a) => a.estado === 'no_asistio')
  const visitantes = asist.filter((a) => a.estado === 'visitante' || a.estado === 'primera_vez')

  // Implicit absents: group members with no attendance record at all
  type PersonaBasic = Pick<Persona, 'id' | 'nombres' | 'apellidos' | 'tipo_persona'>
  let implicitAbsentes: PersonaBasic[] = []

  if (grupoContexto && memberIdsForFilter && memberIdsForFilter.length > 0) {
    const recordedIds = new Set(
      asist.filter((a) => a.persona_id && !a.es_visitante).map((a) => a.persona_id!)
    )
    const unrecorded = memberIdsForFilter.filter((id) => !recordedIds.has(id))
    if (unrecorded.length > 0) {
      const { data: mp } = await supabase
        .from('personas')
        .select('id, nombres, apellidos, tipo_persona')
        .in('id', unrecorded)
      implicitAbsentes = (mp ?? []) as PersonaBasic[]
    }
  }

  // Total = group members count (event group or filtered group)
  // For global events with no group context → count all unique active members across all groups
  let totalMiembros = asist.length
  if (grupoContexto) {
    const memberCount = memberIdsForFilter?.length ?? 0
    if (memberCount > 0) totalMiembros = memberCount
  } else if (ev.grupo_id === null) {
    const { data: allMembers } = await supabase
      .from('grupo_miembros')
      .select('persona_id')
      .eq('activo', true)
    const uniqueIds = new Set((allMembers ?? []).map((m) => m.persona_id as string))
    if (uniqueIds.size > 0) totalMiembros = uniqueIds.size
  }

  const totalAusentes = noAsistio.length + implicitAbsentes.length
  const pct = totalMiembros > 0 ? Math.round((asistio.length / totalMiembros) * 100) : 0

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/eventos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{ev.nombre}</h1>
            <Badge
              variant={
                ev.estado === 'realizado'
                  ? 'realizado'
                  : ev.estado === 'cancelado'
                  ? 'cancelado'
                  : 'programado'
              }
            >
              {ESTADO_EVENTO_LABELS[ev.estado] ?? ev.estado}
            </Badge>
            {ev.grupo && (
              <Badge variant="secondary">{ev.grupo.nombre}</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDateLong(ev.fecha)}
            {ev.hora_inicio && (
              <> · {ev.hora_inicio.slice(0, 5)}{ev.hora_fin ? ` – ${ev.hora_fin.slice(0, 5)}` : ''}</>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/asistencias/${ev.id}`}>
            <ClipboardCheck size={16} />
            Tomar asistencia
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/eventos/${ev.id}/editar`}>
            <Pencil size={15} />
            Editar
          </Link>
        </Button>
        {ev.estado !== 'cancelado' && (
          <EventoCancelarButton eventoId={ev.id} canCancel={canCancel} />
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InfoCard
          icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
          label="Fecha"
          value={formatDate(ev.fecha)}
        />
        <InfoCard
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          label="Hora"
          value={
            ev.hora_inicio
              ? `${ev.hora_inicio.slice(0, 5)}${ev.hora_fin ? ` – ${ev.hora_fin.slice(0, 5)}` : ''}`
              : '—'
          }
        />
        <InfoCard
          icon={<Users className="h-4 w-4 text-blue-600" />}
          label="Grupo"
          value={ev.grupo?.nombre ?? 'General'}
        />
        <InfoCard
          icon={<ClipboardCheck className="h-4 w-4 text-blue-600" />}
          label={ev.grupo_id ? 'Miembros' : 'Registros'}
          value={String(totalMiembros)}
        />
      </div>

      {/* Description */}
      {ev.descripcion && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500 mb-1">Descripción</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ev.descripcion}</p>
          </CardContent>
        </Card>
      )}

      {/* Attendance summary */}
      {asist.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Resumen de asistencia</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox
                icon={<UserCheck className="h-5 w-5 text-green-600" />}
                label="Asistieron"
                value={asistio.length}
                color="text-green-700"
              />
              <StatBox
                icon={<UserX className="h-5 w-5 text-red-400" />}
                label="No asistieron"
                value={totalAusentes}
                color="text-red-600"
              />
              <StatBox
                icon={<Star className="h-5 w-5 text-yellow-500" />}
                label="Visitantes"
                value={visitantes.length}
                color="text-yellow-600"
              />
              <StatBox
                icon={<Users className="h-5 w-5 text-blue-500" />}
                label="% asistencia"
                value={`${pct}%`}
                color="text-blue-700"
              />
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{asistio.length} de {totalMiembros} {ev.grupo_id ? 'miembros' : 'registros'} asistieron</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance sections */}
      {(asist.length > 0 || implicitAbsentes.length > 0) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── Asistieron ── */}
          {asistio.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="px-5 py-3 border-b border-green-100 bg-green-50 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <h2 className="font-semibold text-green-800">
                    Asistieron <span className="font-normal text-green-600">({asistio.length})</span>
                  </h2>
                </div>
                <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {asistio.map((a) => {
                    const p = a.persona
                    const nombre = p ? `${p.nombres} ${p.apellidos}` : (a.nombre_visitante ?? 'Persona')
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-5 py-3 bg-green-50/30">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-green-100 text-green-700">
                            {p ? getInitials(p.nombres, p.apellidos) : nombre.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{nombre}</p>
                          {p && <p className="text-xs text-gray-400 capitalize">{p.tipo_persona}</p>}
                        </div>
                        <Badge variant="success">Asistió</Badge>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* ── No asistieron ── */}
          {(noAsistio.length > 0 || implicitAbsentes.length > 0) && (
            <Card>
              <CardContent className="p-0">
                <div className="px-5 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
                  <UserX className="h-4 w-4 text-red-500" />
                  <h2 className="font-semibold text-red-700">
                    No asistieron <span className="font-normal text-red-500">({totalAusentes})</span>
                  </h2>
                </div>
                <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {noAsistio.map((a) => {
                    const p = a.persona
                    const nombre = p ? `${p.nombres} ${p.apellidos}` : (a.nombre_visitante ?? 'Persona')
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-red-100 text-red-600">
                            {p ? getInitials(p.nombres, p.apellidos) : nombre.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{nombre}</p>
                          {p && <p className="text-xs text-gray-400 capitalize">{p.tipo_persona}</p>}
                        </div>
                        <Badge variant="danger">Ausente</Badge>
                      </li>
                    )
                  })}
                  {implicitAbsentes.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-gray-100 text-gray-500">
                          {getInitials(p.nombres, p.apellidos)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{p.nombres} {p.apellidos}</p>
                        <p className="text-xs text-gray-400 capitalize">{p.tipo_persona}</p>
                      </div>
                      <Badge variant="secondary">Sin registrar</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          </div>

          {/* ── Visitantes / Primera vez ── */}
          {visitantes.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="px-5 py-3 border-b border-yellow-100 bg-yellow-50 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <h2 className="font-semibold text-yellow-800">
                    Visitantes <span className="font-normal text-yellow-600">({visitantes.length})</span>
                  </h2>
                </div>
                <ul className="divide-y divide-gray-100">
                  {visitantes.map((a) => {
                    const nombre = a.nombre_visitante ?? (a.persona ? `${a.persona.nombres} ${a.persona.apellidos}` : 'Visitante')
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-yellow-100 text-yellow-700">
                            {nombre.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{nombre}</p>
                          {a.telefono_visitante && (
                            <p className="text-xs text-gray-500">{a.telefono_visitante}</p>
                          )}
                        </div>
                        <Badge variant={a.estado === 'primera_vez' ? 'warning' : 'visitante'}>
                          {a.estado === 'primera_vez' ? 'Primera vez' : 'Visitante'}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {asist.length === 0 && (
        <div className="py-12 text-center text-gray-400">
          <ClipboardCheck className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>No hay registros de asistencia para este evento</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href={`/asistencias/${ev.id}`}>Tomar asistencia ahora</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
