import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateLong, getInitials } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft, MapPin, StickyNote, CalendarDays, Users, ClipboardCheck,
  UserCheck, MessageSquare, Heart, Clock, Pencil,
} from 'lucide-react'
import { SeguimientoSection } from './seguimiento-section'
import { EstadoChange } from './estado-change'
import type { EvangelismoSeguimiento, PersonaEstadoHistorial } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

function resolveOne<T>(v: unknown): T | null {
  if (v == null) return null
  return (Array.isArray(v) ? v[0] : v) as T ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('evangelismos')
    .select('persona:personas!persona_id(nombres, apellidos)')
    .eq('id', id)
    .maybeSingle()
  const p = resolveOne<{ nombres: string; apellidos: string }>(data?.persona)
  return { title: p ? `${p.nombres} ${p.apellidos} — Evangelismo` : 'Evangelismo' }
}

export default async function EvangelismoDetallePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // ── 1. Evangelismo principal ──────────────────────────────────────────────────
  const { data: ev } = await supabase
    .from('evangelismos')
    .select(`
      id, fecha_evangelismo, lugar, notas, created_at, updated_at,
      persona:personas!persona_id(
        id, nombres, apellidos, foto_url, telefono, correo,
        tipo_persona, estado_persona_id,
        estado_persona:estado_persona_id(id, nombre, color)
      ),
      evangelizador:personas!evangelizador_id(id, nombres, apellidos),
      encargado:personas!encargado_id(id, nombres, apellidos)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!ev) notFound()

  type PersonaFull = {
    id: string; nombres: string; apellidos: string; foto_url: string | null
    telefono: string | null; correo: string | null; tipo_persona: string
    estado_persona_id: string | null
    estado_persona: unknown
  }
  type PersonaMin = { id: string; nombres: string; apellidos: string }
  type EstadoSnap = { id: string; nombre: string; color: string }

  const persona      = resolveOne<PersonaFull>(ev.persona)
  const evangelizador = resolveOne<PersonaMin>(ev.evangelizador)
  const encargado    = resolveOne<PersonaMin>(ev.encargado)
  const estadoActual = resolveOne<EstadoSnap>(persona?.estado_persona)

  if (!persona) notFound()

  // ── 2. Seguimientos ───────────────────────────────────────────────────────────
  const { data: seguimientosRaw } = await supabase
    .from('evangelismo_seguimientos')
    .select('*, responsable:personas!responsable_id(id, nombres, apellidos)')
    .eq('evangelismo_id', id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  const seguimientos = (seguimientosRaw ?? []) as (EvangelismoSeguimiento & {
    responsable: unknown
  })[]

  // ── 3. Estado historial ───────────────────────────────────────────────────────
  const { data: historialRaw } = await supabase
    .from('persona_estado_historial')
    .select('*')
    .eq('persona_id', persona.id)
    .order('created_at', { ascending: false })

  const historial = (historialRaw ?? []) as PersonaEstadoHistorial[]

  // ── 4. Grupo actual ────────────────────────────────────────────────────────────
  const { data: grupoMembresiaRaw } = await supabase
    .from('grupo_miembros')
    .select('fecha_ingreso, grupo:grupos(id, nombre)')
    .eq('persona_id', persona.id)
    .eq('activo', true)
    .maybeSingle()

  const grupoActual = grupoMembresiaRaw
    ? {
        fechaIngreso: grupoMembresiaRaw.fecha_ingreso as string,
        grupo: resolveOne<{ id: string; nombre: string }>(grupoMembresiaRaw.grupo),
      }
    : null

  // ── 5. Asistencias ────────────────────────────────────────────────────────────
  const { data: asistenciasRaw } = await supabase
    .from('asistencias')
    .select('id, estado, evento:eventos(id, nombre, fecha)')
    .eq('persona_id', persona.id)
    .eq('estado', 'asistio')
    .order('created_at', { ascending: false })
    .limit(20)

  type AsistSnap = { id: string; estado: string; evento: unknown }
  type EventoSnap = { id: string; nombre: string; fecha: string }
  const asistencias = (asistenciasRaw ?? []) as AsistSnap[]
  const totalAsistencias = asistencias.length
  const lastAsistencia = resolveOne<EventoSnap>(asistencias[0]?.evento)

  // ── 6. Estados evangelísticos disponibles ────────────────────────────────────
  const { data: estadosEv } = await supabase
    .from('estados_persona')
    .select('id, nombre, color')
    .in('nombre', ['Evangelizada', 'En seguimiento', 'Consolidada', 'Integrada'])
    .eq('activo', true)
    .order('orden')

  // ── 7. Días desde evangelismo ─────────────────────────────────────────────────
  const fechaEv  = new Date(ev.fecha_evangelismo)
  const diasDesde = Math.floor((Date.now() - fechaEv.getTime()) / (1000 * 60 * 60 * 24))

  // ── 8. Sugerencia de consolidación (3+ asistencias) ──────────────────────────
  const estadoNombreLower = estadoActual?.nombre?.toLowerCase() ?? ''
  const sugerirConsolidar = totalAsistencias >= 3 &&
    ['evangelizada', 'en seguimiento'].includes(estadoNombreLower)

  // ── Build timeline ─────────────────────────────────────────────────────────────
  type TimelineItem = {
    id: string; date: string; type: string
    title: string; subtitle?: string; color: string
  }

  const timeline: TimelineItem[] = []

  // Evento fundacional
  timeline.push({
    id: 'ev-origen',
    date: ev.fecha_evangelismo,
    type: 'evangelismo',
    title: 'Evangelismo registrado',
    subtitle: [
      evangelizador ? `Por ${evangelizador.nombres} ${evangelizador.apellidos}` : null,
      ev.lugar ? `en ${ev.lugar}` : null,
    ].filter(Boolean).join(' · ') || undefined,
    color: '#f59e0b',
  })

  // Cambios de estado
  for (const h of historial) {
    timeline.push({
      id: h.id,
      date: h.created_at.split('T')[0],
      type: 'estado',
      title: `Estado: ${h.estado_nombre ?? '—'}`,
      subtitle: h.notas ?? undefined,
      color: '#3b82f6',
    })
  }

  // Seguimientos en timeline
  for (const s of seguimientos) {
    const resp = resolveOne<PersonaMin>(s.responsable)
    timeline.push({
      id: s.id,
      date: s.fecha,
      type: 'seguimiento',
      title: `Seguimiento — ${TIPO_LABELS[s.tipo] ?? s.tipo}`,
      subtitle: [
        RESULTADO_LABELS[s.resultado ?? ''] ?? s.resultado,
        resp ? `por ${resp.nombres} ${resp.apellidos}` : null,
        s.descripcion,
      ].filter(Boolean).join(' · ') || undefined,
      color: '#8b5cf6',
    })
  }

  // Ingreso a grupo
  if (grupoActual?.grupo) {
    timeline.push({
      id: 'grupo-ingreso',
      date: grupoActual.fechaIngreso,
      type: 'grupo',
      title: `Ingresó al grupo: ${grupoActual.grupo.nombre}`,
      color: '#10b981',
    })
  }

  // Últimas asistencias (máx 5)
  for (const a of asistencias.slice(0, 5)) {
    const evento = resolveOne<EventoSnap>(a.evento)
    if (!evento) continue
    timeline.push({
      id: `asist-${a.id}`,
      date: evento.fecha,
      type: 'asistencia',
      title: `Asistió: ${evento.nombre}`,
      color: '#6b7280',
    })
  }

  // Ordenar por fecha descendente
  timeline.sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/evangelismo" className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} />
            Evangelismo
          </Link>
        </Button>
      </div>

      {/* Persona header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          {persona.foto_url && <AvatarImage src={persona.foto_url} />}
          <AvatarFallback className="text-lg bg-rose-100 text-rose-700">
            {getInitials(persona.nombres, persona.apellidos)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {persona.nombres} {persona.apellidos}
            </h1>
            {estadoActual && (
              <span
                className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: estadoActual.color + '22', color: estadoActual.color }}
              >
                {estadoActual.nombre}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Evangelizado el {formatDateLong(ev.fecha_evangelismo)}
            {ev.lugar ? ` · ${ev.lugar}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/personas/${persona.id}`}>
            <Pencil size={13} />
            Ver perfil
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Clock}          label="Días desde evangelismo" value={`${diasDesde}d`}        color="text-orange-600" />
        <StatCard icon={ClipboardCheck} label="Eventos asistidos"      value={totalAsistencias}        color="text-blue-600" />
        <StatCard icon={MessageSquare}  label="Seguimientos"           value={seguimientos.length}     color="text-purple-600" />
        <StatCard icon={Users}          label="Grupo actual"           value={grupoActual?.grupo?.nombre ?? '—'} color="text-green-600" />
      </div>

      {/* Sugerencia consolidar */}
      {sugerirConsolidar && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 flex items-center gap-3">
          <UserCheck size={18} className="text-purple-600 shrink-0" />
          <p className="text-sm text-purple-800">
            Esta persona ha asistido a {totalAsistencias} eventos. Considera cambiar su estado a <strong>Consolidada</strong>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col izquierda: Info + Estado */}
        <div className="space-y-5 lg:col-span-1">
          {/* Información */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={<Heart size={14} className="text-rose-400" />}
                label="Evangelizador"
                value={evangelizador ? `${evangelizador.nombres} ${evangelizador.apellidos}` : '—'} />
              <InfoRow icon={<UserCheck size={14} className="text-blue-400" />}
                label="Encargado"
                value={encargado ? `${encargado.nombres} ${encargado.apellidos}` : '—'} />
              {ev.lugar && (
                <InfoRow icon={<MapPin size={14} className="text-gray-400" />}
                  label="Lugar" value={ev.lugar} />
              )}
              <InfoRow icon={<CalendarDays size={14} className="text-gray-400" />}
                label="Fecha" value={formatDate(ev.fecha_evangelismo)} />
              {persona.correo && (
                <InfoRow icon={<MessageSquare size={14} className="text-gray-400" />}
                  label="Correo" value={persona.correo} />
              )}
              {persona.telefono && (
                <InfoRow icon={<MessageSquare size={14} className="text-gray-400" />}
                  label="Teléfono" value={persona.telefono} />
              )}
              {ev.notas && (
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <StickyNote size={12} /> Notas
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap text-xs">{ev.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cambiar estado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estado evangelístico</CardTitle>
            </CardHeader>
            <CardContent>
              <EstadoChange
                personaId={persona.id}
                evangelismoId={id}
                currentEstadoId={persona.estado_persona_id}
                estados={(estadosEv ?? []) as { id: string; nombre: string; color: string }[]}
              />
            </CardContent>
          </Card>

          {/* Último evento asistido */}
          {lastAsistencia && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Último evento asistido</p>
                <p className="text-sm font-semibold text-gray-900">{lastAsistencia.nombre}</p>
                <p className="text-xs text-gray-400">{formatDate(lastAsistencia.fecha)}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Col derecha: Timeline + Seguimientos */}
        <div className="space-y-5 lg:col-span-2">
          {/* Seguimientos */}
          <SeguimientoSection
            evangelismoId={id}
            personaId={persona.id}
            initialSeguimientos={seguimientos.map(s => ({
              ...s,
              responsable: resolveOne<{ id: string; nombres: string; apellidos: string }>(s.responsable),
            }))}
          />

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial completo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {timeline.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin historial aún.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {timeline.map(item => (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                      <div
                        className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2"
                        style={{ borderColor: item.color, backgroundColor: item.color + '33' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {formatDate(item.date)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        <Icon size={14} />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-gray-800">{value}</p>
      </div>
    </div>
  )
}

const TIPO_LABELS: Record<string, string> = {
  contacto: 'Contacto', visita: 'Visita', reunion: 'Reunión',
  oracion: 'Oración', otro: 'Otro',
}
const RESULTADO_LABELS: Record<string, string> = {
  positivo: 'Positivo', neutral: 'Neutral',
  pendiente: 'Pendiente', sin_respuesta: 'Sin respuesta',
}
