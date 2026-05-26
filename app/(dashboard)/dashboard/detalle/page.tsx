import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Detalle Dashboard' }

const TIPO_LABELS: Record<string, string> = {
  total_personas: 'Total de Personas',
  nuevos_mes: 'Nuevos del Mes',
  grupos_activos: 'Grupos Activos',
  eventos_semana: 'Eventos Esta Semana',
  inactivos: 'Personas Inactivas',
}

interface PageProps {
  searchParams: Promise<{ tipo?: string }>
}

export default async function DashboardDetallePage({ searchParams }: PageProps) {
  const { tipo } = await searchParams

  if (!tipo || !TIPO_LABELS[tipo]) notFound()

  const supabase = await createClient()
  const title = TIPO_LABELS[tipo]

  // ── Grupos activos ────────────────────────────────────────────────────────
  if (tipo === 'grupos_activos') {
    const { data: grupos } = await supabase
      .from('grupos')
      .select(`
        id, nombre, estado, capacidad_maxima,
        lider:personas!lider_id(id, nombres, apellidos),
        red:redes(id, nombre)
      `)
      .eq('estado', true)
      .is('deleted_at', null)
      .order('nombre')

    const grupoIds = (grupos ?? []).map((g) => g.id)
    const memberCountMap: Record<string, number> = {}

    if (grupoIds.length > 0) {
      const { data: counts } = await supabase
        .from('grupo_miembros')
        .select('grupo_id')
        .in('grupo_id', grupoIds)
        .eq('activo', true)

      counts?.forEach((m) => {
        memberCountMap[m.grupo_id] = (memberCountMap[m.grupo_id] ?? 0) + 1
      })
    }

    return (
      <DetalleLayout title={title} count={grupos?.length ?? 0}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Red</TableHead>
              <TableHead className="hidden sm:table-cell">Líder</TableHead>
              <TableHead className="text-center">Miembros</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Capacidad</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(grupos ?? []).map((g) => {
              const lider = Array.isArray(g.lider) ? g.lider[0] : g.lider as { id: string; nombres: string; apellidos: string } | null
              const red = Array.isArray(g.red) ? g.red[0] : g.red as { id: string; nombre: string } | null
              return (
                <TableRow key={g.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    <Link href={`/grupos/${g.id}`} className="hover:text-blue-700">
                      {g.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {red ? (
                      <Link href={`/redes/${red.id}`} className="text-sm text-blue-600 hover:underline">
                        {red.nombre}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                    {lider ? `${lider.nombres} ${lider.apellidos}` : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-blue-700">
                    {memberCountMap[g.id] ?? 0}
                  </TableCell>
                  <TableCell className="text-center text-gray-500 hidden sm:table-cell text-sm">
                    {g.capacidad_maxima ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/grupos/${g.id}`}>Ver →</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </DetalleLayout>
    )
  }

  // ── Eventos esta semana ───────────────────────────────────────────────────
  if (tipo === 'eventos_semana') {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const { data: eventos } = await supabase
      .from('eventos')
      .select('id, nombre, fecha, hora_inicio, estado, grupo:grupos(id, nombre)')
      .gte('fecha', startOfWeek.toISOString().split('T')[0])
      .lte('fecha', endOfWeek.toISOString().split('T')[0])
      .order('fecha', { ascending: true })

    return (
      <DetalleLayout title={title} count={eventos?.length ?? 0}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="hidden sm:table-cell">Hora</TableHead>
              <TableHead className="hidden md:table-cell">Grupo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(eventos ?? []).map((ev) => {
              const grupo = Array.isArray(ev.grupo) ? ev.grupo[0] : ev.grupo as { id: string; nombre: string } | null
              return (
                <TableRow key={ev.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    <Link href={`/eventos/${ev.id}`} className="hover:text-blue-700">
                      {ev.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">{formatDate(ev.fecha)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-500 text-sm">
                    {ev.hora_inicio ? ev.hora_inicio.slice(0, 5) : '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {grupo ? (
                      <Badge variant="secondary">{grupo.nombre}</Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">Global</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ev.estado === 'realizado'
                          ? 'realizado'
                          : ev.estado === 'cancelado'
                          ? 'cancelado'
                          : 'programado'
                      }
                    >
                      {ev.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/eventos/${ev.id}`}>Ver →</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </DetalleLayout>
    )
  }

  // ── Personas views (total_personas, nuevos_mes, inactivos) ────────────────
  const supabase2 = supabase

  // Step 1: resolve estado IDs when needed
  let estadoFilterId: string | null = null
  if (tipo === 'nuevos_mes' || tipo === 'inactivos') {
    const pattern = tipo === 'nuevos_mes' ? 'nuevo' : '%inactiv%'
    const { data: estadoRow } = await supabase2
      .from('estados_persona')
      .select('id')
      .ilike('nombre', pattern)
      .limit(1)
      .maybeSingle()
    estadoFilterId = estadoRow?.id ?? null
  }

  // Step 2: build personas query
  let personasQuery = supabase2
    .from('personas')
    .select('id, nombres, apellidos, tipo_persona, fecha_registro, estado_persona:estado_persona_id(id, nombre, color)')
    .is('deleted_at', null)
    .order('nombres')

  if (tipo === 'nuevos_mes') {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    personasQuery = personasQuery.gte('fecha_registro', startOfMonth)
    if (estadoFilterId) personasQuery = personasQuery.eq('estado_persona_id', estadoFilterId)
  } else if (tipo === 'inactivos') {
    if (estadoFilterId) personasQuery = personasQuery.eq('estado_persona_id', estadoFilterId)
  }

  const { data: personas } = await personasQuery

  // Step 3: fetch memberships for persona IDs
  const personaIds = (personas ?? []).map((p) => p.id)
  const membershipMap: Record<string, { grupoId: string; grupoNombre: string; redNombre?: string; liderNombre?: string }> = {}

  if (personaIds.length > 0) {
    const { data: gm } = await supabase2
      .from('grupo_miembros')
      .select(`
        persona_id,
        grupo:grupos(
          id, nombre,
          red:redes(id, nombre),
          lider:personas!lider_id(id, nombres, apellidos)
        )
      `)
      .in('persona_id', personaIds)
      .eq('activo', true)

    gm?.forEach((m) => {
      const g = Array.isArray(m.grupo) ? m.grupo[0] : m.grupo as {
        id: string; nombre: string;
        red: { id: string; nombre: string } | null | { id: string; nombre: string }[];
        lider: { id: string; nombres: string; apellidos: string } | null | { id: string; nombres: string; apellidos: string }[];
      } | null
      if (!g) return
      const red = Array.isArray(g.red) ? g.red[0] : g.red as { nombre: string } | null
      const lider = Array.isArray(g.lider) ? g.lider[0] : g.lider as { nombres: string; apellidos: string } | null
      membershipMap[m.persona_id] = {
        grupoId: g.id,
        grupoNombre: g.nombre,
        redNombre: red?.nombre,
        liderNombre: lider ? `${lider.nombres} ${lider.apellidos}` : undefined,
      }
    })
  }

  return (
    <DetalleLayout title={title} count={personas?.length ?? 0}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Estado</TableHead>
            <TableHead className="hidden lg:table-cell">Grupo</TableHead>
            <TableHead className="hidden lg:table-cell">Red</TableHead>
            <TableHead className="hidden xl:table-cell">Líder</TableHead>
            <TableHead className="hidden sm:table-cell">Registro</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(personas ?? []).map((p) => {
            const estado = Array.isArray(p.estado_persona) ? p.estado_persona[0] : p.estado_persona as { id: string; nombre: string; color: string } | null
            const memb = membershipMap[p.id]
            return (
              <TableRow key={p.id} className="hover:bg-gray-50">
                <TableCell className="font-medium text-gray-900">
                  <Link href={`/personas/${p.id}`} className="hover:text-blue-700">
                    {p.nombres} {p.apellidos}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-gray-500 capitalize">
                  {p.tipo_persona}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {estado ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: estado.color + '22', color: estado.color }}
                    >
                      {estado.nombre}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {memb ? (
                    <Link href={`/grupos/${memb.grupoId}`} className="text-sm text-blue-600 hover:underline">
                      {memb.grupoNombre}
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                  {memb?.redNombre ?? <span className="text-gray-400 text-xs">—</span>}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-gray-500">
                  {memb?.liderNombre ?? <span className="text-gray-400 text-xs">—</span>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-gray-400">
                  {formatDate(p.fecha_registro)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/personas/${p.id}`}>Ver →</Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </DetalleLayout>
  )
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

function DetalleLayout({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{count} registro{count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {count === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">No hay registros para mostrar.</p>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </div>
  )
}
