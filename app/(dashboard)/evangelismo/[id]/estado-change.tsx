'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  personaId: string
  evangelismoId: string
  currentEstadoId: string | null
  estados: { id: string; nombre: string; color: string }[]
}

export function EstadoChange({ personaId, currentEstadoId, estados }: Props) {
  const supabase = createClient()
  const [activeId, setActiveId] = useState(currentEstadoId)
  const [saving,   setSaving]   = useState<string | null>(null)

  const handleChange = async (estado: { id: string; nombre: string; color: string }) => {
    if (estado.id === activeId) return
    setSaving(estado.id)

    await supabase
      .from('personas')
      .update({ estado_persona_id: estado.id, updated_at: new Date().toISOString() })
      .eq('id', personaId)

    await supabase.from('persona_estado_historial').insert({
      persona_id:    personaId,
      estado_id:     estado.id,
      estado_nombre: estado.nombre,
      notas:         'Cambio manual desde evangelismo',
    })

    setActiveId(estado.id)
    setSaving(null)
  }

  if (estados.length === 0) {
    return <p className="text-sm text-gray-400">Sin estados disponibles.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {estados.map(e => {
        const isActive  = e.id === activeId
        const isLoading = saving === e.id
        return (
          <button
            key={e.id}
            onClick={() => handleChange(e)}
            disabled={isLoading || saving !== null}
            className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'border-transparent text-white'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
            } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
            style={isActive ? { backgroundColor: e.color, borderColor: e.color } : undefined}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? 'white' : e.color }}
              />
              {e.nombre}
              {isActive && <span className="ml-auto text-xs opacity-75">Actual</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
