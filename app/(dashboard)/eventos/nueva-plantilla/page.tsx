'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addWeeks, addMonths, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Grupo, FrecuenciaEvento } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, CalendarCog, CheckCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generarFechas(plantilla: {
  fecha_inicio: string
  fecha_fin: string | null
  frecuencia: FrecuenciaEvento
  intervalo: number
}): Date[] {
  const fechas: Date[] = []
  let current = parseISO(plantilla.fecha_inicio)
  const end = plantilla.fecha_fin
    ? parseISO(plantilla.fecha_fin)
    : addMonths(current, 3)

  if (plantilla.frecuencia === 'unico') return [current]

  while (current <= end) {
    fechas.push(new Date(current))
    if (plantilla.frecuencia === 'semanal') {
      current = addWeeks(current, plantilla.intervalo)
    } else if (plantilla.frecuencia === 'quincenal') {
      current = addWeeks(current, 2 * plantilla.intervalo)
    } else if (plantilla.frecuencia === 'mensual') {
      current = addMonths(current, plantilla.intervalo)
    }
  }

  return fechas
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  nombre: string
  grupo_id: string
  todos_grupos: boolean
  frecuencia: FrecuenciaEvento
  intervalo: number
  fecha_inicio: string
  fecha_fin: string
  hora_inicio: string
  hora_fin: string
  descripcion: string
}

const INITIAL: FormState = {
  nombre: '',
  grupo_id: '',
  todos_grupos: false,
  frecuencia: 'semanal',
  intervalo: 1,
  fecha_inicio: '',
  fecha_fin: '',
  hora_inicio: '',
  hora_fin: '',
  descripcion: '',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NuevaPlantillaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<FormState>(INITIAL)
  const [grupos, setGrupos] = useState<Pick<Grupo, 'id' | 'nombre'>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ plantillaId: string; eventosGenerados: number } | null>(null)

  useEffect(() => {
    supabase
      .from('grupos')
      .select('id, nombre')
      .is('deleted_at', null)
      .order('nombre')
      .then(({ data }) => setGrupos(data ?? []))
  }, [supabase])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Preview count
  const previewCount =
    form.fecha_inicio
      ? generarFechas({
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
          frecuencia: form.frecuencia,
          intervalo: form.intervalo,
        }).length
      : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.fecha_inicio) { setError('La fecha de inicio es obligatoria.'); return }

    setLoading(true)

    const grupoIdFinal = form.todos_grupos ? null : (form.grupo_id || null)

    // 1. Insert plantilla
    const { data: plantilla, error: plantillaError } = await supabase
      .from('eventos_plantilla')
      .insert({
        nombre: form.nombre.trim(),
        grupo_id: grupoIdFinal,
        frecuencia: form.frecuencia,
        intervalo: form.intervalo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        descripcion: form.descripcion.trim() || null,
        activo: true,
      })
      .select()
      .single()

    if (plantillaError || !plantilla) {
      setError(plantillaError?.message ?? 'Error al crear la plantilla.')
      setLoading(false)
      return
    }

    // 2. Generate and insert events
    const fechas = generarFechas({
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      frecuencia: form.frecuencia,
      intervalo: form.intervalo,
    })

    const eventosInsert = fechas.map((fecha) => ({
      plantilla_id: plantilla.id,
      grupo_id: grupoIdFinal,
      nombre: form.nombre.trim(),
      fecha: fecha.toISOString().split('T')[0],
      hora_inicio: form.hora_inicio || null,
      hora_fin: form.hora_fin || null,
      estado: 'programado' as const,
      descripcion: form.descripcion.trim() || null,
    }))

    const { error: eventosError } = await supabase.from('eventos').insert(eventosInsert)

    if (eventosError) {
      setError(`Plantilla creada pero error al generar eventos: ${eventosError.message}`)
      setLoading(false)
      return
    }

    setSuccess({ plantillaId: plantilla.id, eventosGenerados: fechas.length })
    setLoading(false)
  }

  // ─── Success screen ──────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-5">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">Plantilla creada</h2>
        <p className="text-gray-600">
          Se generaron{' '}
          <span className="font-semibold text-blue-700">{success.eventosGenerados} evento{success.eventosGenerados !== 1 ? 's' : ''}</span>{' '}
          automáticamente a partir de la plantilla.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => { setSuccess(null); setForm(INITIAL) }}>
            Crear otra plantilla
          </Button>
          <Button onClick={() => router.push('/eventos')}>
            Ver eventos
          </Button>
        </div>
      </div>
    )
  }

  // ─── Form ────────────────────────────────────────────────────────────────

  const esRecurrente = form.frecuencia !== 'unico'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/eventos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCog className="h-6 w-6 text-blue-700" />
            Nueva plantilla de evento
          </h1>
          <p className="text-sm text-gray-500">
            Define la plantilla y se generarán los eventos automáticamente
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej. Reunión de célula semanal"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                required
              />
            </div>

            {/* Grupo */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Grupo (opcional)</label>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="todos_grupos"
                  checked={form.todos_grupos}
                  onCheckedChange={(v) => set('todos_grupos', Boolean(v))}
                />
                <label htmlFor="todos_grupos" className="text-sm text-gray-600 cursor-pointer">
                  Aplicar a todos los grupos (evento global)
                </label>
              </div>
              {!form.todos_grupos && (
                <Select
                  value={form.grupo_id || 'ninguno'}
                  onValueChange={(v) => set('grupo_id', v === 'ninguno' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin grupo</SelectItem>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Frecuencia */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Frecuencia</label>
              <Select
                value={form.frecuencia}
                onValueChange={(v) => set('frecuencia', v as FrecuenciaEvento)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unico">Único</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Intervalo (solo si es recurrente) */}
            {esRecurrente && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Intervalo
                  <span className="text-gray-400 font-normal ml-1 text-xs">
                    (cada cuántas semanas/meses se repite)
                  </span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={form.intervalo}
                  onChange={(e) => set('intervalo', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-28"
                />
              </div>
            )}

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => set('fecha_inicio', e.target.value)}
                  required
                />
              </div>

              {esRecurrente && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Fecha de fin
                    <span className="text-gray-400 font-normal ml-1 text-xs">(opcional)</span>
                  </label>
                  <Input
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) => set('fecha_fin', e.target.value)}
                    min={form.fecha_inicio}
                  />
                </div>
              )}
            </div>

            {/* Horas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Hora de inicio</label>
                <Input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) => set('hora_inicio', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Hora de fin</label>
                <Input
                  type="time"
                  value={form.hora_fin}
                  onChange={(e) => set('hora_fin', e.target.value)}
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <Textarea
                placeholder="Descripción del evento (opcional)"
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                rows={3}
              />
            </div>

            {/* Preview */}
            {form.fecha_inicio && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
                Se generarán{' '}
                <span className="font-semibold">{previewCount} evento{previewCount !== 1 ? 's' : ''}</span>
                {!form.fecha_fin && esRecurrente && ' (próximos 3 meses por defecto)'}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/eventos')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Crear plantilla y generar eventos
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
