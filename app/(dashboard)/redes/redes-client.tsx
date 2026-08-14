'use client'

import { useRedes } from './hooks/use-redes'
import type { Red, Persona } from '@/types'
import Link from 'next/link'
import { Plus, Pencil, PowerOff, Users, Network, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  canCrear: boolean
  canEditar: boolean
  canToggle: boolean
  /** null = show all | UUID = show only that red | undefined = show nothing */
  filterRedId: string | null | undefined
}

export default function RedesClient({ canCrear, canEditar, canToggle, filterRedId }: Props) {
  const {
    redes,
    lideres,
    loading,
    saving,
    error,
    modalOpen,
    setModalOpen,
    editingRed,
    form,
    setForm,
    formErrors,
    openCreate,
    openEdit,
    handleSave,
    handleToggleEstado,
    nombrePersona,
  } = useRedes({ filterRedId });

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
                  <Link href={`/redes/${red.id}`} className="hover:text-blue-700">
                    <CardTitle className="text-base font-semibold text-gray-900 leading-tight hover:text-blue-700 transition-colors">
                      {red.nombre}
                    </CardTitle>
                  </Link>
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
                  <Button variant="outline" size="sm" asChild className="w-full gap-1">
                    <Link href={`/redes/${red.id}`}>
                      <ChevronRight className="h-3.5 w-3.5" />
                      Ver detalle
                    </Link>
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
              <Combobox
                options={[
                  { value: 'none', label: 'Sin líder asignado' },
                  ...lideres.map((l) => ({ value: l.id, label: `${l.nombres} ${l.apellidos}` })),
                ]}
                value={form.lider_id || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, lider_id: v }))}
                placeholder="Selecciona un líder"
                searchPlaceholder="Buscar persona..."
              />
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

    </div>
  )
}
