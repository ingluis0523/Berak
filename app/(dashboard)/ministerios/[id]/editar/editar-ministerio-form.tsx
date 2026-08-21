'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import type { Ministerio, SelectOption } from '@/types'

interface Props {
  ministerio: Ministerio
  lideres: SelectOption[]
}

export function EditarMinisterioForm({ ministerio, lideres }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState(ministerio.nombre)
  const [descripcion, setDescripcion] = useState(ministerio.descripcion ?? '')
  const [liderId, setLiderId] = useState(ministerio.lider_id ?? 'none')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nombre.trim()) {
      setFieldError('El nombre es requerido')
      return
    }
    setFieldError(null)
    setSaving(true)
    setError(null)

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      lider_id: liderId && liderId !== 'none' ? liderId : null,
    }

    const { error: err } = await supabase
      .from('ministerios')
      .update(payload)
      .eq('id', ministerio.id)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }

    router.push(`/ministerios/${ministerio.id}`)
    router.refresh()
  }

  const goBack = () => {
    router.push(`/ministerios/${ministerio.id}`)
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Editar ministerio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Modifica los datos del ministerio</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información del ministerio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Ministerio de Alabanza"
              />
              {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Líder</label>
              <Combobox
                options={[
                  { value: 'none', label: 'Sin líder asignado' },
                  ...lideres,
                ]}
                value={liderId}
                onValueChange={(v) => setLiderId(v)}
                placeholder="Selecciona un líder"
                searchPlaceholder="Buscar persona..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional del ministerio..."
                rows={4}
              />
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
