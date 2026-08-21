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
import { UserPlus, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { PersonasFilters } from './personas-filters'
import { EliminarPersonaButton } from './eliminar-persona-button'

export const metadata: Metadata = { title: 'Personas' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    search?: string
    estado?: string
    tipo?: string
    page?: string
  }>
}

function estadoBadgeVariant(color: string | null, nombre: string): string {
  if (!color) {
    const n = nombre.toLowerCase()
    if (n.includes('inactiv')) return 'inactivo'
    if (n.includes('activ') || n.includes('asistente') || n.includes('miembro')) return 'success'
    if (n.includes('nuevo')) return 'nuevo'
    if (n.includes('visita')) return 'visitante'
    if (n.includes('servidor')) return 'servidor'
    return 'secondary'
  }
  const c = color.toLowerCase()
  if (c === 'red') return 'danger'
  if (c === 'green') return 'success'
  if (c === 'orange' || c === 'yellow') return 'warning'
  if (c === 'blue') return 'nuevo'
  if (c === 'purple') return 'visitante'
  if (c === 'gray') return 'inactivo'
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

  // Use direct permisos check (not the fallback-permissive hasPermission) so that
  // users with a role-but-no-permissions don't accidentally get full access.
  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')
  const hasRole = !!currentUser?.rol
  let visiblePersonaIds: string[] | null = null
  if (!hasFullAccess && hasRole) {
    const { resolveUserScope } = await import('@/lib/resolve-user-scope')
    const { scopedPersonaIds } = await resolveUserScope(supabase, currentUser)
    visiblePersonaIds = scopedPersonaIds
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
    .order('created_at', { ascending: false })
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
      query = query.or(`id.in.(${visiblePersonaIds.join(',')}),lider_id.in.(${visiblePersonaIds.join(',')})`)
    } else {
      // User is in a red with no grupos → empty result
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    }
  }

  const { data: personas, count } = await query

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE))
  const fromIndex = totalCount === 0 ? 0 : from + 1
  const toIndex = Math.min(from + PER_PAGE, totalCount)

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personas</h1>
          <p className="text-sm text-gray-500">{totalCount} registros en total</p>
        </div>
        {currentUser?.hasPermission('crear_personas') && (
          <Button asChild>
            <Link href="/personas/nueva">
              <UserPlus size={16} />
              Nueva persona
            </Link>
          </Button>
        )}
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
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
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
                          <Badge variant={estadoBadgeVariant(estado.color, estado.nombre) as never}>
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
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" title="Ver" asChild>
                            <Link href={`/personas/${p.id}`}>
                              <Eye size={15} />
                            </Link>
                          </Button>
                          {currentUser?.hasPermission('editar_personas') && (
                            <Button variant="ghost" size="icon-sm" title="Editar" asChild>
                              <Link href={`/personas/${p.id}/editar`}>
                                <Pencil size={15} />
                              </Link>
                            </Button>
                          )}
                          {currentUser?.is_superadmin && (
                            <EliminarPersonaButton
                              personaId={p.id}
                              personaNombre={`${p.nombres} ${p.apellidos}`}
                            />
                          )}
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
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">
          <p className="text-xs sm:text-sm">
            Mostrando <span className="font-medium text-gray-900">{fromIndex}</span> a{' '}
            <span className="font-medium text-gray-900">{toIndex}</span> de{' '}
            <span className="font-medium text-gray-900">{totalCount}</span> personas
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
              className="gap-1"
            >
              {page > 1 ? (
                <Link
                  href={`?search=${encodeURIComponent(search)}&estado=${encodeURIComponent(estadoFilter)}&tipo=${encodeURIComponent(tipoFilter)}&page=${page - 1}`}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Link>
              ) : (
                <span className="flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
              className="gap-1"
            >
              {page < totalPages ? (
                <Link
                  href={`?search=${encodeURIComponent(search)}&estado=${encodeURIComponent(estadoFilter)}&tipo=${encodeURIComponent(tipoFilter)}&page=${page + 1}`}
                  className="flex items-center gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="flex items-center gap-1">
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
