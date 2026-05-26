import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, getInitials } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Users, UsersRound, UserPlus, TrendingUp } from 'lucide-react'
import { CrecimientoChart, AsistenciaChart } from './red-charts'
import type { Persona } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('redes').select('nombre').eq('id', id).maybeSingle()
  return { title: `Reporte — ${data?.nombre ?? 'Red'}` }
}

export default async function RedReportePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]

  // ── Phase 1 ───────────────────────────────────────────────────────────────
  const [{ data: red }, { data: grupos }, { data: estadoNuevoRow }, { data: estadoInactivoRow }] =
    await Promise.all([
      supabase
        .from('redes')
        .select('*, lider:personas!lider_id(id, nombres, apellidos)')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle(),
      supabase
        .from('grupos')
        .select('id, nombre, estado, lider:personas!lider_id(id, nombres, apellidos)')
        .eq('red_id', id)
        .is('deleted_at', null)
        .order('nombre'),
      supabase.from('estados_persona').select('id').ilike('nombre', 'nuevo').limit(1).maybeSingle(),
      supabase.from('estados_persona').select('id').ilike('nombre', '%inactiv%').limit(1).maybeSingle(),
    ])

  if (!red) notFound()

  const grupoIds = (grupos ?? []).map((g) => g.id)

  // ── Phase 2 ───────────────────────────────────────────────────────────────
  const [{ data: miembrosRaw }, { data: eventosRaw }] = await Promise.all([
    supabase
      .from('grupo_miembros')
      .select('persona_id, grupo_id, fecha_ingreso, persona:personas(id, nombres, apellidos, tipo_persona, estado_persona_id, fecha_registro)')
      .in('grupo_id', grupoIds.length > 0 ? grupoIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('activo', true),
    grupoIds.length > 0
      ? supabase
          .from('eventos')
          .select('id, nombre, fecha, estado, grupo_id')
          .in('grupo_id', grupoIds)
          .gte('fecha', sixMonthsAgo)
          .lte('fecha', todayStr)
          .eq('estado', 'realizado')
          .order('fecha', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; nombre: string; fecha: string; estado: string; grupo_id: string }[] }),
  ])

  // ── Deduplicate personas (person may be in multiple groups) ───────────────
  type PersonaRow = {
    id: string; nombres: string; apellidos: string; tipo_persona: string
    grupoId: string; grupoNombre: string; fecha_ingreso: string
    estado_persona_id?: string | null; fecha_registro?: string | null
  }

  const seenPersonas = new Set<string>()
  const personas: PersonaRow[] = []
  const memberCountByGrupo: Record<string, number> = {}

  for (const m of miembrosRaw ?? []) {
    const p = (Array.isArray(m.persona) ? m.persona[0] : m.persona) as
      (Pick<Persona, 'id' | 'nombres' | 'apellidos' | 'tipo_persona'> & { estado_persona_id?: string | null; fecha_registro?: string | null }) | null

    memberCountByGrupo[m.grupo_id] = (memberCountByGrupo[m.grupo_id] ?? 0) + 1

    if (p && !seenPersonas.has(p.id)) {
      seenPersonas.add(p.id)
      const grupoObj = (grupos ?? []).find((g) => g.id === m.grupo_id)
      personas.push({
        id: p.id, nombres: p.nombres, apellidos: p.apellidos, tipo_persona: p.tipo_persona,
        grupoId: m.grupo_id, grupoNombre: grupoObj?.nombre ?? '—',
        fecha_ingreso: m.fecha_ingreso,
        estado_persona_id: p.estado_persona_id, fecha_registro: p.fecha_registro,
      })
    }
  }

  // ── KPI computations ──────────────────────────────────────────────────────
  const gruposActivos = (grupos ?? []).filter((g) => g.estado).length
  const nuevosDelMes = estadoNuevoRow?.id
    ? personas.filter((p) => p.estado_persona_id === estadoNuevoRow.id && (p.fecha_registro ?? '') >= startOfMonth).length
    : 0
  const inactivos = estadoInactivoRow?.id
    ? personas.filter((p) => p.estado_persona_id === estadoInactivoRow.id).length
    : 0

  // ── Phase 3: attendance data ───────────────────────────────────────────────
  const eventoIds = (eventosRaw ?? []).map((e) => e.id)
  const personaIds = personas.map((p) => p.id)

  let asistencias: { evento_id: string; persona_id: string }[] = []
  if (eventoIds.length > 0 && personaIds.length > 0) {
    const { data } = await supabase
      .from('asistencias')
      .select('evento_id, persona_id')
      .in('evento_id', eventoIds)
      .in('persona_id', personaIds)
      .eq('estado', 'asistio')
      .eq('es_visitante', false)
    asistencias = data ?? []
  }

  // ── Attendance by grupo ───────────────────────────────────────────────────
  const eventosCountByGrupo: Record<string, number> = {}
  const asistenciasByGrupo: Record<string, number> = {}

  for (const ev of eventosRaw ?? []) {
    eventosCountByGrupo[ev.grupo_id] = (eventosCountByGrupo[ev.grupo_id] ?? 0) + 1
  }

  const eventoGrupoMap: Record<string, string> = {}
  for (const ev of eventosRaw ?? []) eventoGrupoMap[ev.id] = ev.grupo_id

  for (const a of asistencias) {
    const gid = eventoGrupoMap[a.evento_id]
    if (gid) asistenciasByGrupo[gid] = (asistenciasByGrupo[gid] ?? 0) + 1
  }

  // Average attendance % per group = total asistencias / (events × members)
  const gruposConStats = (grupos ?? []).map((g) => {
    const evCount = eventosCountByGrupo[g.id] ?? 0
    const memberCount = memberCountByGrupo[g.id] ?? 0
    const asistTotal = asistenciasByGrupo[g.id] ?? 0
    const maxPossible = evCount * memberCount
    const pct = maxPossible > 0 ? Math.round((asistTotal / maxPossible) * 100) : null
    const lRaw = g.lider as unknown
    const lider = (Array.isArray(lRaw) ? lRaw[0] : lRaw) as Pick<Persona, 'nombres' | 'apellidos'> | null
    return { ...g, evCount, memberCount, asistTotal, pct, liderNombre: lider ? `${lider.nombres} ${lider.apellidos}` : '—' }
  })

  // ── Crecimiento mensual (last 6 months) ───────────────────────────────────
  const crecimientoData: { mes: string; nuevos: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const monthEnd = `${nextD.getFullYear()}-${pad(nextD.getMonth() + 1)}-01`
    const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
    const count = personas.filter((p) => p.fecha_ingreso >= monthStart && p.fecha_ingreso < monthEnd).length
    crecimientoData.push({ mes: label, nuevos: count })
  }

  // ── Asistencia mensual (last 6 months) ────────────────────────────────────
  const asistenciaMensualData: { mes: string; asistencias: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const monthEnd = `${nextD.getFullYear()}-${pad(nextD.getMonth() + 1)}-01`
    const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
    const eventosDelMes = (eventosRaw ?? []).filter((e) => e.fecha >= monthStart && e.fecha < monthEnd).map((e) => e.id)
    const count = asistencias.filter((a) => eventosDelMes.includes(a.evento_id)).length
    asistenciaMensualData.push({ mes: label, asistencias: count })
  }

  // ── Distribución por tipo ─────────────────────────────────────────────────
  const distribucion: Record<string, number> = {}
  for (const p of personas) {
    distribucion[p.tipo_persona] = (distribucion[p.tipo_persona] ?? 0) + 1
  }
  const distribucionOrdenada = Object.entries(distribucion).sort((a, b) => b[1] - a[1])

  // ── Nuevos del mes lista ──────────────────────────────────────────────────
  const nuevosListado = estadoNuevoRow?.id
    ? personas.filter((p) => p.estado_persona_id === estadoNuevoRow.id && (p.fecha_registro ?? '') >= startOfMonth)
    : []

  const liderRaw = red.lider as unknown
  const lider = (Array.isArray(liderRaw) ? liderRaw[0] : liderRaw) as Pick<Persona, 'nombres' | 'apellidos'> | null

  // ── Promedio asistencia general ────────────────────────────────────────────
  const totalEventos = eventoIds.length
  const totalAsistencias = asistencias.length
  const promedioAsist = totalEventos > 0 && personas.length > 0
    ? Math.round((totalAsistencias / (totalEventos * personas.length)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link href={`/redes/${id}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
            <ArrowLeft size={15} />
            Volver a la red
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte — {red.nombre}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {lider ? `Liderado por ${lider.nombres} ${lider.apellidos}` : 'Sin líder asignado'}
              {' · '}Generado {formatDate(todayStr)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} />} label="Total personas" value={personas.length} iconBg="bg-blue-50" iconColor="text-blue-700" />
        <KpiCard icon={<UsersRound size={20} />} label="Grupos activos" value={gruposActivos} iconBg="bg-purple-50" iconColor="text-purple-700" />
        <KpiCard icon={<UserPlus size={20} />} label="Nuevos del mes" value={nuevosDelMes} iconBg="bg-green-50" iconColor="text-green-700" />
        <KpiCard icon={<TrendingUp size={20} />} label="Asist. promedio" value={`${promedioAsist}%`} iconBg="bg-teal-50" iconColor="text-teal-700" sub={`${totalEventos} eventos realizados`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crecimiento mensual (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <CrecimientoChart data={crecimientoData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asistencia mensual (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <AsistenciaChart data={asistenciaMensualData} />
          </CardContent>
        </Card>
      </div>

      {/* Attendance by group */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asistencia por grupo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead className="hidden sm:table-cell">Líder</TableHead>
                <TableHead className="text-center">Miembros</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Eventos</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Asistencias</TableHead>
                <TableHead className="text-center">% Asistencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gruposConStats.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    <Link href={`/grupos/${g.id}`} className="hover:text-blue-700">
                      {g.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-gray-500">{g.liderNombre}</TableCell>
                  <TableCell className="text-center font-semibold text-blue-700">{g.memberCount}</TableCell>
                  <TableCell className="text-center text-gray-500 hidden sm:table-cell">{g.evCount}</TableCell>
                  <TableCell className="text-center text-gray-500 hidden sm:table-cell">{g.asistTotal}</TableCell>
                  <TableCell className="text-center">
                    {g.pct !== null ? (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${g.pct >= 70 ? 'bg-green-500' : g.pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                            style={{ width: `${g.pct}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${g.pct >= 70 ? 'text-green-700' : g.pct >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {g.pct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin datos</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Nuevos del mes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevos del mes ({nuevosListado.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {nuevosListado.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Sin nuevos este mes</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {nuevosListado.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-green-700 text-white text-xs font-semibold flex items-center justify-center">
                      {getInitials(p.nombres, p.apellidos)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/personas/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-700 truncate block">
                        {p.nombres} {p.apellidos}
                      </Link>
                      <p className="text-xs text-gray-400">{p.grupoNombre} · Reg. {formatDate(p.fecha_registro ?? p.fecha_ingreso)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Distribución por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {distribucionOrdenada.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {distribucionOrdenada.map(([tipo, count]) => {
                  const pct = personas.length > 0 ? Math.round((count / personas.length) * 100) : 0
                  return (
                    <div key={tipo} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 capitalize font-medium">{tipo}</span>
                        <span className="text-gray-500">{count} <span className="text-gray-400">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {inactivos > 0 && (
                  <p className="text-xs text-gray-400 pt-1">{inactivos} personas inactivas en este listado</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, iconBg, iconColor, sub }: {
  icon: React.ReactNode; label: string; value: string | number
  iconBg: string; iconColor: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
