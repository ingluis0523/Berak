'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Eye, Users, BookOpen } from 'lucide-react'
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
import type { Ministerio, Persona } from '@/types'

// Note: metadata (title: 'Ministerios') is set via the root layout or a parent server component.

interface MinisterioWithCount extends Ministerio {
  miembros_count: number
}

interface MinisterioForm {
  nombre: string
  descripcion: string
  lider_id: string
}

const defaultForm: MinisterioForm = { nombre: '', descripcion: '', lider_id: '' }

export default function MinisteriosPage() {
  const supabase = createClient()

  const [ministerios, setMinisterios] = useState<MinisterioWithCount[]>([])
  const [lideres, setLideres] = useState<Pick<Persona, 'id' | 'nombres' | 'apellidos'>[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ministerio | null>(null)
  const [form, setForm] = useState<MinisterioForm>(defaultForm)
  const [formErrors, setFormErrors] = useState<Partial<MinisterioForm>>({})

  const fetchMinisterios = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ministerios')
      .select('*, lider:personas!lider_id(id,nombres,apellidos)')
      .is('deleted_at', null)
      .order('nombre')

    if (error) { setError(error.message); setLoading(false); return }

    const { data: pm } = await supabase
      .from('persona_ministerios')
      .select('ministerio_id')
      .eq('activo', true)

    const countMap: Record<string, number> = {}
    pm?.forEach((r) => {
      if (r.ministerio_id) countMap[r.ministerio_id] = (countMap[r.ministerio_id] ?? 0) + 1
    })

    setMinisterios((data ?? []).map((m) => ({ ...m, miembros_count: countMap[m.id] ?? 0 })))
    setLoading(false)
  }, [supabase])

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
    fetchMinisterios()
    fetchLideres()
  }, [fetchMinisterios, fetchLideres])

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(m: Ministerio) {
    setEditing(m)
    setForm({
      nombre: m.nombre,
      descripcion: m.descripcion ?? '',
      lider_id: m.lider_id ?? '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function validate() {
    const errors: Partial<MinisterioForm> = {}
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
    if (editing) {
      const res = await supabase.from('ministerios').update(payload).eq('id', editing.id)
      err = res.error
    } else {
      const res = await supabase.from('ministerios').insert({ ...payload, estado: true })
      err = res.error
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    fetchMinisterios()
  }

  const nombrePersona = (p?: Pick<Persona, 'nombres' | 'apellidos'> | null) =>
    p ? `${p.nombres} ${p.apellidos}` : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ministerios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los ministerios de la iglesia</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo ministerio
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : ministerios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BookOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No hay ministerios registrados</p>
          <p className="text-sm mt-1">Crea el primer ministerio para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ministerios.map((m) => (
            <Card key={m.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                    {m.nombre}
                  </CardTitle>
                  <Badge variant={m.estado ? 'success' : 'inactivo'}>
                    {m.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Líder:</span>{' '}
                  {nombrePersona(m.lider)}
                </div>
                {m.descripcion && (
                  <p className="text-sm text-gray-500 line-clamp-2">{m.descripcion}</p>
                )}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{m.miembros_count} {m.miembros_count === 1 ? 'miembro' : 'miembros'}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <Button variant="outline" size="sm" asChild className="flex-1 gap-1">
                    <Link href={`/ministerios/${m.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(m)}
                    className="flex-1 gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar ministerio' : 'Nuevo ministerio'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los datos del ministerio.'
                : 'Completa los datos para crear un nuevo ministerio.'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Ministerio de Alabanza"
              />
              {formErrors.nombre && (
                <p className="text-xs text-red-500">{formErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Líder</label>
              <Select
                value={form.lider_id}
                onValueChange={(v) => setForm((f) => ({ ...f, lider_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un líder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin líder asignado</SelectItem>
                  {lideres.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nombres} {l.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <Textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción del ministerio..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear ministerio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
