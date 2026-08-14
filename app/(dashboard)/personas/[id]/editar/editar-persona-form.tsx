'use client'

import { useEditarPersona } from '../../hooks/use-editar-persona'
import { TIPO_OPTIONS } from '../../hooks/use-nueva-persona'
import type { Persona, SelectOption } from '@/types'
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

interface Props {
  persona: Persona
  estados: SelectOption[]
  lideres: SelectOption[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditarPersonaForm({ persona, estados, lideres }: Props) {
  const {
    serverError,
    loading,
    register,
    handleSubmit,
    errors,
    onSubmit,
    watch,
    goBack,
  } = useEditarPersona({ persona });

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
            <Combobox
              options={[{ value: 'none', label: 'Sin líder' }, ...lideres]}
              value={watch('lider_id') || undefined}
              onValueChange={(v) => setValue('lider_id', v)}
              placeholder="Sin líder asignado"
            />
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
          onClick={goBack}
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
