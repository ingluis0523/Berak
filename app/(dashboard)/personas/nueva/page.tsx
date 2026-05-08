import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NuevaPersonaForm } from './nueva-persona-form'

export const metadata: Metadata = { title: 'Nueva Persona' }

export default async function NuevaPersonaPage() {
  const supabase = await createClient()

  const [{ data: estados }, { data: lideres }] = await Promise.all([
    supabase
      .from('estados_persona')
      .select('id, nombre')
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('personas')
      .select('id, nombres, apellidos')
      .is('deleted_at', null)
      .neq('tipo_persona', 'visitante')
      .order('nombres'),
  ])

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Persona</h1>
        <p className="text-sm text-gray-500">Completa el formulario para registrar una nueva persona.</p>
      </div>
      <NuevaPersonaForm
        estados={(estados ?? []).map((e) => ({ value: e.id, label: e.nombre }))}
        lideres={(lideres ?? []).map((l) => ({
          value: l.id,
          label: `${l.nombres} ${l.apellidos}`,
        }))}
      />
    </div>
  )
}
