'use client'

import { useState, useMemo } from 'react'
import { useAsistencia } from './hooks/use-asistencia'
import type { EventoInfo, MiembroRow, VisitanteRow } from './hooks/use-asistencia'
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

interface Props {
  evento: EventoInfo
  grupoOrigenId: string | null
  miembrosIniciales: (GrupoMiembro & { persona: Persona })[]
  asistenciasIniciales: (Asistencia & { persona: Persona | null })[]
  usuarioId: string | null
  hasFullAccess: boolean
  scopedPersonaIds: string[]
  permisos: string[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AsistenciaClient({
  evento,
  grupoOrigenId,
  miembrosIniciales,
  asistenciasIniciales,
  usuarioId,
  hasFullAccess,
  scopedPersonaIds,
  permisos,
}: Props) {
  const canModify = useMemo(() => {
    if (hasFullAccess) return true;
    if (permisos.includes('editar_asistencias') || permisos.includes('asistencias')) return true;
    if (permisos.includes('registrar_asistencias') && evento.estado !== 'realizado') return true;
    return false;
  }, [hasFullAccess, permisos, evento.estado]);
  const {
    rows,
    setRows,
    visitantes,
    setVisitantes,
    searchPersona,
    searchResults,
    searchLoading,
    visitanteModal,
    setVisitanteModal,
    visitanteForm,
    setVisitanteForm,
    visitanteSaving,
    visitanteError,
    setVisitanteError,
    finalizing,
    stats,
    toggleAsistencia,
    handleSearchPersona,
    addPersonaFromSearch,
    handleAddVisitante,
    handleFinalizar,
    goBack,
  } = useAsistencia({
    evento,
    grupoOrigenId,
    miembrosIniciales,
    asistenciasIniciales,
    usuarioId,
    hasFullAccess,
    scopedPersonaIds,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return rows.slice(start, start + itemsPerPage);
  }, [rows, page, itemsPerPage]);

  const fromIndex = rows.length === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const toIndex = Math.min(page * itemsPerPage, rows.length);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
        >
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
            {!evento.grupo_id && grupoOrigenId && evento.grupo && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-medium">
                evento global
              </span>
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
            <StatPill label="%" value={`${stats.pct}%`} color="text-blue-600" />
          </div>
          <Button
            size="sm"
            loading={finalizing}
            onClick={handleFinalizar}
            disabled={evento.estado === 'realizado' || !canModify}
            className="gap-1.5"
          >
            <ClipboardCheck size={14} />
            {evento.estado === 'realizado' ? 'Finalizado' : 'Guardar y finalizar'}
          </Button>
        </div>
      </div>

      {/* Search personas — only for truly ungrouped events (no group context at all) */}
      {!evento.grupo_id && !grupoOrigenId && (
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
              disabled={!canModify}
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
                  disabled={!canModify}
                  onClick={() => addPersonaFromSearch(p)}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            {paginatedRows.map((row) => (
              <MiembroItem
                key={row.personaId}
                row={row}
                onToggle={() => toggleAsistencia(row.personaId)}
                disabled={!canModify}
              />
            ))}
          </ul>
          {/* Pagination */}
          {rows.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500 p-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs sm:text-sm">
                Mostrando <span className="font-medium text-gray-900">{fromIndex}</span> a{' '}
                <span className="font-medium text-gray-900">{toIndex}</span> de{' '}
                <span className="font-medium text-gray-900">{rows.length}</span> personas
              </p>

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm mr-1">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        !evento.grupo_id && !grupoOrigenId && (
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
            disabled={!canModify}
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
  disabled = false,
}: {
  row: MiembroRow
  onToggle: () => void
  disabled?: boolean
}) {
  const asistio = row.estado === 'asistio'
  const noAsistio = row.estado === 'no_asistio'
  const noRegistrado = row.estado === null

  return (
    <li
      className={`flex items-center gap-3 px-5 py-3 transition-colors select-none ${
        disabled
          ? ''
          : asistio
          ? 'bg-green-50 hover:bg-green-100 cursor-pointer'
          : 'hover:bg-gray-50 cursor-pointer'
      }`}
      onClick={disabled ? undefined : onToggle}
    >
      {/* Checkbox visual */}
      <button
        type="button"
        disabled={disabled}
        className={`shrink-0 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={asistio ? 'Marcar como ausente' : 'Marcar como asistente'}
        onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle() }}
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
  value: number | string
  color: string
}) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  )
}
