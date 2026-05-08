'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getInitials, TIPO_PERSONA_LABELS } from '@/lib/utils'
import type { Persona, Asistencia, GrupoMiembro, EstadoAsistencia } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  Circle,
  Search,
  ClipboardCheck,
  Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventoInfo {
  id: string
  nombre: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  estado: string
  grupo: { id: string; nombre: string } | null
  grupo_id: string | null
}

interface MiembroRow {
  personaId: string
  nombre: string
  initials: string
  tipo: string
  estado: EstadoAsistencia | null
  asistenciaId: string | null
  saving: boolean
}

interface VisitanteRow {
  id: string          // asistencia id
  nombre: string
  telefono: string | null
  estado: 'visitante' | 'primera_vez'
}

interface Props {
  evento: EventoInfo
  miembrosIniciales: (GrupoMiembro & { persona: Persona })[]
  asistenciasIniciales: (Asistencia & { persona: Persona | null })[]
  usuarioId: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AsistenciaClient({
  evento,
  miembrosIniciales,
  asistenciasIniciales,
  usuarioId,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  // ── Build initial state from existing attendances ────────────────────────

  const asistenciasByPersonaId = useMemo(() => {
    const map: Record<string, Asistencia & { persona: Persona | null }> = {}
    asistenciasIniciales.forEach((a) => {
      if (a.persona_id) map[a.persona_id] = a
    })
    return map
  }, [asistenciasIniciales])

  function buildMiembroRow(m: GrupoMiembro & { persona: Persona }): MiembroRow {
    const p = m.persona
    const existing = asistenciasByPersonaId[p.id]
    return {
      personaId: p.id,
      nombre: `${p.nombres} ${p.apellidos}`,
      initials: getInitials(p.nombres, p.apellidos),
      tipo: p.tipo_persona,
      estado: existing ? existing.estado : null,
      asistenciaId: existing ? existing.id : null,
      saving: false,
    }
  }

  const [rows, setRows] = useState<MiembroRow[]>(() =>
    miembrosIniciales.map(buildMiembroRow)
  )

  // Visitantes (es_visitante = true or no persona_id)
  const [visitantes, setVisitantes] = useState<VisitanteRow[]>(() =>
    asistenciasIniciales
      .filter((a) => a.es_visitante || !a.persona_id)
      .map((a) => ({
        id: a.id,
        nombre: a.nombre_visitante ?? 'Visitante',
        telefono: a.telefono_visitante,
        estado: (a.estado === 'primera_vez' ? 'primera_vez' : 'visitante') as 'visitante' | 'primera_vez',
      }))
  )

  // For events without group — search personas
  const [searchPersona, setSearchPersona] = useState('')
  const [searchResults, setSearchResults] = useState<Persona[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Visitante modal
  const [visitanteModal, setVisitanteModal] = useState(false)
  const [visitanteForm, setVisitanteForm] = useState({
    nombre: '',
    telefono: '',
    estado: 'visitante' as 'visitante' | 'primera_vez',
  })
  const [visitanteSaving, setVisitanteSaving] = useState(false)
  const [visitanteError, setVisitanteError] = useState<string | null>(null)

  // Finalize
  const [finalizing, setFinalizing] = useState(false)

  // Debounce timers per row
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Track latest estado per persona to avoid stale closure in debounced upsert
  const latestEstado = useRef<Record<string, EstadoAsistencia | null>>({})

  // ── Computed stats ───────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const asistio = rows.filter((r) => r.estado === 'asistio').length
    const noAsistio = rows.filter((r) => r.estado === 'no_asistio').length
    const total = rows.length
    return {
      total: total + visitantes.length,
      asistio: asistio + visitantes.length,
      noAsistio,
      visitantes: visitantes.length,
    }
  }, [rows, visitantes])

  // ── Toggle attendance ────────────────────────────────────────────────────

  const toggleAsistencia = useCallback(
    (personaId: string) => {
      setRows((prev) => {
        const updated = prev.map((r) => {
          if (r.personaId !== personaId) return r
          const nuevoEstado: EstadoAsistencia =
            r.estado === 'asistio' ? 'no_asistio' : 'asistio'
          // Store latest to use in debounced callback
          latestEstado.current[personaId] = nuevoEstado
          return { ...r, estado: nuevoEstado, saving: true }
        })
        return updated
      })

      // Debounce upsert
      clearTimeout(debounceTimers.current[personaId])
      debounceTimers.current[personaId] = setTimeout(async () => {
        const nuevoEstado = latestEstado.current[personaId] ?? 'asistio'

        const { data, error } = await supabase
          .from('asistencias')
          .upsert(
            {
              evento_id: evento.id,
              persona_id: personaId,
              estado: nuevoEstado,
              es_visitante: false,
              registrado_por: usuarioId,
            },
            { onConflict: 'evento_id,persona_id', ignoreDuplicates: false }
          )
          .select('id')
          .single()

        setRows((prev) =>
          prev.map((r) => {
            if (r.personaId !== personaId) return r
            return {
              ...r,
              saving: false,
              asistenciaId: error ? r.asistenciaId : (data?.id ?? r.asistenciaId),
            }
          })
        )
      }, 500)
    },
    [supabase, evento.id, usuarioId]
  )

  // ── Search personas (for events without group) ───────────────────────────

  const handleSearchPersona = useCallback(
    async (q: string) => {
      setSearchPersona(q)
      if (!q.trim()) { setSearchResults([]); return }
      setSearchLoading(true)
      const { data } = await supabase
        .from('personas')
        .select('id, nombres, apellidos, tipo_persona, foto_url')
        .or(`nombres.ilike.%${q}%,apellidos.ilike.%${q}%`)
        .is('deleted_at', null)
        .limit(10)
      setSearchResults((data ?? []) as Persona[])
      setSearchLoading(false)
    },
    [supabase]
  )

  const addPersonaFromSearch = useCallback(
    (persona: Persona) => {
      const existing = rows.find((r) => r.personaId === persona.id)
      if (existing) return
      const newRow: MiembroRow = {
        personaId: persona.id,
        nombre: `${persona.nombres} ${persona.apellidos}`,
        initials: getInitials(persona.nombres, persona.apellidos),
        tipo: persona.tipo_persona,
        estado: null,
        asistenciaId: null,
        saving: false,
      }
      setRows((prev) => [...prev, newRow])
      setSearchPersona('')
      setSearchResults([])
    },
    [rows]
  )

  // ── Add visitante ────────────────────────────────────────────────────────

  async function handleAddVisitante() {
    if (!visitanteForm.nombre.trim()) { setVisitanteError('El nombre es obligatorio.'); return }
    setVisitanteSaving(true)
    setVisitanteError(null)

    const { data, error } = await supabase
      .from('asistencias')
      .insert({
        evento_id: evento.id,
        persona_id: null,
        estado: visitanteForm.estado,
        es_visitante: true,
        nombre_visitante: visitanteForm.nombre.trim(),
        telefono_visitante: visitanteForm.telefono.trim() || null,
        registrado_por: usuarioId,
      })
      .select('id')
      .single()

    if (error) {
      setVisitanteError(error.message)
      setVisitanteSaving(false)
      return
    }

    setVisitantes((prev) => [
      ...prev,
      {
        id: data!.id,
        nombre: visitanteForm.nombre.trim(),
        telefono: visitanteForm.telefono.trim() || null,
        estado: visitanteForm.estado,
      },
    ])
    setVisitanteForm({ nombre: '', telefono: '', estado: 'visitante' })
    setVisitanteSaving(false)
    setVisitanteModal(false)
  }

  // ── Finalize event ───────────────────────────────────────────────────────

  async function handleFinalizar() {
    setFinalizing(true)
    await supabase
      .from('eventos')
      .update({ estado: 'realizado' })
      .eq('id', evento.id)
    setFinalizing(false)
    router.push(`/eventos/${evento.id}`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/eventos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{evento.nombre}</h1>
          <p className="text-sm text-gray-500">
            {formatDate(evento.fecha)}
            {evento.hora_inicio && ` · ${evento.hora_inicio.slice(0, 5)}`}
            {evento.grupo && (
              <> · <span className="font-medium text-gray-700">{evento.grupo.nombre}</span></>
            )}
          </p>
        </div>
      </div>

      {/* Sticky summary */}
      <div className="sticky top-2 z-10 bg-white/90 backdrop-blur border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6 text-sm">
            <StatPill label="Total" value={stats.total} color="text-gray-700" />
            <StatPill label="Asistieron" value={stats.asistio} color="text-green-600" />
            <StatPill label="Ausentes" value={stats.noAsistio} color="text-red-500" />
            <StatPill label="Visitantes" value={stats.visitantes} color="text-yellow-600" />
          </div>
          <Button
            size="sm"
            loading={finalizing}
            onClick={handleFinalizar}
            disabled={evento.estado === 'realizado'}
            className="gap-1.5"
          >
            <ClipboardCheck size={14} />
            {evento.estado === 'realizado' ? 'Finalizado' : 'Guardar y finalizar'}
          </Button>
        </div>
      </div>

      {/* Search personas (for events without group) */}
      {!evento.grupo_id && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Este evento no tiene grupo asignado. Agrega personas individualmente:
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Buscar persona por nombre..."
              value={searchPersona}
              onChange={(e) => handleSearchPersona(e.target.value)}
            />
          </div>
          {searchLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 pl-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando...
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white shadow-sm">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPersonaFromSearch(p)}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(p.nombres, p.apellidos)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-800">
                    {p.nombres} {p.apellidos}
                  </span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {TIPO_PERSONA_LABELS[p.tipo_persona] ?? p.tipo_persona}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      {rows.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {evento.grupo_id ? 'Miembros del grupo' : 'Personas'} ({rows.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {rows.map((row) => (
              <MiembroItem
                key={row.personaId}
                row={row}
                onToggle={() => toggleAsistencia(row.personaId)}
              />
            ))}
          </ul>
        </div>
      ) : (
        !evento.grupo_id && (
          <div className="py-12 text-center text-gray-400">
            <p>Busca y agrega personas para registrar su asistencia</p>
          </div>
        )
      )}

      {/* Visitantes section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Visitantes ({visitantes.length})
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setVisitanteModal(true); setVisitanteError(null) }}
            className="gap-1.5"
          >
            <UserPlus size={14} />
            Agregar visitante
          </Button>
        </div>

        {visitantes.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No hay visitantes registrados aún
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visitantes.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                  {v.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{v.nombre}</p>
                  {v.telefono && (
                    <p className="text-xs text-gray-500">{v.telefono}</p>
                  )}
                </div>
                <Badge variant={v.estado === 'primera_vez' ? 'warning' : 'visitante'}>
                  {v.estado === 'primera_vez' ? 'Primera vez' : 'Visitante'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Visitante modal */}
      <Dialog open={visitanteModal} onOpenChange={setVisitanteModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Agregar visitante</DialogTitle>
            <DialogDescription>
              Registra los datos del visitante para esta asistencia
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Nombre completo"
                value={visitanteForm.nombre}
                onChange={(e) => setVisitanteForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Teléfono</label>
              <Input
                placeholder="Teléfono (opcional)"
                value={visitanteForm.telefono}
                onChange={(e) => setVisitanteForm((f) => ({ ...f, telefono: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tipo de visita</label>
              <Select
                value={visitanteForm.estado}
                onValueChange={(v) =>
                  setVisitanteForm((f) => ({ ...f, estado: v as 'visitante' | 'primera_vez' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="primera_vez">Primera vez</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visitanteError && (
              <p className="text-xs text-red-500">{visitanteError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitanteModal(false)} disabled={visitanteSaving}>
              Cancelar
            </Button>
            <Button loading={visitanteSaving} onClick={handleAddVisitante}>
              Registrar visitante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── MiembroItem ──────────────────────────────────────────────────────────────

function MiembroItem({
  row,
  onToggle,
}: {
  row: MiembroRow
  onToggle: () => void
}) {
  const asistio = row.estado === 'asistio'
  const noAsistio = row.estado === 'no_asistio'
  const noRegistrado = row.estado === null

  return (
    <li
      className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer select-none ${
        asistio
          ? 'bg-green-50 hover:bg-green-100'
          : noAsistio
          ? 'hover:bg-gray-50'
          : 'hover:bg-gray-50'
      }`}
      onClick={onToggle}
    >
      {/* Checkbox visual */}
      <button
        type="button"
        className="shrink-0 focus:outline-none"
        aria-label={asistio ? 'Marcar como ausente' : 'Marcar como asistente'}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
      >
        {row.saving ? (
          <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
        ) : asistio ? (
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        ) : (
          <Circle className={`h-6 w-6 ${noRegistrado ? 'text-gray-300' : 'text-gray-400'}`} />
        )}
      </button>

      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
          {row.initials}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${asistio ? 'text-green-800' : 'text-gray-900'}`}>
          {row.nombre}
        </p>
        <p className="text-xs text-gray-400 capitalize">
          {TIPO_PERSONA_LABELS[row.tipo] ?? row.tipo}
        </p>
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        {asistio ? (
          <Badge variant="success">Asistió</Badge>
        ) : noAsistio ? (
          <Badge variant="danger">Ausente</Badge>
        ) : (
          <Badge variant="secondary">Sin registrar</Badge>
        )}
      </div>
    </li>
  )
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  )
}
