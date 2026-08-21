import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { EditarRedForm } from './editar-red-form'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('redes')
    .select('nombre')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return { title: data ? `Editar · ${data.nombre}` : 'Editar Red' }
}

export default async function EditarRedPage({ params }: Props) {
  const { id } = await params
  const [supabase, currentUser] = await Promise.all([createClient(), getCurrentUser()])

  const [{ data: red }, { data: personas }] = await Promise.all([
    supabase
      .from('redes')
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

  if (!red) notFound()

  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')
  const canEditar = currentUser?.hasPermission('editar_redes') ?? true

  if (!canEditar) {
    notFound()
  }

  if (!hasFullAccess) {
    const hasRole = !!currentUser?.rol
    const hasPersona = !!currentUser?.persona_id
    if (hasRole && hasPersona && currentUser?.red_id !== id) {
      notFound()
    }
  }

  return (
    <div className="space-y-5 w-full max-w-2xl mx-auto">
      <EditarRedForm
        red={red}
        lideres={(personas ?? []).map((p) => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos}`,
        }))}
      />
    </div>
  )
}
