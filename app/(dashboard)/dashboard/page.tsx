import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceChart } from './attendance-chart'
import { DashboardGreeting } from './dashboard-greeting'
import {
  Users,
  UserPlus,
  UsersRound,
  CalendarDays,
  TrendingUp,
  UserX,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: string
  iconBg?: string
  iconColor?: string
  href?: string
}

function KpiCard({ icon, label, value, trend, iconBg = 'bg-blue-50', iconColor = 'text-blue-700', href }: KpiCardProps) {
  const inner = (
    <Card className={href ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-0.5">{trend}</p>}
          {href && <p className="text-xs text-blue-500 mt-0.5">Ver detalle →</p>}
        </div>
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  // Today / week boundaries
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // ── KPI queries (parallel) ──────────────────────────────────────────────────
  const [
    { count: totalPersonas },
    { count: gruposActivos },
    { count: eventosSemana },
    { data: recentPersonas },
    { data: upcomingEvents },
    { data: weeklyAttendance },
    { data: estadoNuevoRow },
    { data: estadoInactivoRow },
  ] = await Promise.all([
    supabase.from('personas').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('grupos').select('*', { count: 'exact', head: true }).eq('estado', true).is('deleted_at', null),
    supabase
      .from('eventos')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', startOfWeek.toISOString().split('T')[0])
      .lte('fecha', endOfWeek.toISOString().split('T')[0]),
    // Recent people (last 8 registered)
    supabase
      .from('personas')
      .select('id, nombres, apellidos, tipo_persona, fecha_registro, estado_persona:estado_persona_id(nombre, color)')
      .is('deleted_at', null)
      .order('fecha_registro', { ascending: false })
      .limit(8),
    // Upcoming events this week
    supabase
      .from('eventos')
      .select('id, nombre, fecha, hora_inicio, grupo:grupo_id(nombre)')
      .gte('fecha', now.toISOString().split('T')[0])
      .order('fecha', { ascending: true })
      .limit(5),
    // Last 4 weeks events for chart
    supabase
      .from('eventos')
      .select('id, nombre, fecha, asistencias_count')
      .gte('fecha', new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('fecha', now.toISOString().split('T')[0])
      .order('fecha', { ascending: true }),
    supabase.from('estados_persona').select('id').ilike('nombre', 'nuevo').limit(1).maybeSingle(),
    supabase.from('estados_persona').select('id').ilike('nombre', '%inactiv%').limit(1).maybeSingle(),
  ])

  // ── Nuevos del mes + Inactivos (depend on estado IDs) ─────────────────────
  const [nuevosDelMesResult, inactivosResult] = await Promise.all([
    estadoNuevoRow?.id
      ? supabase
          .from('personas')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .gte('fecha_registro', startOfMonth.toISOString())
          .eq('estado_persona_id', estadoNuevoRow.id)
      : Promise.resolve({ count: 0 }),
    estadoInactivoRow?.id
      ? supabase
          .from('personas')
          .select('*', { count: 'exact', head: true })
          .eq('estado_persona_id', estadoInactivoRow.id)
          .is('deleted_at', null)
      : Promise.resolve({ count: 0 }),
  ])

  const nuevosDelMes = nuevosDelMesResult.count ?? 0
  const inactivos = inactivosResult.count ?? 0

  // ── Average attendance % ───────────────────────────────────────────────────
  let promedioAsistencia = 0
  if (weeklyAttendance && weeklyAttendance.length > 0 && totalPersonas && totalPersonas > 0) {
    const totalAsistencias = weeklyAttendance.reduce(
      (sum, e) => sum + (e.asistencias_count ?? 0),
      0
    )
    const avg = totalAsistencias / weeklyAttendance.length
    promedioAsistencia = Math.round((avg / totalPersonas) * 100)
  }

  // ── Chart data: group by ISO week (last 4 Sundays) ────────────────────────
  const chartData: { semana: string; asistencias: number }[] = []
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const label = `Sem ${4 - i}`
    const events = (weeklyAttendance ?? []).filter((e) => {
      const d = e.fecha
      return d >= weekStart.toISOString().split('T')[0] && d <= weekEnd.toISOString().split('T')[0]
    })
    const total = events.reduce((s, e) => s + (e.asistencias_count ?? 0), 0)
    chartData.push({ semana: label, asistencias: total })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <DashboardGreeting />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={<Users size={22} />}
          label="Total Personas"
          value={totalPersonas ?? 0}
          iconBg="bg-blue-50"
          iconColor="text-blue-700"
          href="/dashboard/detalle?tipo=total_personas"
        />
        <KpiCard
          icon={<UserPlus size={22} />}
          label="Nuevos del Mes"
          value={nuevosDelMes ?? 0}
          iconBg="bg-green-50"
          iconColor="text-green-700"
          href="/dashboard/detalle?tipo=nuevos_mes"
        />
        <KpiCard
          icon={<UsersRound size={22} />}
          label="Grupos Activos"
          value={gruposActivos ?? 0}
          iconBg="bg-purple-50"
          iconColor="text-purple-700"
          href="/dashboard/detalle?tipo=grupos_activos"
        />
        <KpiCard
          icon={<CalendarDays size={22} />}
          label="Eventos Esta Semana"
          value={eventosSemana ?? 0}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-700"
          href="/dashboard/detalle?tipo=eventos_semana"
        />
        <KpiCard
          icon={<TrendingUp size={22} />}
          label="Asistencia Promedio"
          value={`${promedioAsistencia}%`}
          iconBg="bg-teal-50"
          iconColor="text-teal-700"
        />
        <KpiCard
          icon={<UserX size={22} />}
          label="Personas Inactivas"
          value={inactivos}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          href="/dashboard/detalle?tipo=inactivos"
        />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance chart */}
        <Card>
          <CardHeader>
            <CardTitle>Asistencia últimas 4 semanas</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={chartData} />
          </CardContent>
        </Card>

        {/* Recent people */}
        <Card>
          <CardHeader>
            <CardTitle>Personas registradas recientemente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!recentPersonas || recentPersonas.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">Sin registros recientes.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                {recentPersonas.map((p) => {
                  const initials =
                    (p.nombres?.charAt(0) ?? '') + (p.apellidos?.charAt(0) ?? '')
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-800 text-white text-xs font-semibold">
                        {initials.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {p.nombres} {p.apellidos}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(p.fecha_registro)}</p>
                      </div>
                      <span className="text-xs text-gray-500 capitalize shrink-0">
                        {p.tipo_persona}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming events */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Eventos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!upcomingEvents || upcomingEvents.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No hay eventos próximos.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingEvents.map((ev) => {
                const grupo = Array.isArray(ev.grupo) ? ev.grupo[0] as { nombre: string } | undefined : ev.grupo as { nombre: string } | null
                return (
                  <li key={ev.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-800 shrink-0">
                      <span className="text-xs font-bold leading-none">
                        {new Date(ev.fecha + 'T00:00:00').getDate()}
                      </span>
                      <span className="text-[10px] uppercase">
                        {new Date(ev.fecha + 'T00:00:00').toLocaleString('es', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ev.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {ev.hora_inicio ? ev.hora_inicio.slice(0, 5) : '—'}{grupo ? ` · ${grupo.nombre}` : ''}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
