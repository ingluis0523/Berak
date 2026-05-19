'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import type { SelectOption, TipoPersona } from '@/types'
import { TIPO_PERSONA_LABELS } from '@/lib/utils'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { Network } from 'lucide-react'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nombres: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  apellidos: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  telefono: z.string().optional(),
  correo: z.string().email('Correo inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  tipo_persona: z.enum([
    'miembro', 'lider', 'visitante', 'anfitrion', 'pastor', 'sublider', 'anciano', 'servidor',
  ] as const),
  estado_persona_id: z.string().optional(),
  lider_id: z.string().optional(),
  observaciones: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  estados: SelectOption[]
  lideres: SelectOption[]
}

const TIPO_OPTIONS = (Object.entries(TIPO_PERSONA_LABELS) as [TipoPersona, string][]).filter(([val]) => val !== 'servidor')

// ─── Component ────────────────────────────────────────────────────────────────

export function NuevaPersonaForm({ estados, lideres }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redNombre, setRedNombre] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_persona: 'visitante' },
  })

  async function handleLiderChange(v: string) {
    setValue('lider_id', v)
    setRedNombre(null)
    if (!v || v === 'none') return
    const supabase = createClient()
    const { data: gm } = await supabase
      .from('grupos')
      .select('redes(nombre)')
      .eq('lider_id', v)
      .eq('estado', true)
      .is('deleted_at', null)
      .maybeSingle()
    const redRaw = gm?.redes as unknown
    const red = (Array.isArray(redRaw) ? redRaw[0] : redRaw) as { nombre: string } | null
    setRedNombre(red?.nombre ?? null)
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setServerError('')
    try {
      const supabase = createClient()
      const payload: Record<string, unknown> = {
        nombres: data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        tipo_persona: data.tipo_persona,
      }
      if (data.telefono) payload.telefono = data.telefono.trim()
      if (data.correo) payload.correo = data.correo.trim()
      if (data.direccion) payload.direccion = data.direccion.trim()
      if (data.fecha_nacimiento) payload.fecha_nacimiento = data.fecha_nacimiento
      if (data.estado_persona_id) payload.estado_persona_id = data.estado_persona_id
      if (data.lider_id && data.lider_id !== 'none') payload.lider_id = data.lider_id
      if (data.observaciones) payload.observaciones = data.observaciones.trim()

      const { error } = await supabase.from('personas').insert(payload)
      if (error) {
        setServerError(error.message)
        return
      }
      router.push('/personas')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <Alert variant="danger">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Datos básicos */}
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombres *"
            placeholder="Ej. Juan Carlos"
            error={errors.nombres?.message}
            {...register('nombres')}
          />
          <Input
            label="Apellidos *"
            placeholder="Ej. García Pérez"
            error={errors.apellidos?.message}
            {...register('apellidos')}
          />
          <Input
            label="Teléfono"
            type="tel"
            placeholder="+57 300 000 0000"
            error={errors.telefono?.message}
            {...register('telefono')}
          />
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="correo@ejemplo.com"
            error={errors.correo?.message}
            {...register('correo')}
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            error={errors.fecha_nacimiento?.message}
            {...register('fecha_nacimiento')}
          />
          <Input
            label="Dirección"
            placeholder="Calle, barrio, ciudad"
            error={errors.direccion?.message}
            {...register('direccion')}
          />
        </CardContent>
      </Card>

      {/* Clasificación */}
      <Card>
        <CardHeader>
          <CardTitle>Clasificación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tipo persona */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Tipo de persona *</label>
            <Select
              defaultValue={watch('tipo_persona')}
              onValueChange={(v) => setValue('tipo_persona', v as TipoPersona)}
            >
              <SelectTrigger error={errors.tipo_persona?.message}>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_persona && (
              <p className="text-xs text-red-500">{errors.tipo_persona.message}</p>
            )}
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <Select onValueChange={(v) => setValue('estado_persona_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin estado" />
              </SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Líder */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Líder responsable</label>
            <Combobox
              options={[{ value: 'none', label: 'Sin líder' }, ...lideres]}
              value={watch('lider_id') || undefined}
              onValueChange={handleLiderChange}
              placeholder="Sin líder asignado"
            />
            {redNombre && (
              <p className="text-xs text-blue-700 flex items-center gap-1 mt-0.5">
                <Network size={12} />
                Se asignará a la red: <span className="font-medium">{redNombre}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Notas adicionales sobre la persona..."
            rows={4}
            error={errors.observaciones?.message}
            {...register('observaciones')}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/personas')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Guardar persona
        </Button>
      </div>
    </form>
  )
}
