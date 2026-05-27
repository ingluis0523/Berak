import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { formatDate, getInitials } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, TrendingUp, Users, UserCheck, BarChart2, Plus } from 'lucide-react'
import { EvangelismoFilters } from './evangelismo-filters'

export const metadata: Metadata = { title: 'Evangelismo' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ estado?: string; q?: string }>
}

function resolveOne<T>(v: unknown): T | null {
  if (v == null) return null
  return (Array.isArray(v) ? v[0] : v) as T ?? null
}

export default async function EvangelismoPage({ searchParams }: PageProps) {
  const { estado, q } = await searchParams
  const [supabase, currentUser] = await Promise.all([createClient(), getCurrentUser()])

  // Scoping: non-admin users only see evangelismos from their red
  let personaIdsScope: string[] | null = null
  if (currentUser && !currentUser.is_admin && !currentUser.hasPermission('acceso_todas_redes') && currentUser.red_id) {
    const { data: gruposEnRed } = await supabase
      .from('grupos')
      .select('id')
      .eq('red_id', currentUser.red_id)
      .is('deleted_at', null)
    const grupoIds = (gruposEnRed ?? []).map((g) => g.id)
    if (grupoIds.length > 0) {
      const { data: miembros } = await supabase
        .from('grupo_miembros')
        .select('persona_id')
        .in('grupo_id', grupoIds)
        .eq('activo', true)
      personaIdsScope = [...new Set((miembros ?? []).map((m) => m.persona_id as string))]
    } else {
      personaIdsScope = []
    }
  }

  let query = supabase
    .from('evangelismos')
    .select(`
      id, fecha_evangelismo, lugar, updated_at,
      persona:personas!persona_id(
        id, nombres, apellidos, foto_url,
        estado_persona:estado_persona_id(nombre, color)
      ),
      evangelizador:personas!evangelizador_id(id, nombres, apellidos),
      encargado:personas!encargado_id(id, nombres, apellidos),
      seguimientos:evangelismo_seguimientos(id, fecha, resultado)
    `)
    .is('deleted_at', null)
    .order('fecha_evangelismo', { ascending: false })

  if (personaIdsScope !== null) {
    if (personaIdsScope.length === 0) query = query.in('persona_id', ['00000000-0000-0000-0000-000000000000'])
    else query = query.in('persona_id', personaIdsScope)
  }

  const { data: rawRows } = await query

  type PersonaSnap = {
    id: string; nombres: string; apellidos: string; foto_url: string | null
    estado_persona: unknown
  }
  type PersonaMin  = { id: string; nombres: string; apellidos: string }
  type SegSnap     = { id: string; fecha: string; resultado: string | null }
  type Row = {
    id: string; fecha_evangelismo: string; lugar: string | null
    persona: unknown; evangelizador: unknown; encargado: unknown
    seguimientos: SegSnap[] | null
  }

  const rows = (rawRows ?? []) as Row[]

  // ── Client-side filter via URL params ────────────────────────────────────────
  const estadoLower = estado?.toLowerCase()
  const qLower      = q?.toLowerCase()

  const filtered = rows.filter(ev => {
    const p = resolveOne<PersonaSnap>(ev.persona)
    if (qLower) {
      const nombre = `${p?.nombres ?? ''} ${p?.apellidos ?? ''}`.toLowerCase()
      if (!nombre.includes(qLower)) return false
    }
    if (estadoLower && estadoLower !== 'todos') {
      const ep = resolveOne<{ nombre: string; color: string }>(p?.estado_persona)
      if (!ep || ep.nombre.toLowerCase() !== estadoLower) return false
    }
    return true
  })

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const getEstadoNombre = (row: Row): string => {
    const p  = resolveOne<PersonaSnap>(row.persona)
    const ep = resolveOne<{ nombre: string }>(p?.estado_persona)
    return ep?.nombre?.toLowerCase() ?? ''
  }

  const kpis = {
    total:       rows.length,
    seguimiento: rows.filter(r => getEstadoNombre(r) === 'en seguimiento').length,
    consolidados:rows.filter(r => getEstadoNombre(r) === 'consolidada').length,
    integrados:  rows.filter(r => getEstadoNombre(r) === 'integrada').length,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evangelismo"
        description="Seguimiento de personas evangelizadas"
        breadcrumbs={[{ label: 'Evangelismo' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/evangelismo/estadisticas">
                <BarChart2 size={15} />
                Estadísticas
              </Link>
            </Button>
            <Button asChild>
              <Link href="/evangelismo/nuevo">
                <Plus size={15} />
                Registrar
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={Heart}      label="Total evangelizados" value={kpis.total}        bg="bg-rose-50"   color="text-rose-700" />
        <KpiCard icon={Users}      label="En seguimiento"      value={kpis.seguimiento}  bg="bg-blue-50"   color="text-blue-700" />
        <KpiCard icon={TrendingUp} label="Consolidados"        value={kpis.consolidados} bg="bg-purple-50" color="text-purple-700" />
        <KpiCard icon={UserCheck}  label="Integrados"          value={kpis.integrados}   bg="bg-green-50"  color="text-green-700" />
      </div>

      <EvangelismoFilters currentEstado={estado} currentQ={q} totalFiltrado={filtered.length} />

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">
              {q || (estadoLower && estadoLower !== 'todos')
                ? 'Sin resultados para el filtro aplicado.'
                : 'Aún no hay registros de evangelismo.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Evangelizador</TableHead>
                  <TableHead className="hidden lg:table-cell">Encargado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Seguims.</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(ev => {
                  const p          = resolveOne<PersonaSnap>(ev.persona)
                  const ev_izador  = resolveOne<PersonaMin>(ev.evangelizador)
                  const encargado  = resolveOne<PersonaMin>(ev.encargado)
                  const estadoP    = resolveOne<{ nombre: string; color: string }>(p?.estado_persona)
                  const segs       = ev.seguimientos ?? []
                  const lastSeg    = [...segs].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]

                  return (
                    <TableRow key={ev.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            {p?.foto_url && <AvatarImage src={p.foto_url} />}
                            <AvatarFallback className="text-xs bg-rose-100 text-rose-700">
                              {p ? getInitials(p.nombres, p.apellidos) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <Link href={`/evangelismo/${ev.id}`} className="font-medium text-sm text-gray-900 hover:text-blue-700">
                            {p ? `${p.nombres} ${p.apellidos}` : '—'}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {estadoP ? (
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: estadoP.color + '22', color: estadoP.color }}
                          >
                            {estadoP.nombre}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {ev_izador
                          ? `${ev_izador.nombres} ${ev_izador.apellidos}`
                          : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-600">
                        {encargado
                          ? `${encargado.nombres} ${encargado.apellidos}`
                          : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(ev.fecha_evangelismo)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-semibold text-gray-700">{segs.length}</span>
                          {lastSeg && (
                            <span className="text-xs text-gray-400">{formatDate(lastSeg.fecha)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/evangelismo/${ev.id}`}>Ver →</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, bg, color }: {
  icon: React.ElementType; label: string; value: number; bg: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${bg} ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}
