import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EditarPersonaForm } from './editar-persona-form'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('personas')
    .select('nombres, apellidos')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return { title: data ? `Editar · ${data.nombres} ${data.apellidos}` : 'Editar Persona' }
}

export default async function EditarPersonaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: persona }, { data: estados }, { data: lideres }] = await Promise.all([
    supabase
      .from('personas')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
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
      .neq('id', id)
      .order('nombres'),
  ])

  if (!persona) notFound()

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href={`/personas/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={15} />
        Volver a {persona.nombres} {persona.apellidos}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Persona</h1>
        <p className="text-sm text-gray-500">
          Modifica los datos de {persona.nombres} {persona.apellidos}.
        </p>
      </div>
      <EditarPersonaForm
        persona={persona}
        estados={(estados ?? []).map((e) => ({ value: e.id, label: e.nombre }))}
        lideres={(lideres ?? []).map((l) => ({
          value: l.id,
          label: `${l.nombres} ${l.apellidos}`,
        }))}
      />
    </div>
  )
}
