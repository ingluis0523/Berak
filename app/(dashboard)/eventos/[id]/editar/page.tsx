import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditarEventoForm } from './editar-evento-form'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('eventos').select('nombre').eq('id', id).maybeSingle()
  return { title: data ? `Editar · ${data.nombre}` : 'Editar Evento' }
}

export default async function EditarEventoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: evento }, { data: grupos }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('grupos')
      .select('id, nombre')
      .is('deleted_at', null)
      .eq('estado', true)
      .order('nombre'),
  ])

  if (!evento) notFound()

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Evento</h1>
        <p className="text-sm text-gray-500">Modifica los datos de {evento.nombre}.</p>
      </div>
      <EditarEventoForm
        evento={evento}
        grupos={(grupos ?? []).map((g) => ({ value: g.id, label: g.nombre }))}
      />
    </div>
  )
}
