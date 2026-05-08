'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getNombreCompleto } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Download, Users, CalendarDays, TrendingUp, UserMinus } from 'lucide-react'
import { subWeeks, subMonths, startOfWeek, format, parseISO, differenceInDays, isAfter, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row =>
    Object.values(row).map(v => {
      const s = String(v ?? '')
      return s.includes(',') ? `"${s}"` : s
    }).join(',')
  )
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type RangoType = 'semana' | 'mes' | 'tres_meses' | 'personalizado'

function getRangoDates(rango: RangoType, desde: string, hasta: string): { from: Date; to: Date } {
  const now = new Date()
  switch (rango) {
    case 'semana':     return { from: subWeeks(now, 1), to: now }
    case 'mes':        return { from: subMonths(now, 1), to: now }
    case 'tres_meses': return { from: subMonths(now, 3), to: now }
    case 'personalizado':
      return {
        from: desde ? parseISO(desde) : subMonths(now, 1),
        to:   hasta ? parseISO(hasta) : now,
      }
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color = 'blue' }: {
  label: string
  value: string | number
  icon: React.ElementType
  color?: string
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    gray:   'bg-gray-50 text-gray-600',
  }
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${colors[color] ?? colors.blue}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Tab: Asistencia ──────────────────────────────────────────────────────────

function TabAsistencia() {
  const supabase = createClient()
  const [rango, setRango] = useState<RangoType>('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState<{
    id: string; nombre: string; fecha: string;
    total: number; ausentes: number; visitantes: number
  }[]>([])
  const [chartData, setChartData] = useState<{ semana: string; asistentes: number }[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getRangoDates(rango, desde, hasta)

    const { data: eventosData } = await supabase
      .from('eventos')
      .select('id, nombre, fecha, asistencias(estado, es_visitante)')
      .gte('fecha', from.toISOString().split('T')[0])
      .lte('fecha', to.toISOString().split('T')[0])
      .eq('estado', 'realizado')
      .order('fecha', { ascending: false })

    const processed = (eventosData ?? []).map(ev => {
      const asistencias = (ev.asistencias ?? []) as { estado: string; es_visitante: boolean }[]
      const total = asistencias.filter(a => a.estado === 'asistio').length
      const ausentes = asistencias.filter(a => a.estado === 'no_asistio').length
      const visitantes = asistencias.filter(a => a.estado === 'visitante' || a.estado === 'primera_vez').length
      return { id: ev.id, nombre: ev.nombre, fecha: ev.fecha, total, ausentes, visitantes }
    })
    setEventos(processed)

    // Agrupar por semana para el gráfico
    const weekMap = new Map<string, number>()
    for (const ev of processed) {
      const wk = format(startOfWeek(parseISO(ev.fecha), { locale: es }), 'dd/MM', { locale: es })
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + ev.total)
    }
    setChartData(
      Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([semana, asistentes]) => ({ semana, asistentes }))
    )

    setLoading(false)
  }, [rango, desde, hasta])

  useEffect(() => { loadData() }, [loadData])

  const totalAsistentes = eventos.reduce((s, e) => s + e.total, 0)
  const promedio = eventos.length
    ? Math.round(eventos.reduce((s, e) => s + (e.total / Math.max(e.total + e.ausentes, 1)) * 100, 0) / eventos.length)
    : 0

  return (
    <div className="space-y-5">
      {/* Rango */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={rango} onValueChange={v => setRango(v as RangoType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="tres_meses">Últimos 3 meses</SelectItem>
            <SelectItem value="personalizado">Rango personalizado</SelectItem>
          </SelectContent>
        </Select>
        {rango === 'personalizado' && (
          <>
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-40" />
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-40" />
          </>
        )}
        <Button variant="outline" size="sm" onClick={loadData}>Actualizar</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Promedio asistencia" value={`${promedio}%`} icon={TrendingUp} color="blue" />
        <KpiCard label="Total eventos" value={eventos.length} icon={CalendarDays} color="green" />
        <KpiCard label="Total asistentes" value={totalAsistentes} icon={Users} color="orange" />
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Asistencia semanal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="asistentes" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Asistentes</TableHead>
                <TableHead className="text-right">Ausentes</TableHead>
                <TableHead className="text-right">% Asistencia</TableHead>
                <TableHead className="text-right">Visitantes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Cargando...</TableCell></TableRow>
              ) : eventos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Sin datos en el período seleccionado.</TableCell></TableRow>
              ) : eventos.map(ev => {
                const pct = ev.total + ev.ausentes > 0
                  ? Math.round(ev.total / (ev.total + ev.ausentes) * 100)
                  : 0
                return (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">{ev.nombre}</TableCell>
                    <TableCell className="text-gray-500 text-xs">{formatDate(ev.fecha)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">{ev.total}</TableCell>
                    <TableCell className="text-right text-red-500">{ev.ausentes}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger'}>
                        {pct}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-purple-600">{ev.visitantes}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Personas ────────────────────────────────────────────────────────────

function TabPersonas() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [nuevosPorMes, setNuevosPorMes] = useState<{ mes: string; count: number }[]>([])
  const [inactivos, setInactivos] = useState<{ id: string; nombre: string; ultimoEvento: string; dias: number }[]>([])
  const [nuevosDelMes, setNuevosDelMes] = useState<{ id: string; nombre: string; fecha: string; grupo: string }[]>([])
  const [kpis, setKpis] = useState({ activos: 0, inactivos: 0, nuevos: 0, visitantes: 0 })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const hoy = new Date()
      const hace30 = subDays(hoy, 30)
      const hace6m = subMonths(hoy, 6)
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

      // Personas
      const { data: personas } = await supabase
        .from('personas')
        .select('id, nombres, apellidos, tipo_persona, fecha_registro, estado_persona:estado_persona_id(nombre)')
        .is('deleted_at', null)

      // Asistencias recientes
      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('persona_id, created_at, evento:evento_id(nombre, fecha)')
        .eq('estado', 'asistio')
        .gte('created_at', hace6m.toISOString())

      // Grupos de miembros
      const { data: gruposMiembros } = await supabase
        .from('grupo_miembros')
        .select('persona_id, grupo:grupo_id(nombre)')
        .eq('activo', true)

      const lastAsistencia = new Map<string, { fecha: string; evento: string }>()
      for (const a of asistencias ?? []) {
        const prev = lastAsistencia.get(a.persona_id)
        const evRaw = a.evento as unknown
        const ev = (Array.isArray(evRaw) ? evRaw[0] : evRaw) as { nombre: string; fecha: string } | null
        if (!prev || (ev && ev.fecha > prev.fecha)) {
          lastAsistencia.set(a.persona_id, { fecha: ev?.fecha ?? a.created_at, evento: ev?.nombre ?? '?' })
        }
      }

      const grupoByPersona = new Map<string, string>()
      for (const gm of gruposMiembros ?? []) {
        const gRaw = gm.grupo as unknown
        const g = (Array.isArray(gRaw) ? gRaw[0] : gRaw) as { nombre: string } | null
        if (g) grupoByPersona.set(gm.persona_id, g.nombre)
      }

      // Nuevos por mes (últimos 6 meses)
      const mesMap = new Map<string, number>()
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(hoy, i)
        mesMap.set(format(d, 'MMM yy', { locale: es }), 0)
      }
      for (const p of personas ?? []) {
        const d = parseISO(p.fecha_registro)
        if (isAfter(d, hace6m)) {
          const k = format(d, 'MMM yy', { locale: es })
          if (mesMap.has(k)) mesMap.set(k, (mesMap.get(k) ?? 0) + 1)
        }
      }
      setNuevosPorMes(Array.from(mesMap.entries()).map(([mes, count]) => ({ mes, count })))

      // Inactivos (sin asistencia en 30+ días)
      const inactivosList: typeof inactivos = []
      for (const p of personas ?? []) {
        if (p.tipo_persona === 'visitante') continue
        const last = lastAsistencia.get(p.id)
        const dias = last
          ? differenceInDays(hoy, parseISO(last.fecha))
          : differenceInDays(hoy, parseISO(p.fecha_registro))
        if (dias >= 30) {
          inactivosList.push({
            id: p.id,
            nombre: getNombreCompleto(p.nombres, p.apellidos),
            ultimoEvento: last ? `${last.evento} (${formatDate(last.fecha)})` : 'Sin registros',
            dias,
          })
        }
      }
      setInactivos(inactivosList.sort((a, b) => b.dias - a.dias).slice(0, 50))

      // Nuevos del mes
      const nuevosMes = (personas ?? [])
        .filter(p => isAfter(parseISO(p.fecha_registro), inicioMes))
        .map(p => ({
          id: p.id,
          nombre: getNombreCompleto(p.nombres, p.apellidos),
          fecha: formatDate(p.fecha_registro),
          grupo: grupoByPersona.get(p.id) ?? '—',
        }))
      setNuevosDelMes(nuevosMes)

      // KPIs
      const estadoNombres = (personas ?? []).map(p => {
        const epRaw = p.estado_persona as unknown
        const ep = (Array.isArray(epRaw) ? epRaw[0] : epRaw) as { nombre: string } | null
        return ep?.nombre?.toLowerCase() ?? ''
      })
      setKpis({
        activos: estadoNombres.filter(n => n.includes('activ') || n.includes('asistente') || n.includes('servidor')).length,
        inactivos: inactivosList.length,
        nuevos: nuevosMes.length,
        visitantes: (personas ?? []).filter(p => p.tipo_persona === 'visitante').length,
      })

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total activos" value={kpis.activos} icon={Users} color="green" />
        <KpiCard label="Inactivos (+30 días)" value={kpis.inactivos} icon={UserMinus} color="orange" />
        <KpiCard label="Nuevos este mes" value={kpis.nuevos} icon={TrendingUp} color="blue" />
        <KpiCard label="Visitantes" value={kpis.visitantes} icon={Users} color="gray" />
      </div>

      {/* Gráfico nuevos por mes */}
      <Card>
        <CardHeader><CardTitle>Nuevos por mes (últimos 6 meses)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={nuevosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inactivos */}
      <Card>
        <CardHeader><CardTitle>Personas inactivas (30+ días sin asistir)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Último evento</TableHead>
                <TableHead className="text-right">Días sin asistir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactivos.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-400">Sin personas inactivas.</TableCell></TableRow>
              ) : inactivos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-gray-500 text-xs">{p.ultimoEvento}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.dias >= 90 ? 'danger' : 'warning'}>{p.dias} días</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Nuevos del mes */}
      <Card>
        <CardHeader><CardTitle>Nuevos del mes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha registro</TableHead>
                <TableHead>Grupo actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nuevosDelMes.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-400">Sin personas nuevas este mes.</TableCell></TableRow>
              ) : nuevosDelMes.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-gray-500 text-xs">{p.fecha}</TableCell>
                  <TableCell className="text-gray-600">{p.grupo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Líderes ─────────────────────────────────────────────────────────────

function TabLideres() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [lideres, setLideres] = useState<{
    id: string; nombre: string; grupo: string
    eventosRegistrados: number; pctRegistrado: number; activo: boolean
  }[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const hoy = new Date()
      const hace1m = subMonths(hoy, 1)
      const hace2sem = subDays(hoy, 14)

      // Líderes y sublíderes
      const { data: personasData } = await supabase
        .from('personas')
        .select('id, nombres, apellidos, tipo_persona')
        .in('tipo_persona', ['lider', 'sublider'])
        .is('deleted_at', null)

      // Grupos de cada líder
      const { data: gruposData } = await supabase
        .from('grupos')
        .select('lider_id, sublider_id, nombre')
        .eq('estado', true)

      // Eventos del último mes
      const { data: eventosData } = await supabase
        .from('eventos')
        .select('id, grupo_id')
        .gte('fecha', hace1m.toISOString().split('T')[0])
        .eq('estado', 'realizado')

      // Asistencias registradas por líder (campo registrado_por)
      const { data: asistenciasData } = await supabase
        .from('asistencias')
        .select('registrado_por, evento_id, created_at')
        .gte('created_at', hace1m.toISOString())

      const grupoByLider = new Map<string, string>()
      for (const g of gruposData ?? []) {
        if (g.lider_id) grupoByLider.set(g.lider_id, g.nombre)
        if (g.sublider_id && !grupoByLider.has(g.sublider_id)) grupoByLider.set(g.sublider_id, g.nombre)
      }

      const eventosIds = new Set((eventosData ?? []).map(e => e.id))
      const eventosRegistradosPorLider = new Map<string, Set<string>>()
      const ultimaActividad = new Map<string, string>()

      for (const a of asistenciasData ?? []) {
        if (!a.registrado_por) continue
        if (!eventosRegistradosPorLider.has(a.registrado_por)) {
          eventosRegistradosPorLider.set(a.registrado_por, new Set())
        }
        eventosRegistradosPorLider.get(a.registrado_por)!.add(a.evento_id)
        const prev = ultimaActividad.get(a.registrado_por)
        if (!prev || a.created_at > prev) ultimaActividad.set(a.registrado_por, a.created_at)
      }

      const result = (personasData ?? []).map(p => {
        const eventosPropios = eventosIds.size
        const registrados = eventosRegistradosPorLider.get(p.id)?.size ?? 0
        const pct = eventosPropios > 0 ? Math.round(registrados / eventosPropios * 100) : 0
        const ultima = ultimaActividad.get(p.id)
        const activo = ultima ? isAfter(parseISO(ultima), hace2sem) : false
        return {
          id: p.id,
          nombre: getNombreCompleto(p.nombres, p.apellidos),
          grupo: grupoByLider.get(p.id) ?? '—',
          eventosRegistrados: registrados,
          pctRegistrado: pct,
          activo,
        }
      }).sort((a, b) => b.eventosRegistrados - a.eventosRegistrados)

      setLideres(result)
      setLoading(false)
    }
    load()
  }, [])

  const top10 = lideres.slice(0, 10)

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>

  return (
    <div className="space-y-5">
      {/* Gráfico top 10 */}
      {top10.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top 10 líderes por asistencia registrada</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={130} />
                <Tooltip />
                <Bar dataKey="eventosRegistrados" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Líder</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Eventos registrados</TableHead>
                <TableHead className="text-right">% Registrado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lideres.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">Sin líderes registrados.</TableCell></TableRow>
              ) : lideres.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.nombre}</TableCell>
                  <TableCell className="text-gray-500">{l.grupo}</TableCell>
                  <TableCell className="text-right font-semibold">{l.eventosRegistrados}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={l.pctRegistrado >= 70 ? 'success' : l.pctRegistrado >= 40 ? 'warning' : 'danger'}>
                      {l.pctRegistrado}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.activo ? 'success' : 'secondary'}>
                      {l.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Exportar ────────────────────────────────────────────────────────────

function TabExportar() {
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const handleExportPersonas = async () => {
    setLoading('personas')
    const { data } = await supabase
      .from('personas')
      .select('nombres, apellidos, correo, tipo_persona, telefono, fecha_registro')
      .is('deleted_at', null)
      .order('nombres')
    if (data?.length) {
      exportCSV(data as Record<string, unknown>[], `personas_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    }
    setLoading(null)
  }

  const handleExportAsistencias = async () => {
    if (!desde || !hasta) { alert('Selecciona el rango de fechas'); return }
    setLoading('asistencias')
    const { data } = await supabase
      .from('asistencias')
      .select(`
        estado, created_at,
        persona:persona_id(nombres, apellidos),
        evento:evento_id(nombre, fecha)
      `)
      .gte('created_at', desde)
      .lte('created_at', hasta + 'T23:59:59')
    const flat = (data ?? []).map(a => {
      const personaRaw = a.persona as unknown
      const persona = (Array.isArray(personaRaw) ? personaRaw[0] : personaRaw) as {nombres:string;apellidos:string} | null
      const eventoRaw = a.evento as unknown
      const evento = (Array.isArray(eventoRaw) ? eventoRaw[0] : eventoRaw) as {nombre:string;fecha:string} | null
      return {
        persona: persona ? `${persona.nombres} ${persona.apellidos}` : 'Visitante',
        evento: evento?.nombre ?? '?',
        fecha_evento: evento?.fecha ?? '?',
        estado: a.estado,
        registrado: formatDate(a.created_at),
      }
    })
    if (flat.length) exportCSV(flat as Record<string, unknown>[], `asistencias_${desde}_${hasta}.csv`)
    setLoading(null)
  }

  const handleExportInactivos = async () => {
    setLoading('inactivos')
    const hoy = new Date()
    const hace30 = subDays(hoy, 30)
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('persona_id, created_at')
      .eq('estado', 'asistio')
      .gte('created_at', hace30.toISOString())
    const activos = new Set((asistencias ?? []).map(a => a.persona_id))

    const { data: personas } = await supabase
      .from('personas')
      .select('id, nombres, apellidos, correo, tipo_persona, telefono')
      .is('deleted_at', null)
      .not('tipo_persona', 'eq', 'visitante')

    const inactivos = (personas ?? [])
      .filter(p => !activos.has(p.id))
      .map(p => ({
        nombre: `${p.nombres} ${p.apellidos}`,
        correo: p.correo ?? '',
        telefono: p.telefono ?? '',
        tipo: p.tipo_persona,
      }))
    if (inactivos.length) exportCSV(inactivos as Record<string, unknown>[], `inactivos_${format(hoy, 'yyyy-MM-dd')}.csv`)
    setLoading(null)
  }

  const handleExportNuevos = async () => {
    setLoading('nuevos')
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const { data } = await supabase
      .from('personas')
      .select('nombres, apellidos, correo, tipo_persona, fecha_registro')
      .is('deleted_at', null)
      .gte('fecha_registro', inicioMes.toISOString().split('T')[0])
      .order('fecha_registro', { ascending: false })
    if (data?.length) exportCSV(data as Record<string, unknown>[], `nuevos_${format(hoy, 'yyyy-MM')}.csv`)
    setLoading(null)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Exportar datos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">Lista de personas</p>
              <p className="text-xs text-gray-500">Nombres, correo, tipo, teléfono, fecha registro</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPersonas} loading={loading === 'personas'}>
              <Download size={14} />
              CSV
            </Button>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
            <div>
              <p className="font-medium text-sm text-gray-900">Asistencias por rango</p>
              <p className="text-xs text-gray-500 mb-2">Selecciona el rango de fechas</p>
              <div className="flex gap-2 items-center">
                <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-36" />
                <span className="text-gray-400 text-sm">—</span>
                <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-36" />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportAsistencias} loading={loading === 'asistencias'}>
              <Download size={14} />
              Exportar CSV
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">Personas inactivas</p>
              <p className="text-xs text-gray-500">Sin asistencia en los últimos 30 días</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportInactivos} loading={loading === 'inactivos'}>
              <Download size={14} />
              CSV
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">Nuevos del mes</p>
              <p className="text-xs text-gray-500">Personas registradas en el mes actual</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportNuevos} loading={loading === 'nuevos'}>
              <Download size={14} />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        description="Análisis y estadísticas de la iglesia"
        breadcrumbs={[{ label: 'Reportes' }]}
      />

      <Tabs defaultValue="asistencia">
        <TabsList>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="lideres">Líderes</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="asistencia">
          <TabAsistencia />
        </TabsContent>

        <TabsContent value="personas">
          <TabPersonas />
        </TabsContent>

        <TabsContent value="lideres">
          <TabLideres />
        </TabsContent>

        <TabsContent value="exportar">
          <TabExportar />
        </TabsContent>
      </Tabs>
    </div>
  )
}
