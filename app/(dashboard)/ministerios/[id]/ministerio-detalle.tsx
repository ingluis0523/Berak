'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, UserPlus, UserMinus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
  const router = useRouter()

  const [miembros, setMiembros] = useState<PersonaMinisterio[]>(miembrosIniciales)
  const [searchPersona, setSearchPersona] = useState('')
  const [personas, setPersonas] = useState<Pick<Persona, 'id' | 'nombres' | 'apellidos' | 'tipo_persona'>[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null)

  // ── Abrir modal para agregar ─────────────────────────────────────────────

  const handleOpenAddModal = useCallback(async () => {
    setSearchPersona('')
    setSelectedPersonaId(null)
    setAddError(null)

    const { data } = await supabase
      .from('personas')
      .select('id, nombres, apellidos, tipo_persona')
      .is('deleted_at', null)
      .order('nombres')
    setPersonas(data ?? [])
    setAddModalOpen(true)
  }, [supabase])

  const filteredPersonas = useMemo(() => {
    if (!searchPersona.trim()) return personas
    const q = searchPersona.toLowerCase()
    return personas.filter(
      (p) =>
        p.nombres.toLowerCase().includes(q) ||
        p.apellidos.toLowerCase().includes(q)
    )
  }, [personas, searchPersona])

  // ── Agregar miembro al ministerio ────────────────────────────────────────

  async function handleAddMiembro() {
    if (!selectedPersonaId) return
    setAddLoading(true)
    setAddError(null)

    const today = new Date().toISOString().split('T')[0]

    // Insert in persona_ministerios
    const { error: insertError } = await supabase.from('persona_ministerios').insert({
      ministerio_id: ministerio.id,
      persona_id: selectedPersonaId,
      fecha_ingreso: today,
      activo: true,
    })

    if (insertError) {
      setAddError(insertError.message)
      setAddLoading(false)
      return
    }

    // Cambiar estado a 'Servidor' (sin modificar tipo_persona)
    const { data: estadoServidor } = await supabase
      .from('estados_persona')
      .select('id')
      .ilike('nombre', 'servidor')
      .maybeSingle()
    if (estadoServidor?.id) {
      await supabase
        .from('personas')
        .update({ estado_persona_id: estadoServidor.id })
        .eq('id', selectedPersonaId)
    }

    // Refresh members
    const { data: updated } = await supabase
      .from('persona_ministerios')
      .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
      .eq('ministerio_id', ministerio.id)
      .eq('activo', true)
      .order('fecha_ingreso', { ascending: false })

    setMiembros(updated ?? [])
    setAddLoading(false)
    setAddModalOpen(false)
  }

  // ── Remover miembro ──────────────────────────────────────────────────────

  async function handleRemoveMiembro(m: PersonaMinisterio) {
    setRemoveLoadingId(m.id)
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('persona_ministerios')
      .update({ activo: false, fecha_salida: today })
      .eq('id', m.id)

    if (!error) {
      setMiembros((prev) => prev.filter((item) => item.id !== m.id))
    }
    setRemoveLoadingId(null)
  }

  const nombrePersona = (p?: Pick<Persona, 'nombres' | 'apellidos'> | null) =>
    p ? `${p.nombres} ${p.apellidos}` : '—'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/ministerios')}
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
          onClick={() => router.push(`/ministerios/${ministerio.id}/editar`)}
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
