import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  formatDate,
  formatDateLong,
  calcularEdad,
  getInitials,
  TIPO_PERSONA_LABELS,
  ESTADO_ASISTENCIA_LABELS,
} from '@/lib/utils'
import type { Persona, GrupoMiembro, PersonaMinisterio, Asistencia } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Phone, Mail, MapPin, Calendar, User, ArrowLeft } from 'lucide-react'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('personas')
    .select('nombres, apellidos')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  return {
    title: data ? `${data.nombres} ${data.apellidos}` : 'Persona',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Main persona
  const { data: persona } = await supabase
    .from('personas')
    .select(`
      *,
      estado_persona:estado_persona_id(id, nombre, color),
      lider:lider_id(id, nombres, apellidos)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!persona) notFound()

  // Parallel: grupos, ministerios, asistencias
  const [
    { data: grupoMiembros },
    { data: ministerios },
    { data: asistencias },
  ] = await Promise.all([
    supabase
      .from('grupo_miembros')
      .select('id, fecha_ingreso, fecha_salida, activo, grupo:grupo_id(id, nombre, dia_reunion, hora_reunion)')
      .eq('persona_id', id)
      .order('activo', { ascending: false })
      .order('fecha_ingreso', { ascending: false }),
    supabase
      .from('persona_ministerios')
      .select('id, fecha_ingreso, fecha_salida, activo, ministerio:ministerio_id(id, nombre)')
      .eq('persona_id', id)
      .order('activo', { ascending: false }),
    supabase
      .from('asistencias')
      .select('id, estado, created_at, evento:evento_id(id, nombre, fecha)')
      .eq('persona_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const p = persona as Persona & {
    estado_persona: { id: string; nombre: string; color: string | null } | null
    lider: { id: string; nombres: string; apellidos: string } | null
  }

  const initials = getInitials(p.nombres, p.apellidos)
  const edad = calcularEdad(p.fecha_nacimiento)
  const estadoNombre = p.estado_persona?.nombre ?? ''
  const estadoVariant = estadoNombre.toLowerCase().includes('activ')
    ? 'success'
    : estadoNombre.toLowerCase().includes('inactiv')
    ? 'inactivo'
    : 'secondary'

  const grupoActual = (grupoMiembros as GrupoMiembro[] | null)?.find((g) => g.activo)
  const historialGrupos = (grupoMiembros as GrupoMiembro[] | null)?.filter((g) => !g.activo) ?? []

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <Link href="/personas" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={15} />
        Volver a personas
      </Link>

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-800 text-white text-2xl font-bold">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {p.nombres} {p.apellidos}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {p.estado_persona && (
                <Badge variant={estadoVariant as never}>{p.estado_persona.nombre}</Badge>
              )}
              <Badge variant="secondary">
                {TIPO_PERSONA_LABELS[p.tipo_persona] ?? p.tipo_persona}
              </Badge>
              {edad !== null && (
                <span className="text-sm text-gray-500">{edad} años</span>
              )}
            </div>
          </div>

          {/* Action */}
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/personas/${id}/editar`}>
              <Pencil size={14} />
              Editar
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="informacion">
        <TabsList>
          <TabsTrigger value="informacion">Información</TabsTrigger>
          <TabsTrigger value="grupo">Grupo</TabsTrigger>
          <TabsTrigger value="ministerios">Ministerios</TabsTrigger>
          <TabsTrigger value="asistencias">Asistencias</TabsTrigger>
        </TabsList>

        {/* ── Tab: Información ──────────────────────────────────────────────── */}
        <TabsContent value="informacion">
          <Card>
            <CardHeader>
              <CardTitle>Datos personales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <InfoRow icon={<Phone size={15} />} label="Teléfono" value={p.telefono} />
              <InfoRow icon={<Mail size={15} />} label="Correo" value={p.correo} />
              <InfoRow
                icon={<Calendar size={15} />}
                label="Fecha de nacimiento"
                value={p.fecha_nacimiento ? formatDateLong(p.fecha_nacimiento) : null}
              />
              <InfoRow
                icon={<Calendar size={15} />}
                label="Fecha de registro"
                value={formatDateLong(p.fecha_registro)}
              />
              <InfoRow
                icon={<MapPin size={15} />}
                label="Dirección"
                value={p.direccion}
                className="sm:col-span-2"
              />
              <InfoRow
                icon={<User size={15} />}
                label="Líder"
                value={p.lider ? `${p.lider.nombres} ${p.lider.apellidos}` : null}
              />
              {p.observaciones && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Observaciones
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{p.observaciones}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Grupo ────────────────────────────────────────────────────── */}
        <TabsContent value="grupo">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Grupo actual</CardTitle>
              </CardHeader>
              <CardContent>
                {grupoActual ? (
                  <GrupoRow item={grupoActual} />
                ) : (
                  <p className="text-sm text-gray-400">No pertenece a ningún grupo actualmente.</p>
                )}
              </CardContent>
            </Card>

            {historialGrupos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Historial de grupos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {historialGrupos.map((g) => (
                    <GrupoRow key={g.id} item={g} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Ministerios ──────────────────────────────────────────────── */}
        <TabsContent value="ministerios">
          <Card>
            <CardHeader>
              <CardTitle>Ministerios</CardTitle>
            </CardHeader>
            <CardContent>
              {!ministerios || ministerios.length === 0 ? (
                <p className="text-sm text-gray-400">No participa en ningún ministerio.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(ministerios as unknown as PersonaMinisterio[]).map((m) => {
                    const min = (m as unknown as { ministerio: { id: string; nombre: string }[] }).ministerio?.[0] ?? null
                    return (
                      <li key={m.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{min?.nombre ?? '—'}</p>
                          <p className="text-xs text-gray-500">
                            Desde {formatDate(m.fecha_ingreso)}
                            {m.fecha_salida ? ` · Hasta ${formatDate(m.fecha_salida)}` : ''}
                          </p>
                        </div>
                        <Badge variant={m.activo ? 'success' : 'secondary'}>
                          {m.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Asistencias ──────────────────────────────────────────────── */}
        <TabsContent value="asistencias">
          <Card>
            <CardHeader>
              <CardTitle>Últimas asistencias</CardTitle>
            </CardHeader>
            <CardContent>
              {!asistencias || asistencias.length === 0 ? (
                <p className="text-sm text-gray-400">Sin registros de asistencia.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(asistencias as unknown as Asistencia[]).map((a) => {
                    const aRaw = a as unknown as { evento?: { id: string; nombre: string; fecha: string }[] }
                    const ev = aRaw.evento?.[0] ?? null
                    const estadoLabel = ESTADO_ASISTENCIA_LABELS[a.estado] ?? a.estado
                    const estadoV =
                      a.estado === 'asistio'
                        ? 'success'
                        : a.estado === 'no_asistio'
                        ? 'danger'
                        : a.estado === 'primera_vez'
                        ? 'info'
                        : 'visitante'
                    return (
                      <li key={a.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ev?.nombre ?? '—'}</p>
                          <p className="text-xs text-gray-500">{ev ? formatDate(ev.fecha) : '—'}</p>
                        </div>
                        <Badge variant={estadoV as never}>{estadoLabel}</Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="flex items-center gap-2 text-sm text-gray-900">
        <span className="text-gray-400">{icon}</span>
        <span>{value ?? <span className="text-gray-400">—</span>}</span>
      </div>
    </div>
  )
}

function GrupoRow({ item }: { item: GrupoMiembro }) {
  const grupo = item.grupo as { id: string; nombre: string; dia_reunion: string | null; hora_reunion: string | null } | null
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{grupo?.nombre ?? '—'}</p>
        <p className="text-xs text-gray-500">
          Ingreso: {formatDate(item.fecha_ingreso)}
          {item.fecha_salida ? ` · Salida: ${formatDate(item.fecha_salida)}` : ''}
        </p>
        {grupo?.dia_reunion && (
          <p className="text-xs text-gray-400 capitalize">
            {grupo.dia_reunion}{grupo.hora_reunion ? ` · ${grupo.hora_reunion.slice(0, 5)}` : ''}
          </p>
        )}
      </div>
      <Badge variant={item.activo ? 'success' : 'secondary'}>
        {item.activo ? 'Activo' : 'Inactivo'}
      </Badge>
    </div>
  )
}
