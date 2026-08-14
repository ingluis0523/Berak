'use client'

import { useMinisterioDetalle } from './hooks/use-ministerio-detalle'
import { ArrowLeft, Pencil, UserPlus, UserMinus } from 'lucide-react'
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
import type { Ministerio, PersonaMinisterio, Persona } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MinisterioFull extends Omit<Ministerio, 'lider'> {
  lider: Pick<Persona, 'id' | 'nombres' | 'apellidos'> | null
}

interface Props {
  ministerio: MinisterioFull
  miembrosIniciales: PersonaMinisterio[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(nombres: string, apellidos: string) {
  return `${nombres[0] ?? ''}${apellidos[0] ?? ''}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MinisterioDetalle({ ministerio, miembrosIniciales }: Props) {
  const {
    miembros,
    searchPersona,
    setSearchPersona,
    selectedPersonaId,
    setSelectedPersonaId,
    addModalOpen,
    setAddModalOpen,
    addLoading,
    addError,
    removeLoadingId,
    handleOpenAddModal,
    filteredPersonas,
    handleAddMiembro,
    handleRemoveMiembro,
    nombrePersona,
    goBack,
    goEdit,
  } = useMinisterioDetalle({
    ministerioId: ministerio.id,
    miembrosIniciales,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{ministerio.nombre}</h1>
            <Badge variant={ministerio.estado ? 'success' : 'inactivo'}>
              {ministerio.estado ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Líder: {nombrePersona(ministerio.lider)}
          </p>
          {ministerio.descripcion && (
            <p className="text-sm text-gray-600 mt-1">{ministerio.descripcion}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goEdit}
          className="gap-1.5 shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </div>

      {/* Miembros */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Miembros activos</h2>
            <p className="text-xs text-gray-500 mt-0.5">{miembros.length} persona{miembros.length !== 1 ? 's' : ''}</p>
          </div>
          <Button size="sm" onClick={handleOpenAddModal} className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Agregar miembro
          </Button>
        </div>

        {miembros.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <p>No hay miembros en este ministerio</p>
            <p className="text-xs mt-1">Agrega el primer miembro para comenzar</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {miembros.map((m) => {
              const p = m.persona as Persona | undefined
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
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
                    title="Remover del ministerio"
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

      {/* Modal agregar miembro */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Agregar miembro al ministerio</DialogTitle>
            <DialogDescription>
              Busca y selecciona una persona para agregar al ministerio.
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
                filteredPersonas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                      selectedPersonaId === p.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {initials(p.nombres, p.apellidos)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm block truncate ${
                          selectedPersonaId === p.id
                            ? 'font-medium text-blue-800'
                            : 'text-gray-800'
                        }`}
                      >
                        {p.nombres} {p.apellidos}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{p.tipo_persona}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {addError && <p className="text-xs text-red-500">{addError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={addLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddMiembro}
              disabled={!selectedPersonaId}
              loading={addLoading}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
