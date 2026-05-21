'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, UserPlus, UserMinus, CalendarCheck, ChevronDown, ChevronRight, Eye, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Grupo, GrupoMiembro, Evento, Persona } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GrupoFull extends Omit<Grupo, 'lider' | 'sublider' | 'anfitrion' | 'red'> {
  lider: Pick<Persona, 'id' | 'nombres' | 'apellidos'> | null
  sublider: Pick<Persona, 'id' | 'nombres' | 'apellidos'> | null
  anfitrion: Pick<Persona, 'id' | 'nombres' | 'apellidos'> | null
  red: { id: string; nombre: string } | null
}

interface Props {
  grupo: GrupoFull
  miembrosIniciales: GrupoMiembro[]
  eventosIniciales: Evento[]
  currentPersonaId: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIA_LABELS: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const TIPO_PERSONA_OPTIONS = [
  { value: 'miembro',   label: 'Miembro' },
  { value: 'visitante', label: 'Visitante' },
  { value: 'lider',     label: 'Líder' },
  { value: 'sublider',  label: 'Sublíder' },
  { value: 'anfitrion', label: 'Anfitrión' },
  { value: 'anciano',   label: 'Anciano' },
  { value: 'pastor',    label: 'Pastor' },
]

function initials(nombres: string, apellidos: string) {
  return `${nombres[0] ?? ''}${apellidos[0] ?? ''}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getWeekLabel(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDate()
  if (day <= 7) return 'Semana 1'
  if (day <= 14) return 'Semana 2'
  if (day <= 21) return 'Semana 3'
  return 'Semana 4'
}

function getMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GrupoDetalle({ grupo, miembrosIniciales, eventosIniciales, currentPersonaId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [miembros, setMiembros] = useState<GrupoMiembro[]>(miembrosIniciales)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(() => {
    const currentLabel = getMonthLabel(new Date().toISOString().split('T')[0])
    const allMonths = new Set(eventosIniciales.map((e) => getMonthLabel(e.fecha)))
    allMonths.delete(currentLabel)
    return allMonths
  })

  // ── Agregar miembro (multi-select) ───────────────────────────────────────
  const [searchPersona, setSearchPersona] = useState('')
  const [personas, setPersonas] = useState<Pick<Persona, 'id' | 'nombres' | 'apellidos'>[]>([])
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set())
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null)

  // IDs de personas que ya son miembros activos (para excluirlas del buscador)
  const existingMemberPersonaIds = useMemo(
    () => new Set(miembros.map((m) => (m.persona as Persona | undefined)?.id).filter(Boolean) as string[]),
    [miembros]
  )

  const handleOpenAddModal = useCallback(async () => {
    setSearchPersona('')
    setSelectedPersonaIds(new Set())
    setAddError(null)
    const { data } = await supabase
      .from('personas')
      .select('id, nombres, apellidos')
      .is('deleted_at', null)
      .order('nombres')
    setPersonas(data ?? [])
    setAddModalOpen(true)
  }, [supabase])

  const filteredPersonas = useMemo(() => {
    const available = personas.filter((p) => !existingMemberPersonaIds.has(p.id))
    if (!searchPersona.trim()) return available
    const q = searchPersona.toLowerCase()
    return available.filter(
      (p) => p.nombres.toLowerCase().includes(q) || p.apellidos.toLowerCase().includes(q)
    )
  }, [personas, searchPersona, existingMemberPersonaIds])

  function togglePersona(id: string) {
    setSelectedPersonaIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAddMiembro() {
    if (selectedPersonaIds.size === 0) return
    setAddLoading(true)
    setAddError(null)

    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('grupo_miembros').insert(
      [...selectedPersonaIds].map((id) => ({
        grupo_id: grupo.id,
        persona_id: id,
        fecha_ingreso: today,
        activo: true,
      }))
    )

    if (error) { setAddError(error.message); setAddLoading(false); return }

    const { data: updated } = await supabase
      .from('grupo_miembros')
      .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
      .eq('grupo_id', grupo.id)
      .eq('activo', true)
      .order('fecha_ingreso', { ascending: false })

    setMiembros(updated ?? [])
    setAddLoading(false)
    setAddModalOpen(false)
  }

  // ── Remover miembro ──────────────────────────────────────────────────────

  async function handleRemoveMiembro(miembro: GrupoMiembro) {
    setRemoveLoadingId(miembro.id)
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('grupo_miembros')
      .update({ activo: false, fecha_salida: today })
      .eq('id', miembro.id)
    if (!error) setMiembros((prev) => prev.filter((m) => m.id !== miembro.id))
    setRemoveLoadingId(null)
  }

  // ── Nueva persona ────────────────────────────────────────────────────────

  const [newPersonaOpen, setNewPersonaOpen] = useState(false)
  const [newPersonaForm, setNewPersonaForm] = useState({
    nombres: '', apellidos: '', tipo_persona: 'miembro', telefono: '',
  })
  const [newPersonaLoading, setNewPersonaLoading] = useState(false)
  const [newPersonaError, setNewPersonaError] = useState<string | null>(null)

  function openNewPersona() {
    setNewPersonaForm({ nombres: '', apellidos: '', tipo_persona: 'miembro', telefono: '' })
    setNewPersonaError(null)
    setNewPersonaOpen(true)
  }

  async function handleCreateAndAdd() {
    if (!newPersonaForm.nombres.trim() || !newPersonaForm.apellidos.trim()) {
      setNewPersonaError('Nombres y apellidos son requeridos')
      return
    }
    setNewPersonaLoading(true)
    setNewPersonaError(null)

    const payload: Record<string, unknown> = {
      nombres: newPersonaForm.nombres.trim(),
      apellidos: newPersonaForm.apellidos.trim(),
      tipo_persona: newPersonaForm.tipo_persona,
      lider_id: grupo.lider?.id ?? currentPersonaId ?? null,
    }
    if (newPersonaForm.telefono.trim()) payload.telefono = newPersonaForm.telefono.trim()

    const { data: created, error: createErr } = await supabase
      .from('personas')
      .insert(payload)
      .select('id')
      .single()

    if (createErr || !created) {
      setNewPersonaError(createErr?.message ?? 'Error al crear la persona')
      setNewPersonaLoading(false)
      return
    }

    // The assign_persona_to_lider_grupo trigger may have already added the persona
    // to this group when lider_id was set. Check before inserting to avoid the
    // unique constraint violation on idx_grupo_miembros_unique_activo.
    const { data: alreadyMember } = await supabase
      .from('grupo_miembros')
      .select('id')
      .eq('grupo_id', grupo.id)
      .eq('persona_id', created.id)
      .eq('activo', true)
      .maybeSingle()

    if (!alreadyMember) {
      const today = new Date().toISOString().split('T')[0]
      const { error: addErr } = await supabase.from('grupo_miembros').insert({
        grupo_id: grupo.id,
        persona_id: created.id,
        fecha_ingreso: today,
        activo: true,
      })
      if (addErr) {
        setNewPersonaError(addErr.message)
        setNewPersonaLoading(false)
        return
      }
    }

    const { data: updated } = await supabase
      .from('grupo_miembros')
      .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
      .eq('grupo_id', grupo.id)
      .eq('activo', true)
      .order('fecha_ingreso', { ascending: false })

    setMiembros(updated ?? [])
    setNewPersonaLoading(false)
    setNewPersonaOpen(false)
  }

  // ── Eventos agrupados ────────────────────────────────────────────────────

  const eventosAgrupados = useMemo(() => {
    const grouped: Record<string, Record<string, Evento[]>> = {}
    const sorted = [...eventosIniciales].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )
    sorted.forEach((e) => {
      const mes = getMonthLabel(e.fecha)
      const semana = getWeekLabel(e.fecha)
      if (!grouped[mes]) grouped[mes] = {}
      if (!grouped[mes][semana]) grouped[mes][semana] = []
      grouped[mes][semana].push(e)
    })

    const now = new Date()
    const currentMonthLabel = getMonthLabel(now.toISOString().split('T')[0])
    const mesKeys = Object.keys(grouped)
    mesKeys.sort((a, b) => {
      if (a === currentMonthLabel) return -1
      if (b === currentMonthLabel) return 1
      const dateA = new Date(grouped[a][Object.keys(grouped[a])[0]][0].fecha)
      const dateB = new Date(grouped[b][Object.keys(grouped[b])[0]][0].fecha)
      const diffA = dateA.getTime() - now.getTime()
      const diffB = dateB.getTime() - now.getTime()
      if (diffA >= 0 && diffB >= 0) return diffA - diffB
      if (diffA < 0 && diffB < 0) return diffB - diffA
      return diffA >= 0 ? -1 : 1
    })
    const ordered: typeof grouped = {}
    mesKeys.forEach((k) => (ordered[k] = grouped[k]))
    return ordered
  }, [eventosIniciales])

  // ── Asistencias (últimas 8 semanas) ─────────────────────────────────────

  const asistenciaResumen = useMemo(() => {
    const ultimos8 = eventosIniciales.slice(0, 8)
    return ultimos8.map((e) => ({
      evento: e,
      porcentaje: e.asistencias_count != null && miembros.length > 0
        ? Math.round((e.asistencias_count / miembros.length) * 100)
        : null,
    }))
  }, [eventosIniciales, miembros.length])

  const nombrePersona = (p?: Pick<Persona, 'nombres' | 'apellidos'> | null) =>
    p ? `${p.nombres} ${p.apellidos}` : '—'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/grupos')} aria-label="Volver">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{grupo.nombre}</h1>
            <Badge variant={grupo.estado ? 'success' : 'inactivo'}>
              {grupo.estado ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          {grupo.red && (
            <p className="text-sm text-gray-500 mt-0.5">Red: {grupo.red.nombre}</p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link href={`/grupos/${grupo.id}/editar`}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCard label="Líder" value={nombrePersona(grupo.lider)} />
        <InfoCard label="Sublíder" value={nombrePersona(grupo.sublider)} />
        <InfoCard label="Anfitrión" value={nombrePersona(grupo.anfitrion)} />
        <InfoCard
          label="Reunión"
          value={
            grupo.dia_reunion
              ? `${DIA_LABELS[grupo.dia_reunion] ?? grupo.dia_reunion}${grupo.hora_reunion ? ` a las ${grupo.hora_reunion.slice(0, 5)}` : ''}`
              : '—'
          }
        />
        {grupo.direccion && (
          <InfoCard label="Dirección" value={grupo.direccion} className="sm:col-span-2" />
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="miembros">
        <TabsList>
          <TabsTrigger value="miembros">Miembros ({miembros.length})</TabsTrigger>
          <TabsTrigger value="eventos">Eventos ({eventosIniciales.length})</TabsTrigger>
          <TabsTrigger value="asistencias">Asistencias</TabsTrigger>
        </TabsList>

        {/* ── Tab Miembros ─────────────────────────────────────────────────── */}
        <TabsContent value="miembros">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Miembros activos</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openNewPersona} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nueva persona
                </Button>
                <Button size="sm" onClick={handleOpenAddModal} className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Agregar miembro
                </Button>
              </div>
            </div>

            {miembros.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p>No hay miembros en este grupo</p>
                <p className="text-xs mt-1">Agrega el primer miembro para comenzar</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {miembros.map((m) => {
                  const p = m.persona as Persona | undefined
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback>
                          {p ? initials(p.nombres, p.apellidos) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {p ? `${p.nombres} ${p.apellidos}` : 'Persona desconocida'}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {p?.tipo_persona ?? '—'} · Ingresó: {formatDate(m.fecha_ingreso)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Remover del grupo"
                        loading={removeLoadingId === m.id}
                        onClick={() => handleRemoveMiembro(m)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Eventos ──────────────────────────────────────────────────── */}
        <TabsContent value="eventos">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Eventos del grupo</h2>
            </div>

            {Object.keys(eventosAgrupados).length === 0 ? (
              <div className="py-12 text-center text-gray-400">No hay eventos registrados</div>
            ) : (
              <div className="p-5 space-y-3">
                {Object.entries(eventosAgrupados).map(([mes, semanas]) => {
                  const isCollapsed = collapsedMonths.has(mes)
                  const totalEvtsInMes = Object.values(semanas).reduce((s, a) => s + a.length, 0)
                  return (
                    <div key={mes} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCollapsedMonths(prev => {
                          const next = new Set(prev)
                          if (next.has(mes)) next.delete(mes)
                          else next.add(mes)
                          return next
                        })}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <span className="text-sm font-semibold text-blue-800 capitalize">{mes}</span>
                        <div className="flex items-center gap-2 text-blue-600">
                          <span className="text-xs">{totalEvtsInMes} evento{totalEvtsInMes !== 1 ? 's' : ''}</span>
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>
                      {!isCollapsed && (
                        <div className="p-4 space-y-4">
                          {Object.entries(semanas).map(([semana, evts]) => (
                            <div key={semana}>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 ml-1">{semana}</p>
                              <div className="space-y-2">
                                {evts.map((e) => (
                                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900">{e.nombre}</p>
                                      <p className="text-xs text-gray-500">
                                        {formatDate(e.fecha)}{e.hora_inicio && ` · ${e.hora_inicio.slice(0, 5)}`}
                                      </p>
                                    </div>
                                    {!e.grupo_id && <Badge variant="secondary" className="text-xs shrink-0">Global</Badge>}
                                    <Badge variant={e.estado === 'realizado' ? 'realizado' : e.estado === 'cancelado' ? 'cancelado' : 'programado'}>
                                      {e.estado}
                                    </Badge>
                                    {e.estado !== 'cancelado' && (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {e.estado === 'realizado' && (
                                          <Button variant="ghost" size="sm" asChild className="gap-1">
                                            <Link href={`/eventos/${e.id}${!e.grupo_id ? `?grupo_id=${grupo.id}` : ''}`}>
                                              <Eye className="h-3.5 w-3.5" />Resumen
                                            </Link>
                                          </Button>
                                        )}
                                        <Button variant="outline" size="sm" asChild className="gap-1">
                                          <Link href={`/asistencias/${e.id}${!e.grupo_id ? `?grupo_id=${grupo.id}` : ''}`}>
                                            <CalendarCheck className="h-3.5 w-3.5" />Asistencia
                                          </Link>
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Asistencias ──────────────────────────────────────────────── */}
        <TabsContent value="asistencias">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Resumen de asistencias (últimos 8 eventos)</h2>
            </div>
            {asistenciaResumen.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No hay datos de asistencia</div>
            ) : (
              <div className="p-5 space-y-3">
                {asistenciaResumen.map(({ evento, porcentaje }) => (
                  <div key={evento.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium truncate pr-4">
                        {evento.nombre}
                        <span className="text-gray-400 font-normal ml-1">· {formatDate(evento.fecha)}</span>
                      </span>
                      <span className="text-gray-600 font-semibold shrink-0">
                        {porcentaje != null
                          ? `${evento.asistencias_count} de ${miembros.length} (${porcentaje}%)`
                          : 'N/A'}
                      </span>
                    </div>
                    {porcentaje != null && (
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            porcentaje >= 70 ? 'bg-green-500' : porcentaje >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modal: agregar miembro (multi-select) ────────────────────────────── */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Agregar miembros</DialogTitle>
            <DialogDescription>
              Selecciona una o varias personas para agregar al grupo
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-3">
            <Input
              placeholder="Buscar por nombre..."
              value={searchPersona}
              onChange={(e) => setSearchPersona(e.target.value)}
            />

            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {filteredPersonas.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-400">Sin resultados</p>
              ) : (
                filteredPersonas.map((p) => {
                  const selected = selectedPersonaIds.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePersona(p.id)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-xs">{initials(p.nombres, p.apellidos)}</AvatarFallback>
                      </Avatar>
                      <span className={`text-sm ${selected ? 'font-medium text-blue-800' : 'text-gray-800'}`}>
                        {p.nombres} {p.apellidos}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {selectedPersonaIds.size > 0 && (
              <p className="text-xs text-blue-700 font-medium">
                {selectedPersonaIds.size} persona{selectedPersonaIds.size !== 1 ? 's' : ''} seleccionada{selectedPersonaIds.size !== 1 ? 's' : ''}
              </p>
            )}

            {addError && <p className="text-xs text-red-500">{addError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={addLoading}>
              Cancelar
            </Button>
            <Button onClick={handleAddMiembro} disabled={selectedPersonaIds.size === 0} loading={addLoading}>
              Agregar{selectedPersonaIds.size > 0 ? ` (${selectedPersonaIds.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: nueva persona ──────────────────────────────────────────────── */}
      <Dialog open={newPersonaOpen} onOpenChange={setNewPersonaOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Nueva persona</DialogTitle>
            <DialogDescription>
              Crea una nueva persona y agrégala directamente a este grupo
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej. Juan Carlos"
                  value={newPersonaForm.nombres}
                  onChange={(e) => setNewPersonaForm((f) => ({ ...f, nombres: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej. García Pérez"
                  value={newPersonaForm.apellidos}
                  onChange={(e) => setNewPersonaForm((f) => ({ ...f, apellidos: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tipo de persona</label>
                <Select
                  value={newPersonaForm.tipo_persona}
                  onValueChange={(v) => setNewPersonaForm((f) => ({ ...f, tipo_persona: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_PERSONA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Teléfono</label>
                <Input
                  type="tel"
                  placeholder="+57 300 000 0000"
                  value={newPersonaForm.telefono}
                  onChange={(e) => setNewPersonaForm((f) => ({ ...f, telefono: e.target.value }))}
                />
              </div>
            </div>

            {newPersonaError && <p className="text-xs text-red-500">{newPersonaError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPersonaOpen(false)} disabled={newPersonaLoading}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAndAdd} loading={newPersonaLoading}>
              Crear y agregar al grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function InfoCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 px-4 py-3 ${className ?? ''}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
