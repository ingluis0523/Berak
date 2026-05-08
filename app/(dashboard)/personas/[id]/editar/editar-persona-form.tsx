'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import type { Persona, SelectOption, TipoPersona } from '@/types'
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

const schema = z.object({
  nombres: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  apellidos: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  telefono: z.string().optional(),
  correo: z.string().email('Correo inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  tipo_persona: z.enum([
    'miembro', 'lider', 'visitante', 'servidor', 'anfitrion', 'pastor', 'sublider', 'anciano',
  ] as const),
  estado_persona_id: z.string().optional(),
  lider_id: z.string().optional(),
  observaciones: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  persona: Persona
  estados: SelectOption[]
  lideres: SelectOption[]
}

const TIPO_OPTIONS = Object.entries(TIPO_PERSONA_LABELS) as [TipoPersona, string][]

export function EditarPersonaForm({ persona, estados, lideres }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      telefono: persona.telefono ?? '',
      correo: persona.correo ?? '',
      direccion: persona.direccion ?? '',
      fecha_nacimiento: persona.fecha_nacimiento ?? '',
      tipo_persona: persona.tipo_persona,
      estado_persona_id: persona.estado_persona_id ?? '',
      lider_id: persona.lider_id ?? '',
      observaciones: persona.observaciones ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setServerError('')
    try {
      const supabase = createClient()
      const payload: Record<string, unknown> = {
        nombres: data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        tipo_persona: data.tipo_persona,
        telefono: data.telefono?.trim() || null,
        correo: data.correo?.trim() || null,
        direccion: data.direccion?.trim() || null,
        fecha_nacimiento: data.fecha_nacimiento || null,
        estado_persona_id: data.estado_persona_id || null,
        lider_id: data.lider_id || null,
        observaciones: data.observaciones?.trim() || null,
      }

      const { error } = await supabase
        .from('personas')
        .update(payload)
        .eq('id', persona.id)

      if (error) {
        setServerError(error.message)
        return
      }
      router.push(`/personas/${persona.id}`)
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

      <Card>
        <CardHeader>
          <CardTitle>Clasificación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <Select
              defaultValue={watch('estado_persona_id')}
              onValueChange={(v) => setValue('estado_persona_id', v)}
            >
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

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Líder responsable</label>
            <Select
              defaultValue={watch('lider_id')}
              onValueChange={(v) => setValue('lider_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin líder asignado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin líder</SelectItem>
                {lideres.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/personas/${persona.id}`)}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
