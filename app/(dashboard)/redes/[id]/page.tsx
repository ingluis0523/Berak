import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { formatDate, getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, Network, UserCircle, Pencil } from 'lucide-react'
import type { Persona } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('redes').select('nombre').eq('id', id).maybeSingle()
  return { title: data?.nombre ?? 'Red' }
}

export default async function RedDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  const hasFullAccess = currentUser?.is_admin || currentUser?.hasPermission('acceso_todas_redes')
  const canEditar = currentUser?.hasPermission('editar_redes') ?? true

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [{ data: red }, { data: grupos }, { data: estadoNuevoRow }] = await Promise.all([
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
    supabase
      .from('estados_persona')
      .select('id')
      .ilike('nombre', 'nuevo')
      .limit(1)
      .maybeSingle(),
  ])

  if (!red) notFound()

  // Non-admin users without full access can only see their own red
  if (!hasFullAccess) {
    const hasRole = !!currentUser?.rol
    const hasPersona = !!currentUser?.persona_id
    if (hasRole && hasPersona && currentUser?.red_id !== id) {
      notFound()
    }
  }

  const grupoIds = (grupos ?? []).map((g) => g.id)

  // All active members across all groups in this red
  type PersonaRow = {
    id: string; nombres: string; apellidos: string; tipo_persona: string
    grupo_nombre: string; estado_persona_id?: string | null; fecha_registro?: string | null
  }
  const personas: PersonaRow[] = []

  if (grupoIds.length > 0) {
    const { data: miembros } = await supabase
      .from('grupo_miembros')
      .select('persona:personas(id, nombres, apellidos, tipo_persona, estado_persona_id, fecha_registro), grupo:grupos(nombre, id)')
      .in('grupo_id', grupoIds)
      .eq('activo', true)

    const seen = new Set<string>()
    for (const m of miembros ?? []) {
      const p = (Array.isArray(m.persona) ? m.persona[0] : m.persona) as (Pick<Persona, 'id' | 'nombres' | 'apellidos' | 'tipo_persona'> & { estado_persona_id?: string | null; fecha_registro?: string | null }) | null
      const g = (Array.isArray(m.grupo) ? m.grupo[0] : m.grupo) as { nombre: string; id: string } | null
      if (p && !seen.has(p.id)) {
        seen.add(p.id)
        personas.push({
          id: p.id, nombres: p.nombres, apellidos: p.apellidos, tipo_persona: p.tipo_persona,
          grupo_nombre: g?.nombre ?? '—', estado_persona_id: p.estado_persona_id, fecha_registro: p.fecha_registro,
        })
      }
    }
    personas.sort((a, b) => a.nombres.localeCompare(b.nombres))
  }

  // Count personas nuevas del mes in this red (estado='nuevo' + fecha_registro this month)
  const personasNuevasMes = estadoNuevoRow?.id
    ? personas.filter(p =>
        p.estado_persona_id === estadoNuevoRow.id &&
        (p.fecha_registro ?? '') >= startOfMonth.toISOString()
      ).length
    : 0

  const liderRaw = red.lider as unknown
  const lider = (Array.isArray(liderRaw) ? liderRaw[0] : liderRaw) as Pick<Persona, 'id' | 'nombres' | 'apellidos'> | null

  // Líderes = red's lider + all group leaders (deduped)
  const lideresSet = new Map<string, string>()
  if (lider) lideresSet.set(lider.id, `${lider.nombres} ${lider.apellidos}`)
  for (const g of grupos ?? []) {
    const lGRaw = g.lider as unknown
    const lG = (Array.isArray(lGRaw) ? lGRaw[0] : lGRaw) as Pick<Persona, 'id' | 'nombres' | 'apellidos'> | null
    if (lG) lideresSet.set(lG.id, `${lG.nombres} ${lG.apellidos}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/redes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft size={15} />
          Volver a redes
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{red.nombre}</h1>
            {red.descripcion && <p className="text-sm text-gray-500 mt-1">{red.descripcion}</p>}
            <p className="text-xs text-gray-400 mt-1">Creada {formatDate(red.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={red.estado ? 'success' : 'inactivo'}>
              {red.estado ? 'Activa' : 'Inactiva'}
            </Badge>
            {canEditar && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/redes/${id}/editar`}>
                  <Pencil size={14} />
                  Editar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Líder de red</p>
            <p className="font-semibold text-gray-900 text-sm">
              {lider
                ? `${lider.nombres} ${lider.apellidos}`
                : <span className="text-gray-400 font-normal">Sin asignar</span>
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Grupos</p>
            <p className="text-2xl font-bold text-gray-900">{grupos?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Miembros</p>
            <p className="text-2xl font-bold text-gray-900">{personas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nuevos del mes</p>
            <p className="text-2xl font-bold text-gray-900">{personasNuevasMes}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grupos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Network size={16} />
              Grupos ({grupos?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!grupos || grupos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No hay grupos en esta red</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto -mx-6 px-6">
                {grupos.map((g) => {
                  const lGRaw = g.lider as unknown
                  const lG = (Array.isArray(lGRaw) ? lGRaw[0] : lGRaw) as Pick<Persona, 'nombres' | 'apellidos'> | null
                  return (
                    <div key={g.id} className="flex items-center justify-between py-3 first:pt-0">
                      <div>
                        <Link
                          href={`/grupos/${g.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-700"
                        >
                          {g.nombre}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Líder: {lG ? `${lG.nombres} ${lG.apellidos}` : <span className="text-gray-400">—</span>}
                        </p>
                      </div>
                      <Badge variant={g.estado ? 'success' : 'inactivo'} className="text-xs shrink-0">
                        {g.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Líderes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle size={16} />
              Líderes ({lideresSet.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lideresSet.size === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No hay líderes asignados</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto -mx-6 px-6">
                {[...lideresSet.entries()].map(([personaId, nombre]) => (
                  <div key={personaId} className="flex items-center gap-3 py-3 first:pt-0">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center">
                      {getInitials(...(nombre.split(' ') as [string, string]))}
                    </div>
                    <Link
                      href={`/personas/${personaId}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-700"
                    >
                      {nombre}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users size={16} />
            Personas ({personas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay personas registradas en esta red</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto -mx-6 px-6">
              {personas.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-blue-800 text-white text-xs font-semibold flex items-center justify-center">
                    {getInitials(p.nombres, p.apellidos)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/personas/${p.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-700 truncate block"
                    >
                      {p.nombres} {p.apellidos}
                    </Link>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {p.tipo_persona} · {p.grupo_nombre}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
