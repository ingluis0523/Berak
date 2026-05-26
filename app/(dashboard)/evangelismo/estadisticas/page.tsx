'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { ArrowLeft, Heart, TrendingUp, UserCheck, Award } from 'lucide-react'
import { subMonths, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type EvangelizadorStat = {
  id: string; nombre: string
  total: number; integrados: number; consolidados: number
  efectividad: number
}

type EstadoCount = { nombre: string; color: string; count: number }
type MesCount    = { mes: string; count: number }

function KpiCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function EvangelismoEstadisticasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  const [evangelizadores, setEvangelizadores] = useState<EvangelizadorStat[]>([])
  const [estadosData,     setEstadosData]     = useState<EstadoCount[]>([])
  const [mesesData,       setMesesData]       = useState<MesCount[]>([])
  const [kpis, setKpis] = useState({ total: 0, esteMes: 0, pctIntegrados: 0, topEvangelizador: '—' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const now = new Date()
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const hace12m = subMonths(now, 11)

      // ── Todos los evangelismos con persona+estado+evangelizador ───────────────
      const { data: evs } = await supabase
        .from('evangelismos')
        .select(`
          id, fecha_evangelismo,
          evangelizador_id,
          persona:personas!persona_id(
            estado_persona:estado_persona_id(nombre, color)
          ),
          evangelizador:personas!evangelizador_id(id, nombres, apellidos)
        `)
        .is('deleted_at', null)

      if (!evs) { setLoading(false); return }

      const total   = evs.length
      const esteMes = evs.filter(e => e.fecha_evangelismo >= inicioMes).length

      // ── Distribución por estado ───────────────────────────────────────────────
      const estadoMap = new Map<string, { color: string; count: number }>()
      for (const ev of evs) {
        const pRaw = Array.isArray(ev.persona) ? ev.persona[0] : ev.persona
        const ep = pRaw
          ? (Array.isArray((pRaw as { estado_persona: unknown }).estado_persona)
              ? ((pRaw as { estado_persona: unknown[] }).estado_persona as { nombre: string; color: string }[])[0]
              : (pRaw as unknown as { estado_persona: { nombre: string; color: string } | null }).estado_persona)
          : null
        if (ep?.nombre) {
          const prev = estadoMap.get(ep.nombre)
          estadoMap.set(ep.nombre, { color: ep.color, count: (prev?.count ?? 0) + 1 })
        }
      }
      const estadosArr: EstadoCount[] = Array.from(estadoMap.entries())
        .map(([nombre, { color, count }]) => ({ nombre, color, count }))
        .sort((a, b) => b.count - a.count)
      setEstadosData(estadosArr)

      const integradosCount   = estadoMap.get('Integrada')?.count  ?? 0
      const pctIntegrados = total > 0 ? Math.round(integradosCount / total * 100) : 0

      // ── Evangelismos por mes (últimos 12) ────────────────────────────────────
      const mesMap = new Map<string, number>()
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i)
        mesMap.set(format(d, 'MMM yy', { locale: es }), 0)
      }
      for (const ev of evs) {
        const d = parseISO(ev.fecha_evangelismo)
        if (d >= hace12m) {
          const k = format(d, 'MMM yy', { locale: es })
          if (mesMap.has(k)) mesMap.set(k, (mesMap.get(k) ?? 0) + 1)
        }
      }
      setMesesData(Array.from(mesMap.entries()).map(([mes, count]) => ({ mes, count })))

      // ── Ranking evangelizadores ───────────────────────────────────────────────
      const evMap = new Map<string, { nombre: string; total: number; integrados: number; consolidados: number }>()
      for (const ev of evs) {
        if (!ev.evangelizador_id) continue
        const evRaw = Array.isArray(ev.evangelizador) ? ev.evangelizador[0] : ev.evangelizador
        const evangRaw = evRaw as { id: string; nombres: string; apellidos: string } | null
        if (!evangRaw) continue

        const pRaw = Array.isArray(ev.persona) ? ev.persona[0] : ev.persona
        const ep = pRaw
          ? (Array.isArray((pRaw as { estado_persona: unknown }).estado_persona)
              ? ((pRaw as { estado_persona: unknown[] }).estado_persona as { nombre: string }[])[0]
              : (pRaw as unknown as { estado_persona: { nombre: string } | null }).estado_persona)
          : null
        const estadoNombre = ep?.nombre?.toLowerCase() ?? ''

        const prev = evMap.get(ev.evangelizador_id) ?? {
          nombre: `${evangRaw.nombres} ${evangRaw.apellidos}`,
          total: 0, integrados: 0, consolidados: 0,
        }
        evMap.set(ev.evangelizador_id, {
          ...prev,
          total:        prev.total + 1,
          integrados:   prev.integrados   + (estadoNombre === 'integrada'   ? 1 : 0),
          consolidados: prev.consolidados + (estadoNombre === 'consolidada' ? 1 : 0),
        })
      }

      const ranking: EvangelizadorStat[] = Array.from(evMap.entries())
        .map(([id, v]) => ({
          id,
          nombre:       v.nombre,
          total:        v.total,
          integrados:   v.integrados,
          consolidados: v.consolidados,
          efectividad:  v.total > 0 ? Math.round((v.integrados + v.consolidados) / v.total * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
      setEvangelizadores(ranking)

      const topEvangelizador = ranking[0]?.nombre ?? '—'
      setKpis({ total, esteMes, pctIntegrados, topEvangelizador })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/evangelismo" className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} />
            Evangelismo
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Estadísticas de evangelismo</h1>
        <p className="text-sm text-gray-500">Métricas, rankings e impacto evangelístico</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando estadísticas...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Heart}      label="Total evangelizados" value={kpis.total}           color="bg-rose-50 text-rose-700" />
            <KpiCard icon={TrendingUp} label="Este mes"            value={kpis.esteMes}          color="bg-blue-50 text-blue-700" />
            <KpiCard icon={UserCheck}  label="% Integrados"        value={`${kpis.pctIntegrados}%`} color="bg-green-50 text-green-700" />
            <KpiCard icon={Award}      label="Top evangelizador"   value={kpis.topEvangelizador} color="bg-yellow-50 text-yellow-700" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Evangelismos por mes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evangelismos por mes (últimos 12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mesesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Evangelizados" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución de estados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución por estado</CardTitle>
              </CardHeader>
              <CardContent>
                {estadosData.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">Sin datos</p>
                ) : (
                  <div className="space-y-3">
                    {estadosData.map(e => {
                      const pct = kpis.total > 0 ? Math.round(e.count / kpis.total * 100) : 0
                      return (
                        <div key={e.nombre} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">{e.nombre}</span>
                            <span className="text-gray-500">{e.count} <span className="text-gray-400">({pct}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: e.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ranking evangelizadores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de evangelizadores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {evangelizadores.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">
                  Sin evangelizadores registrados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">#</TableHead>
                      <TableHead>Evangelizador</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Consolidados</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Integrados</TableHead>
                      <TableHead className="text-center">Efectividad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evangelizadores.map((ev, i) => (
                      <TableRow key={ev.id}>
                        <TableCell className="pl-5 text-gray-400 font-medium">{i + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900">{ev.nombre}</TableCell>
                        <TableCell className="text-center font-semibold text-rose-700">{ev.total}</TableCell>
                        <TableCell className="text-center text-purple-600 hidden sm:table-cell">{ev.consolidados}</TableCell>
                        <TableCell className="text-center text-green-600 hidden sm:table-cell">{ev.integrados}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={ev.efectividad >= 60 ? 'success' : ev.efectividad >= 30 ? 'warning' : 'secondary'}
                          >
                            {ev.efectividad}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Último registro */}
          <p className="text-xs text-gray-400 text-right">
            Actualizado: {formatDate(new Date().toISOString().split('T')[0])}
          </p>
        </>
      )}
    </div>
  )
}
