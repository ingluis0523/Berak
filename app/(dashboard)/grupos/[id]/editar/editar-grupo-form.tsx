'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Grupo, DiaSemana, SelectOption } from '@/types'
import { Combobox } from '@/components/ui/combobox'

const grupoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(120),
  lider_id: z.string().min(1, 'El líder es requerido'),
  sublider_id: z.string().optional(),
  anfitrion_id: z.string().optional(),
  red_id: z.string().optional(),
  direccion: z.string().optional(),
  dia_reunion: z.string().optional(),
  hora_reunion: z.string().optional(),
  estado: z.boolean(),
})

type GrupoFormData = z.infer<typeof grupoSchema>
type FormErrors = Partial<Record<keyof GrupoFormData, string>>

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
]

interface Props {
  grupo: Grupo
  personas: SelectOption[]
  redes: SelectOption[]
}

export function EditarGrupoForm({ grupo, personas, redes }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [form, setForm] = useState<GrupoFormData>({
    nombre: grupo.nombre,
    lider_id: grupo.lider_id ?? '',
    sublider_id: grupo.sublider_id ?? '',
    anfitrion_id: grupo.anfitrion_id ?? '',
    red_id: grupo.red_id ?? '',
    direccion: grupo.direccion ?? '',
    dia_reunion: grupo.dia_reunion ?? '',
    hora_reunion: grupo.hora_reunion ?? '',
    estado: grupo.estado,
  })
  const [errors, setErrors] = useState<FormErrors>({})

  function setField<K extends keyof GrupoFormData>(key: K, value: GrupoFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleLiderChange(personaId: string) {
    setField('lider_id', personaId)
    if (!personaId || personaId === 'none') return
    // Auto-fill red based on the leader's group membership
    const { data: gm } = await supabase
      .from('grupo_miembros')
      .select('grupo:grupos(red_id)')
      .eq('persona_id', personaId)
      .eq('activo', true)
      .maybeSingle()
    const grupoRaw = gm?.grupo
    const grupo = (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { red_id: string | null } | null
    const redId = grupo?.red_id
    if (redId) setField('red_id', redId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)

    const result = grupoSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: FormErrors = {}
      result.error.issues.forEach((err) => {
        const key = err.path[0] as keyof GrupoFormData
        if (!fieldErrors[key]) fieldErrors[key] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setSaving(true)
    const toId = (v?: string) => (v && v !== 'none' ? v : null)
    const payload = {
      nombre: form.nombre.trim(),
      lider_id: toId(form.lider_id),
      sublider_id: toId(form.sublider_id),
      anfitrion_id: toId(form.anfitrion_id),
      red_id: toId(form.red_id),
      direccion: form.direccion?.trim() || null,
      dia_reunion: (form.dia_reunion && form.dia_reunion !== 'none' ? form.dia_reunion : null) as DiaSemana | null,
      hora_reunion: form.hora_reunion || null,
      estado: form.estado,
    }

    const { error } = await supabase.from('grupos').update(payload).eq('id', grupo.id)

    if (error) { setSaving(false); setGlobalError(error.message); return }

    // Auto-update tipo_persona for assigned roles
    const updates: Promise<unknown>[] = []
    if (payload.lider_id) {
      updates.push(Promise.resolve(
        supabase.from('personas').update({ tipo_persona: 'lider' }).eq('id', payload.lider_id)
      ))
    }
    if (payload.sublider_id) {
      updates.push(Promise.resolve(
        supabase.from('personas').update({ tipo_persona: 'sublider' }).eq('id', payload.sublider_id)
      ))
    }
    if (payload.anfitrion_id) {
      updates.push(Promise.resolve(
        supabase.from('personas').update({ tipo_persona: 'anfitrion' }).eq('id', payload.anfitrion_id)
      ))
    }
    if (updates.length > 0) await Promise.all(updates)

    setSaving(false)
    router.push(`/grupos/${grupo.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => router.push(`/grupos/${grupo.id}`)}
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar grupo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Modifica los datos del grupo</p>
        </div>
      </div>

      {globalError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                placeholder="Ej: Grupo Casa de Paz"
              />
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Líder <span className="text-red-500">*</span>
              </label>
              <Combobox
                options={personas}
                value={form.lider_id || undefined}
                onValueChange={handleLiderChange}
                placeholder="Selecciona el líder"
                error={errors.lider_id}
              />
              {errors.lider_id && <p className="text-xs text-red-500">{errors.lider_id}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Sublíder</label>
              <Combobox
                options={[{ value: 'none', label: 'Sin sublíder' }, ...personas]}
                value={form.sublider_id || undefined}
                onValueChange={(v) => setField('sublider_id', v)}
                placeholder="Selecciona el sublíder (opcional)"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Anfitrión</label>
              <Combobox
                options={[{ value: 'none', label: 'Sin anfitrión' }, ...personas]}
                value={form.anfitrion_id || undefined}
                onValueChange={(v) => setField('anfitrion_id', v)}
                placeholder="Selecciona el anfitrión (opcional)"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Red</label>
              <Select value={form.red_id} onValueChange={(v) => setField('red_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Asignar a una red (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin red</SelectItem>
                  {redes.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reunión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Dirección</label>
              <Textarea
                value={form.direccion}
                onChange={(e) => setField('direccion', e.target.value)}
                placeholder="Dirección donde se reúne el grupo..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Día de reunión</label>
                <Select
                  value={form.dia_reunion}
                  onValueChange={(v) => setField('dia_reunion', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin día</SelectItem>
                    {DIAS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Hora de reunión</label>
                <Input
                  type="time"
                  value={form.hora_reunion}
                  onChange={(e) => setField('hora_reunion', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="estado"
                checked={form.estado}
                onCheckedChange={(v) => setField('estado', Boolean(v))}
              />
              <label htmlFor="estado" className="text-sm font-medium text-gray-700 cursor-pointer">
                Grupo activo
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/grupos/${grupo.id}`)}
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
