import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditarGrupoForm } from './editar-grupo-form'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('grupos')
    .select('nombre')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return { title: data ? `Editar · ${data.nombre}` : 'Editar Grupo' }
}

export default async function EditarGrupoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: grupo }, { data: personas }, { data: redes }] = await Promise.all([
    supabase
      .from('grupos')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('personas')
      .select('id, nombres, apellidos')
      .is('deleted_at', null)
      .order('nombres'),
    supabase
      .from('redes')
      .select('id, nombre')
      .is('deleted_at', null)
      .eq('estado', true)
      .order('nombre'),
  ])

  if (!grupo) notFound()

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Grupo</h1>
        <p className="text-sm text-gray-500">Modifica los datos de {grupo.nombre}.</p>
      </div>
      <EditarGrupoForm
        grupo={grupo}
        personas={(personas ?? []).map((p) => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos}`,
        }))}
        redes={(redes ?? []).map((r) => ({ value: r.id, label: r.nombre }))}
      />
    </div>
  )
}
