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
import type { Red, SelectOption } from '@/types'

interface Props {
  red: Red
  lideres: SelectOption[]
}

export function EditarRedForm({ red, lideres }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState(red.nombre)
  const [descripcion, setDescripcion] = useState(red.descripcion ?? '')
  const [liderId, setLiderId] = useState(red.lider_id ?? 'none')
  
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
      .from('redes')
      .update(payload)
      .eq('id', red.id)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }

    router.push(`/redes/${red.id}`)
    router.refresh()
  }

  const goBack = () => {
    router.push(`/redes/${red.id}`)
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
          <h1 className="text-2xl font-bold text-gray-900">Editar red</h1>
          <p className="text-sm text-gray-500 mt-0.5">Modifica los datos de la red</p>
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
            <CardTitle className="text-base">Información de la red</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Red Norte"
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
                placeholder="Descripción opcional de la red..."
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
