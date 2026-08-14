'use client'

import { useNuevoEvento } from './hooks/use-nuevo-evento'
import type { Grupo } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

export function NuevoEventoButton() {
  const {
    open,
    setOpen,
    form,
    set,
    grupos,
    loading,
    error,
    handleSubmit,
    openModal,
  } = useNuevoEvento();

  return (
    <>
      <Button onClick={openModal}>
        <Plus size={16} />
        Nuevo evento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Nuevo evento</DialogTitle>
            <DialogDescription>
              Crea un evento puntual. Para eventos recurrentes usa una plantilla.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Nombre del evento"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
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
                    Crear para todos los grupos activos
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

              {/* Fecha */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => set('fecha', e.target.value)}
                />
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Hora inicio</label>
                  <Input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => set('hora_inicio', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Hora fin</label>
                  <Input
                    type="time"
                    value={form.hora_fin}
                    onChange={(e) => set('hora_fin', e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Crear evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
