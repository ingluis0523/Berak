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
import { getCurrentUser } from '@/lib/current-user'

export const metadata: Metadata = { title: 'Asistencias' }

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    search?: string
    grupo_id?: string
    estado?: string
    fecha?: string
    page?: string
  }>
}

const PER_PAGE = 10

export default async function AsistenciasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search?.trim() ?? ''
  const grupoFilter = params.grupo_id ?? ''
  const estadoFilter = params.estado ?? ''
  const fechaFilter = params.fecha ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')

  let myGroupIds: string[] = []
  let scopedPersonaIds: string[] = []

  if (!hasFullAccess) {
    const { resolveUserScope } = await import('@/lib/resolve-user-scope')
    const { myGroupIds: gIds, scopedPersonaIds: pIds } = await resolveUserScope(supabase, currentUser)
    myGroupIds = gIds
    scopedPersonaIds = pIds
  }

  let gruposQuery = supabase
    .from('grupos')
    .select('id, nombre')
    .is('deleted_at', null)
    .order('nombre')

  if (!hasFullAccess) {
    if (myGroupIds.length > 0) {
      gruposQuery = gruposQuery.in('id', myGroupIds)
    } else {
      gruposQuery = gruposQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const [{ data: grupos }] = await Promise.all([
    gruposQuery,
  ])

  const today = new Date().toISOString().split('T')[0]

  let allIdsQuery = supabase
    .from('eventos')
    .select('id, fecha, hora_inicio, estado')

  if (search) {
    allIdsQuery = allIdsQuery.ilike('nombre', `%${search}%`)
  }

  if (grupoFilter) {
    if (!hasFullAccess && !myGroupIds.includes(grupoFilter)) {
      if (myGroupIds.length > 0) {
        allIdsQuery = allIdsQuery.in('grupo_id', myGroupIds)
      } else {
        allIdsQuery = allIdsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    } else {
      allIdsQuery = allIdsQuery.eq('grupo_id', grupoFilter)
    }
  } else if (!hasFullAccess) {
    if (myGroupIds.length > 0) {
      allIdsQuery = allIdsQuery.in('grupo_id', myGroupIds)
    } else {
      allIdsQuery = allIdsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  if (estadoFilter) {
    allIdsQuery = allIdsQuery.eq('estado', estadoFilter)
  }
  if (fechaFilter) {
    allIdsQuery = allIdsQuery.eq('fecha', fechaFilter)
  }

  const { data: allIdsRaw } = await allIdsQuery

  const rawList = allIdsRaw ?? []
  let sortedIds: typeof rawList = []

  if (estadoFilter || fechaFilter) {
    // Con filtro específico, ordenar por fecha descendente estándar
    sortedIds = [...rawList].sort((a, b) => {
      const cmp = b.fecha.localeCompare(a.fecha)
      if (cmp !== 0) return cmp
      return (b.hora_inicio || '').localeCompare(a.hora_inicio || '')
    })
  } else {
    // 1. Eventos futuros o de hoy (más próximo primero)
    const futureEvents = rawList
      .filter((e) => e.fecha >= today)
      .sort((a, b) => {
        const cmp = a.fecha.localeCompare(b.fecha)
        if (cmp !== 0) return cmp
        return (a.hora_inicio || '').localeCompare(b.hora_inicio || '')
      })

    // 2. Eventos pasados (más reciente primero)
    const pastEvents = rawList
      .filter((e) => e.fecha < today)
      .sort((a, b) => {
        const cmp = b.fecha.localeCompare(a.fecha)
        if (cmp !== 0) return cmp
        return (b.hora_inicio || '').localeCompare(a.hora_inicio || '')
      })

    // Solo el SIGUIENTE más próximo va de primero, seguido de los pasados en orden desc
    const nextUpcoming = futureEvents.length > 0 ? futureEvents[0] : null
    const otherFutures = futureEvents.slice(1)

    sortedIds = [
      ...(nextUpcoming ? [nextUpcoming] : []),
      ...pastEvents,
      ...otherFutures,
    ]
  }

  const total = sortedIds.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const fromIndex = total === 0 ? 0 : from + 1
  const toIndex = Math.min(to + 1, total)

  const pageIds = sortedIds.slice(from, to + 1).map((e) => e.id)

  let eventos: Array<{
    id: string
    nombre: string
    fecha: string
    estado: string
    grupo?: { id: string; nombre: string } | null
    [key: string]: unknown
  }> = []

  if (pageIds.length > 0) {
    const { data: pageEventos } = await supabase
      .from('eventos')
      .select('*, grupo:grupos(id,nombre)')
      .in('id', pageIds)

    const eventoMap = new Map((pageEventos ?? []).map((e) => [e.id, e]))
    eventos = pageIds.map((id) => eventoMap.get(id)).filter(Boolean) as typeof eventos
  }

  // Get attendance counts per event
  const eventoIds = pageIds
  const asistenciaMap: Record<string, { asistio: number; no_asistio: number; visitantes: number }> = {}

  if (eventoIds.length > 0) {
    // Fetch active group members count for group events context
    let miembrosQuery = supabase
      .from('grupo_miembros')
      .select('grupo_id')
      .eq('activo', true)

    if (!hasFullAccess) {
      if (myGroupIds.length > 0) {
        miembrosQuery = miembrosQuery.in('grupo_id', myGroupIds)
      } else {
        miembrosQuery = miembrosQuery.eq('grupo_id', '00000000-0000-0000-0000-000000000000')
      }
    }
    const { data: miembrosData } = await miembrosQuery

    const groupCounts: Record<string, number> = {}
    miembrosData?.forEach((gm) => {
      if (gm.grupo_id) {
        groupCounts[gm.grupo_id] = (groupCounts[gm.grupo_id] ?? 0) + 1
      }
    })

    // Fetch total active personas registered in the platform (deleted_at is null)
    let totalRegistrados = 0
    if (!hasFullAccess) {
      const { count } = await supabase
        .from('personas')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`)
      totalRegistrados = count ?? 0
    } else {
      const { count: totalPersonas } = await supabase
        .from('personas')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
      totalRegistrados = totalPersonas ?? 0
    }

    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('evento_id, estado')
      .in('evento_id', eventoIds)

    // Pre-initialize map entries for page events
    eventos.forEach((e) => {
      asistenciaMap[e.id] = { asistio: 0, no_asistio: 0, visitantes: 0 }
    })

    asistencias?.forEach((a) => {
      const entry = asistenciaMap[a.evento_id]
      if (entry) {
        if (a.estado === 'asistio') entry.asistio++
        else if (a.estado === 'visitante' || a.estado === 'primera_vez') {
          entry.visitantes++
        }
      }
    })

    // Now calculate no_asistio based on expected members
    eventos.forEach((e) => {
      const entry = asistenciaMap[e.id]
      if (entry) {
        const totalEsperados = e.grupo_id
          ? (groupCounts[e.grupo_id as string] ?? 0)
          : totalRegistrados
        entry.no_asistio = Math.max(totalEsperados - entry.asistio, 0)
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
        defaultEstado={estadoFilter}
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

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500 pt-1">
          <p className="text-xs sm:text-sm">
            Mostrando <span className="font-medium text-gray-900">{fromIndex}</span> a{' '}
            <span className="font-medium text-gray-900">{toIndex}</span> de{' '}
            <span className="font-medium text-gray-900">{total}</span> eventos
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm mr-1">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
              {page > 1 ? (
                <Link
                  href={`?search=${encodeURIComponent(search)}&grupo_id=${encodeURIComponent(grupoFilter)}&estado=${encodeURIComponent(estadoFilter)}&fecha=${encodeURIComponent(fechaFilter)}&page=${page - 1}`}
                >
                  Anterior
                </Link>
              ) : (
                'Anterior'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link
                  href={`?search=${encodeURIComponent(search)}&grupo_id=${encodeURIComponent(grupoFilter)}&estado=${encodeURIComponent(estadoFilter)}&fecha=${encodeURIComponent(fechaFilter)}&page=${page + 1}`}
                >
                  Siguiente
                </Link>
              ) : (
                'Siguiente'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
