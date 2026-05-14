import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, TIPO_PERSONA_LABELS, getInitials } from '@/lib/utils'
import type { Persona, EstadoPersona, TipoPersona } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserPlus, Eye, Pencil } from 'lucide-react'
import { PersonasFilters } from './personas-filters'

export const metadata: Metadata = { title: 'Personas' }

const PER_PAGE = 20

interface PageProps {
  searchParams: Promise<{
    search?: string
    estado?: string
    tipo?: string
    page?: string
  }>
}

function estadoBadgeVariant(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('activ') || n.includes('asistente') || n.includes('miembro')) return 'success'
  if (n.includes('nuevo')) return 'nuevo'
  if (n.includes('visita')) return 'visitante'
  if (n.includes('servidor')) return 'servidor'
  if (n.includes('inactiv')) return 'inactivo'
  return 'secondary'
}

export default async function PersonasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search?.trim() ?? ''
  const estadoFilter = params.estado ?? ''
  const tipoFilter = params.tipo ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  const supabase = await createClient()
  const { getCurrentUser } = await import('@/lib/current-user')
  const currentUser = await getCurrentUser()

  // For non-admin users scoped to a red, collect the persona IDs visible to them
  let visiblePersonaIds: string[] | null = null
  if (!currentUser?.is_admin && currentUser?.red_id) {
    const { data: gruposEnRed } = await supabase
      .from('grupos')
      .select('id')
      .eq('red_id', currentUser.red_id)
      .is('deleted_at', null)
    const grupoIds = (gruposEnRed ?? []).map((g) => g.id)
    if (grupoIds.length > 0) {
      const { data: miembroRows } = await supabase
        .from('grupo_miembros')
        .select('persona_id')
        .in('grupo_id', grupoIds)
        .eq('activo', true)
      visiblePersonaIds = [...new Set((miembroRows ?? []).map((m) => m.persona_id as string))]
    } else {
      visiblePersonaIds = []
    }
  }

  // Load estado options for filter
  const { data: estados } = await supabase
    .from('estados_persona')
    .select('id, nombre, color')
    .eq('activo', true)
    .order('orden')

  // Build query
  let query = supabase
    .from('personas')
    .select(
      'id, nombres, apellidos, tipo_persona, telefono, fecha_registro, estado_persona:estado_persona_id(id, nombre, color), lider:lider_id(id, nombres, apellidos)',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('fecha_registro', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(
      `nombres.ilike.%${search}%,apellidos.ilike.%${search}%,telefono.ilike.%${search}%`
    )
  }
  if (estadoFilter) {
    query = query.eq('estado_persona_id', estadoFilter)
  }
  if (tipoFilter) {
    query = query.eq('tipo_persona', tipoFilter as TipoPersona)
  }

  // Apply red-scoping filter
  if (visiblePersonaIds !== null) {
    if (visiblePersonaIds.length > 0) {
      query = query.in('id', visiblePersonaIds)
    } else {
      // User is in a red with no grupos → empty result
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    }
  }

  const { data: personas, count } = await query

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE))

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personas</h1>
          <p className="text-sm text-gray-500">{count ?? 0} registros en total</p>
        </div>
        <Button asChild>
          <Link href="/personas/nueva">
            <UserPlus size={16} />
            Nueva persona
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <PersonasFilters
        estados={(estados ?? []).map((e) => ({ value: e.id, label: e.nombre }))}
        defaultSearch={search}
        defaultEstado={estadoFilter}
        defaultTipo={tipoFilter}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Líder</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead className="hidden sm:table-cell">Registro</TableHead>
                <TableHead className="w-[90px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!personas || personas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                    No se encontraron personas.
                  </TableCell>
                </TableRow>
              ) : (
                personas.map((p) => {
                  const estadoRaw = p.estado_persona as unknown
                  const estado = (Array.isArray(estadoRaw) ? estadoRaw[0] : estadoRaw) as EstadoPersona | null
                  const initials = getInitials(p.nombres, p.apellidos)
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-800 text-white text-xs font-semibold">
                            {initials}
                          </div>
                          <span className="font-medium text-gray-900">
                            {p.nombres} {p.apellidos}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {TIPO_PERSONA_LABELS[p.tipo_persona] ?? p.tipo_persona}
                      </TableCell>
                      <TableCell>
                        {estado ? (
                          <Badge variant={estadoBadgeVariant(estado.nombre) as never}>
                            {estado.nombre}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-gray-600 text-sm">
                        {(() => {
                          const liderRaw = p.lider as unknown
                          const lider = (Array.isArray(liderRaw) ? liderRaw[0] : liderRaw) as { nombres: string; apellidos: string } | null
                          return lider ? `${lider.nombres} ${lider.apellidos}` : <span className="text-gray-400">—</span>
                        })()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-600">
                        {p.telefono ?? '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-gray-500 text-xs">
                        {formatDate(p.fecha_registro)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link href={`/personas/${p.id}`}>
                              <Eye size={15} />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link href={`/personas/${p.id}/editar`}>
                              <Pencil size={15} />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`?search=${search}&estado=${estadoFilter}&tipo=${tipoFilter}&page=${page - 1}`}
                >
                  Anterior
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`?search=${search}&estado=${estadoFilter}&tipo=${tipoFilter}&page=${page + 1}`}
                >
                  Siguiente
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
