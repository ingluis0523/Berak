import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MinisterioDetalle from './ministerio-detalle'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('ministerios').select('nombre').eq('id', id).single()
  return { title: data?.nombre ?? 'Ministerio' }
}

export default async function MinisterioPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ministerio } = await supabase
    .from('ministerios')
    .select('*, lider:personas!lider_id(id,nombres,apellidos)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!ministerio) notFound()

  const { data: miembros } = await supabase
    .from('persona_ministerios')
    .select('*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)')
    .eq('ministerio_id', id)
    .eq('activo', true)
    .order('fecha_ingreso', { ascending: false })

  return (
    <MinisterioDetalle
      ministerio={ministerio}
      miembrosIniciales={miembros ?? []}
    />
  )
}
