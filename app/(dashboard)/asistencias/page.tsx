import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, ESTADO_EVENTO_LABELS } from '@/lib/utils'
import type { Grupo } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
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
import { ClipboardCheck, Eye } from 'lucide-react'
import { AsistenciasFilters } from './asistencias-filters'

export const metadata: Metadata = { title: 'Asistencias' }

interface PageProps {
  searchParams: Promise<{
    search?: string
    grupo_id?: string
    fecha?: string
  }>
}

export default async function AsistenciasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search?.trim() ?? ''
  const grupoFilter = params.grupo_id ?? ''
  const fechaFilter = params.fecha ?? ''

  const supabase = await createClient()

  const [{ data: grupos }] = await Promise.all([
    supabase
      .from('grupos')
      .select('id, nombre')
      .is('deleted_at', null)
      .order('nombre'),
  ])

  // Get events that have at least some attendance data - show recent events
  let eventosQuery = supabase
    .from('eventos')
    .select('*, grupo:grupos(id,nombre)')
    .order('fecha', { ascending: false })
    .limit(100)

  if (search) {
    eventosQuery = eventosQuery.ilike('nombre', `%${search}%`)
  }
  if (grupoFilter) {
    eventosQuery = eventosQuery.eq('grupo_id', grupoFilter)
  }
  if (fechaFilter) {
    eventosQuery = eventosQuery.eq('fecha', fechaFilter)
  }

  const { data: eventos } = await eventosQuery

  // Get attendance counts per event
  const eventoIds = (eventos ?? []).map((e) => e.id)
  const asistenciaMap: Record<string, { asistio: number; no_asistio: number; visitantes: number }> = {}

  if (eventoIds.length > 0) {
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('evento_id, estado')
      .in('evento_id', eventoIds)

    asistencias?.forEach((a) => {
      if (!asistenciaMap[a.evento_id]) {
        asistenciaMap[a.evento_id] = { asistio: 0, no_asistio: 0, visitantes: 0 }
      }
      if (a.estado === 'asistio') asistenciaMap[a.evento_id].asistio++
      else if (a.estado === 'no_asistio') asistenciaMap[a.evento_id].no_asistio++
      else if (a.estado === 'visitante' || a.estado === 'primera_vez') {
        asistenciaMap[a.evento_id].visitantes++
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asistencias</h1>
          <p className="text-sm text-gray-500">Registro de asistencia por evento</p>
        </div>
      </div>

      {/* Filters */}
      <AsistenciasFilters
        grupos={(grupos ?? []) as Pick<Grupo, 'id' | 'nombre'>[]}
        defaultSearch={search}
        defaultGrupo={grupoFilter}
        defaultFecha={fechaFilter}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {!eventos || eventos.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No hay eventos que coincidan con los filtros</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Grupo</TableHead>
                  <TableHead className="text-center">Asistentes</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Ausentes</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Visitantes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[60px] text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.map((e) => {
                  const grupoRaw = e.grupo as unknown
                  const grupo = (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { id: string; nombre: string } | null
                  const counts = asistenciaMap[e.id] ?? { asistio: 0, no_asistio: 0, visitantes: 0 }

                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-900">
                        <Link href={`/asistencias/${e.id}`} className="hover:text-blue-700">
                          {e.nombre}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDate(e.fecha)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {grupo ? (
                          <Badge variant="secondary">{grupo.nombre}</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-green-700">{counts.asistio}</span>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span className="font-semibold text-red-500">{counts.no_asistio}</span>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span className="font-semibold text-yellow-600">{counts.visitantes}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.estado === 'realizado'
                              ? 'realizado'
                              : e.estado === 'cancelado'
                              ? 'cancelado'
                              : 'programado'
                          }
                        >
                          {ESTADO_EVENTO_LABELS[e.estado] ?? e.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/asistencias/${e.id}`}>
                            <Eye size={14} />
                          </Link>
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
