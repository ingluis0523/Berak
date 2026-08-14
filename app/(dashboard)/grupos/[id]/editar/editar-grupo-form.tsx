'use client'

import { useEditarGrupo, DIAS } from '../../hooks/use-editar-grupo'
import { ArrowLeft } from 'lucide-react'
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

interface Props {
  grupo: Grupo
  personas: SelectOption[]
  redes: SelectOption[]
}

export function EditarGrupoForm({ grupo, personas, redes }: Props) {
  const {
    saving,
    globalError,
    form,
    errors,
    setField,
    handleLiderChange,
    handleSubmit,
    goBack,
  } = useEditarGrupo({ grupo });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={goBack}
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
            onClick={goBack}
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
