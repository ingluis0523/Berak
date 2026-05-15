'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, PowerOff, Users, Network, UserSearch } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Red, Persona } from '@/types'

interface RedWithCount extends Red {
  grupos_count: number
}

interface PersonaEnRed {
  id: string
  nombres: string
  apellidos: string
  tipo_persona: string
  grupo_nombre: string
}

interface RedFormState {
  nombre: string
  descripcion: string
  lider_id: string
}

const defaultForm: RedFormState = { nombre: '', descripcion: '', lider_id: '' }

interface Props {
  canCrear: boolean
  canEditar: boolean
  canToggle: boolean
  /** null = show all | UUID = show only that red | undefined = show nothing */
  filterRedId: string | null | undefined
}

export default function RedesClient({ canCrear, canEditar, canToggle, filterRedId }: Props) {
  const supabase = createClient()

  const [redes, setRedes] = useState<RedWithCount[]>([])
  const [lideres, setLideres] = useState<Pick<Persona, 'id' | 'nombres' | 'apellidos'>[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRed, setEditingRed] = useState<Red | null>(null)
  const [form, setForm] = useState<RedFormState>(defaultForm)
  const [formErrors, setFormErrors] = useState<Partial<RedFormState>>({})

  const [personasModal, setPersonasModal] = useState<{
    open: boolean
    red: RedWithCount | null
    personas: PersonaEnRed[]
    loading: boolean
  }>({ open: false, red: null, personas: [], loading: false })

  const fetchRedes = useCallback(async () => {
    setLoading(true)

    if (filterRedId === undefined) {
      setRedes([])
      setLoading(false)
      return
    }

    let query = supabase
      .from('redes')
      .select('*, lider:personas!lider_id(id,nombres,apellidos)')
      .is('deleted_at', null)
      .order('nombre')

    if (filterRedId !== null) {
      query = query.eq('id', filterRedId)
    }

    const { data, error } = await query
    if (error) { setError(error.message); setLoading(false); return }

    const { data: grupos } = await supabase
      .from('grupos')
      .select('red_id')
      .is('deleted_at', null)
      .eq('estado', true)

    const countMap: Record<string, number> = {}
    grupos?.forEach((g) => { if (g.red_id) countMap[g.red_id] = (countMap[g.red_id] ?? 0) + 1 })

    setRedes((data ?? []).map((r) => ({ ...r, grupos_count: countMap[r.id] ?? 0 })))
    setLoading(false)
  }, [supabase, filterRedId])

  const fetchLideres = useCallback(async () => {
    const { data } = await supabase
      .from('personas')
      .select('id, nombres, apellidos')
      .neq('tipo_persona', 'visitante')
      .is('deleted_at', null)
      .order('nombres')
    setLideres(data ?? [])
  }, [supabase])

  useEffect(() => {
    fetchRedes()
    fetchLideres()
  }, [fetchRedes, fetchLideres])

  function openCreate() {
    setEditingRed(null)
    setForm(defaultForm)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(red: Red) {
    setEditingRed(red)
    setForm({ nombre: red.nombre, descripcion: red.descripcion ?? '', lider_id: red.lider_id ?? '' })
    setFormErrors({})
    setModalOpen(true)
  }

  async function handleVerPersonas(red: RedWithCount) {
    setPersonasModal({ open: true, red, personas: [], loading: true })

    const { data: miembros } = await supabase
      .from('grupo_miembros')
      .select('persona:personas(id,nombres,apellidos,tipo_persona), grupo:grupos(nombre)')
      .eq('activo', true)
      .in(
        'grupo_id',
        (await supabase
          .from('grupos')
          .select('id')
          .eq('red_id', red.id)
          .is('deleted_at', null)
          .then((r) => (r.data ?? []).map((g) => g.id)))
      )

    const personas: PersonaEnRed[] = []
    const seen = new Set<string>()
    miembros?.forEach((m) => {
      const pRaw = m.persona as unknown
      const gRaw = m.grupo as unknown
      const p = (Array.isArray(pRaw) ? pRaw[0] : pRaw) as { id: string; nombres: string; apellidos: string; tipo_persona: string } | null
      const g = (Array.isArray(gRaw) ? gRaw[0] : gRaw) as { nombre: string } | null
      if (p && !seen.has(p.id)) {
        seen.add(p.id)
        personas.push({ id: p.id, nombres: p.nombres, apellidos: p.apellidos, tipo_persona: p.tipo_persona, grupo_nombre: g?.nombre ?? '—' })
      }
    })
    personas.sort((a, b) => a.nombres.localeCompare(b.nombres))
    setPersonasModal((prev) => ({ ...prev, personas, loading: false }))
  }

  function validate(): boolean {
    const errors: Partial<RedFormState> = {}
    if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setError(null)

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      lider_id: form.lider_id && form.lider_id !== 'none' ? form.lider_id : null,
    }

    let err
    if (editingRed) {
      const res = await supabase.from('redes').update(payload).eq('id', editingRed.id)
      err = res.error
    } else {
      const res = await supabase.from('redes').insert({ ...payload, estado: true })
      err = res.error
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    fetchRedes()
  }

  async function handleToggleEstado(red: Red) {
    const { error } = await supabase.from('redes').update({ estado: !red.estado }).eq('id', red.id)
    if (error) { setError(error.message); return }
    fetchRedes()
  }

  const nombrePersona = (p?: Pick<Persona, 'nombres' | 'apellidos'> | null) =>
    p ? `${p.nombres} ${p.apellidos}` : '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Redes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona las redes de la iglesia</p>
        </div>
        {canCrear && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva red
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : redes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Network className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No hay redes disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {redes.map((red) => (
            <Card key={red.id} className="relative group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                    {red.nombre}
                  </CardTitle>
                  <Badge variant={red.estado ? 'success' : 'inactivo'}>
                    {red.estado ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Líder:</span>{' '}
                  {nombrePersona(red.lider)}
                </div>
                {red.descripcion && (
                  <p className="text-sm text-gray-500 line-clamp-2">{red.descripcion}</p>
                )}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{red.grupos_count} {red.grupos_count === 1 ? 'grupo' : 'grupos'}</span>
                </div>
                <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={() => handleVerPersonas(red)} className="w-full gap-1">
                    <UserSearch className="h-3.5 w-3.5" />
                    Ver personas
                  </Button>
                  {(canEditar || canToggle) && (
                    <div className="flex items-center gap-2">
                      {canEditar && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(red)} className="flex-1 gap-1">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      )}
                      {canToggle && (
                        <Button variant={red.estado ? 'danger-outline' : 'outline'} size="sm" onClick={() => handleToggleEstado(red)} className="flex-1 gap-1">
                          <PowerOff className="h-3.5 w-3.5" />
                          {red.estado ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingRed ? 'Editar red' : 'Nueva red'}</DialogTitle>
            <DialogDescription>
              {editingRed ? 'Modifica los datos de la red.' : 'Completa los datos para crear una nueva red.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nombre <span className="text-red-500">*</span></label>
              <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Red Norte" />
              {formErrors.nombre && <p className="text-xs text-red-500">{formErrors.nombre}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Líder</label>
              <Select value={form.lider_id} onValueChange={(v) => setForm((f) => ({ ...f, lider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona un líder" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin líder asignado</SelectItem>
                  {lideres.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nombres} {l.apellidos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <Textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional de la red..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editingRed ? 'Guardar cambios' : 'Crear red'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={personasModal.open} onOpenChange={(v) => !v && setPersonasModal((p) => ({ ...p, open: false }))}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Personas en {personasModal.red?.nombre ?? 'la red'}</DialogTitle>
            <DialogDescription>Miembros activos de los grupos pertenecientes a esta red</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            {personasModal.loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Cargando personas...</div>
            ) : personasModal.personas.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No hay personas registradas en esta red</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  {personasModal.personas.length} persona{personasModal.personas.length !== 1 ? 's' : ''}
                </p>
                <div className="max-h-[400px] overflow-y-auto -mx-6 px-6 space-y-1">
                  {personasModal.personas.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {`${p.nombres[0] ?? ''}${p.apellidos[0] ?? ''}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.nombres} {p.apellidos}</p>
                        <p className="text-xs text-gray-500 capitalize truncate">{p.tipo_persona} · {p.grupo_nombre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setPersonasModal((p) => ({ ...p, open: false }))}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
