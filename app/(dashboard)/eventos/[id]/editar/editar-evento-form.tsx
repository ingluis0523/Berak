'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Evento, EstadoEvento, SelectOption } from '@/types'
import { ESTADO_EVENTO_LABELS } from '@/lib/utils'

const ESTADOS: { value: EstadoEvento; label: string }[] = [
  { value: 'programado', label: ESTADO_EVENTO_LABELS.programado },
  { value: 'realizado', label: ESTADO_EVENTO_LABELS.realizado },
  { value: 'cancelado', label: ESTADO_EVENTO_LABELS.cancelado },
]

interface Props {
  evento: Evento
  grupos: SelectOption[]
}

export function EditarEventoForm({ evento, grupos }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState(evento.nombre)
  const [grupoId, setGrupoId] = useState(evento.grupo_id ?? '')
  const [fecha, setFecha] = useState(evento.fecha)
  const [horaInicio, setHoraInicio] = useState(evento.hora_inicio ?? '')
  const [horaFin, setHoraFin] = useState(evento.hora_fin ?? '')
  const [estado, setEstado] = useState<EstadoEvento>(evento.estado)
  const [descripcion, setDescripcion] = useState(evento.descripcion ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!fecha) { setError('La fecha es obligatoria.'); return }

    setSaving(true)
    const { error: updateError } = await supabase
      .from('eventos')
      .update({
        nombre: nombre.trim(),
        grupo_id: grupoId || null,
        fecha,
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        estado,
        descripcion: descripcion.trim() || null,
      })
      .eq('id', evento.id)

    setSaving(false)
    if (updateError) { setError(updateError.message); return }

    router.push(`/eventos/${evento.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => router.push(`/eventos/${evento.id}`)}
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información del evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del evento"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Grupo (opcional)</label>
              <Select
                value={grupoId || 'ninguno'}
                onValueChange={(v) => setGrupoId(v === 'ninguno' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin grupo (general)</SelectItem>
                  {grupos.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Fecha <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Hora inicio</label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Hora fin</label>
                <Input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <Select value={estado} onValueChange={(v) => setEstado(v as EstadoEvento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional del evento..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/eventos/${evento.id}`)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  )
}
