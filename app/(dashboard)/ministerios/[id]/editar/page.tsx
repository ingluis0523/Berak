import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { EditarMinisterioForm } from './editar-ministerio-form'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('ministerios')
    .select('nombre')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return { title: data ? `Editar · ${data.nombre}` : 'Editar Ministerio' }
}

export default async function EditarMinisterioPage({ params }: Props) {
  const { id } = await params
  const [supabase, currentUser] = await Promise.all([createClient(), getCurrentUser()])

  const [{ data: ministerio }, { data: personas }] = await Promise.all([
    supabase
      .from('ministerios')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('personas')
      .select('id, nombres, apellidos')
      .neq('tipo_persona', 'visitante')
      .is('deleted_at', null)
      .order('nombres'),
  ])

  if (!ministerio) notFound()

  const canEditar = currentUser?.hasPermission('editar_ministerios') ?? true

  if (!canEditar) {
    notFound()
  }

  return (
    <div className="space-y-5 w-full max-w-2xl mx-auto">
      <EditarMinisterioForm
        ministerio={ministerio}
        lideres={(personas ?? []).map((p) => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos}`,
        }))}
      />
    </div>
  )
}
