import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, FRECUENCIA_LABELS, ESTADO_EVENTO_LABELS } from '@/lib/utils'
import type { Evento, EventoPlantilla } from '@/types'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CalendarDays, Eye, Pencil, XCircle, LayoutTemplate, Plus } from 'lucide-react'
import { EventosFilters } from './eventos-filters'
import { NuevoEventoButton } from './nuevo-evento-button'

export const metadata: Metadata = { title: 'Eventos' }

const PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    search?: string
    fecha?: string
    tab?: string
    page?: string
  }>
}

export default async function EventosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search?.trim() ?? ''
  const fecha = params.fecha?.trim() ?? ''
  const tab = params.tab ?? 'proximos'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase = await createClient()
  const { getCurrentUser } = await import('@/lib/current-user')
  const currentUser = await getCurrentUser()

  // Resolve visible grupo IDs; null = no filter (full access), [] = only global events
  const hasFullAccess = currentUser?.is_admin || currentUser?.hasPermission('acceso_todas_redes')
  let visibleGrupoIds: string[] | null = null
  if (!hasFullAccess) {
    if (currentUser?.red_id) {
      const { data: gruposEnRed } = await supabase
        .from('grupos')
        .select('id')
        .eq('red_id', currentUser.red_id)
        .is('deleted_at', null)
      visibleGrupoIds = (gruposEnRed ?? []).map((g) => g.id)
    } else {
      visibleGrupoIds = []
    }
  }

  // Build eventos query: non-admins see global events + events for their red's grupos
  let eventosQuery = supabase
    .from('eventos')
    .select('*, grupo:grupos(id,nombre)')
    .order('fecha', { ascending: false })

  if (visibleGrupoIds !== null) {
    if (visibleGrupoIds.length > 0) {
      eventosQuery = eventosQuery.or(`grupo_id.is.null,grupo_id.in.(${visibleGrupoIds.join(',')})`)
    } else {
      eventosQuery = eventosQuery.is('grupo_id', null)  // only global events
    }
  }

  const [
    { data: eventosRaw },
    { data: plantillasRaw },
    { data: grupos },
  ] = await Promise.all([
    eventosQuery,
    supabase
      .from('eventos_plantilla')
      .select('*, grupo:grupos(id,nombre)')
      .order('nombre'),
    supabase
      .from('grupos')
      .select('id, nombre')
      .is('deleted_at', null)
      .order('nombre'),
  ])

  const canCrearEvento   = currentUser?.hasPermission('crear_eventos')   ?? true
  const canEditarEvento  = currentUser?.hasPermission('editar_eventos')  ?? true
  const canCancelarEvento = currentUser?.hasPermission('cancelar_eventos') ?? true

  const today = new Date().toISOString().split('T')[0]

  // Filter helpers
  function filterEvento(e: Evento) {
    const matchesSearch = search
      ? e.nombre.toLowerCase().includes(search.toLowerCase())
      : true
    const matchesFecha = fecha ? e.fecha === fecha : true
    return matchesSearch && matchesFecha
  }

  const proximos = (eventosRaw ?? []).filter(
    (e) => e.estado === 'programado' && e.fecha >= today && filterEvento(e as Evento)
  ) as Evento[]

  const realizados = (eventosRaw ?? []).filter(
    (e) => e.estado === 'realizado' && filterEvento(e as Evento)
  ) as Evento[]

  const cancelados = (eventosRaw ?? []).filter(
    (e) => e.estado === 'cancelado' && filterEvento(e as Evento)
  ) as Evento[]

  const plantillas = (plantillasRaw ?? []).filter((p) =>
    search ? p.nombre.toLowerCase().includes(search.toLowerCase()) : true
  ) as EventoPlantilla[]

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500">
            {(eventosRaw ?? []).length} eventos registrados
          </p>
        </div>
        <div className="flex gap-2">
          {canCrearEvento && (
            <Button variant="outline" asChild>
              <Link href="/eventos/nueva-plantilla">
                <LayoutTemplate size={16} />
                Nueva plantilla
              </Link>
            </Button>
          )}
          {canCrearEvento && <NuevoEventoButton />}
        </div>
      </div>

      {/* Filters */}
      <EventosFilters defaultSearch={search} defaultFecha={fecha} defaultTab={tab} />

      {/* Tabs */}
      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="proximos">
            Próximos ({proximos.length})
          </TabsTrigger>
          <TabsTrigger value="realizados">
            Realizados ({realizados.length})
          </TabsTrigger>
          <TabsTrigger value="cancelados">
            Cancelados ({cancelados.length})
          </TabsTrigger>
          <TabsTrigger value="plantillas">
            Plantillas ({plantillas.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Próximos ──────────────────────────────────────────────────────── */}
        <TabsContent value="proximos">
          <EventosTable eventos={proximos} page={tab === 'proximos' ? page : 1} search={search} fecha={fecha} tab="proximos" canEditar={canEditarEvento} canCancelar={canCancelarEvento} />
        </TabsContent>

        {/* ── Realizados ────────────────────────────────────────────────────── */}
        <TabsContent value="realizados">
          <EventosTable eventos={realizados} page={tab === 'realizados' ? page : 1} search={search} fecha={fecha} tab="realizados" canEditar={canEditarEvento} canCancelar={canCancelarEvento} />
        </TabsContent>

        {/* ── Cancelados ────────────────────────────────────────────────────── */}
        <TabsContent value="cancelados">
          <EventosTable eventos={cancelados} page={tab === 'cancelados' ? page : 1} search={search} fecha={fecha} tab="cancelados" canEditar={canEditarEvento} canCancelar={canCancelarEvento} />
        </TabsContent>

        {/* ── Plantillas ────────────────────────────────────────────────────── */}
        <TabsContent value="plantillas">
          {plantillas.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <LayoutTemplate className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No hay plantillas</p>
              <p className="text-xs mt-1">Crea una para generar eventos automáticamente</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/eventos/nueva-plantilla">
                  <Plus size={15} />
                  Nueva plantilla
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plantillas.map((p) => (
                <PlantillaCard key={p.id} plantilla={p} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Eventos Table ────────────────────────────────────────────────────────────

function EventosTable({
  eventos,
  page,
  search,
  fecha,
  tab,
  canEditar,
  canCancelar,
}: {
  eventos: Evento[]
  page: number
  search: string
  fecha: string
  tab: string
  canEditar: boolean
  canCancelar: boolean
}) {
  if (eventos.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p>No hay eventos en esta categoría</p>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(eventos.length / PER_PAGE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const slice = eventos.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const baseHref = `?search=${encodeURIComponent(search)}&fecha=${fecha}&tab=${tab}`

  return (
    <div className="space-y-3">
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="hidden sm:table-cell">Hora inicio</TableHead>
              <TableHead className="hidden md:table-cell">Grupo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((e) => {
              const grupoRaw = e.grupo as unknown
              const grupo = (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { id: string; nombre: string } | null
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-gray-900">{e.nombre}</TableCell>
                  <TableCell className="text-gray-600">{formatDate(e.fecha)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">
                    {e.hora_inicio ? e.hora_inicio.slice(0, 5) : '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-gray-600">
                    {grupo ? (
                      <Badge variant="secondary">{grupo.nombre}</Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
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
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" asChild title="Ver detalle">
                        <Link href={`/eventos/${e.id}`}>
                          <Eye size={14} />
                        </Link>
                      </Button>
                      {canEditar && (
                        <Button variant="ghost" size="icon-sm" asChild title="Editar evento">
                          <Link href={`/eventos/${e.id}/editar`}>
                            <Pencil size={14} />
                          </Link>
                        </Button>
                      )}
                      {canCancelar && e.estado !== 'cancelado' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Cancelar evento"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          asChild
                        >
                          <Link href={`/eventos/${e.id}?action=cancelar`}>
                            <XCircle size={14} />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {totalPages > 1 && (
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Página {safePage} de {totalPages} · {eventos.length} eventos</span>
        <div className="flex gap-2">
          {safePage > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${baseHref}&page=${safePage - 1}`}>Anterior</Link>
            </Button>
          )}
          {safePage < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${baseHref}&page=${safePage + 1}`}>Siguiente</Link>
            </Button>
          )}
        </div>
      </div>
    )}
    </div>
  )
}

// ─── Plantilla Card ───────────────────────────────────────────────────────────

function PlantillaCard({ plantilla }: { plantilla: EventoPlantilla }) {
  const grupoRaw = plantilla.grupo as unknown
  const grupo = (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { id: string; nombre: string } | null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:border-blue-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 leading-tight">{plantilla.nombre}</h3>
        <Badge variant={plantilla.activo ? 'success' : 'inactivo'}>
          {plantilla.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="info">
          {FRECUENCIA_LABELS[plantilla.frecuencia] ?? plantilla.frecuencia}
        </Badge>
        {grupo && (
          <Badge variant="secondary">{grupo.nombre}</Badge>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-0.5">
        <p>Inicio: {formatDate(plantilla.fecha_inicio)}</p>
        {plantilla.fecha_fin && <p>Fin: {formatDate(plantilla.fecha_fin)}</p>}
        {plantilla.hora_inicio && (
          <p>
            {plantilla.hora_inicio.slice(0, 5)}
            {plantilla.hora_fin ? ` – ${plantilla.hora_fin.slice(0, 5)}` : ''}
          </p>
        )}
      </div>

      <div className="pt-1 border-t border-gray-100">
        <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
          <Link href={`/eventos/plantilla/${plantilla.id}/editar`}>
            <Pencil size={13} />
            Editar plantilla
          </Link>
        </Button>
      </div>
    </div>
  )
}
