import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/current-user'
import { NuevaPersonaForm } from './nueva-persona-form'

export const metadata: Metadata = { title: 'Nueva Persona' }

export default async function NuevaPersonaPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')

  // Build a scoped list of persona IDs visible to this user (for the lider dropdown).
  // Mirrors the same logic used in personas/page.tsx.
  let scopedIds: string[] | null = null

  if (!hasFullAccess && currentUser?.rol) {
    if (currentUser.is_encargado_red && currentUser.red_id) {
      const { data: grupos } = await supabase
        .from('grupos')
        .select('id, lider_id, sublider_id, anfitrion_id')
        .eq('red_id', currentUser.red_id)
        .is('deleted_at', null)
      const grupoIds = (grupos ?? []).map((g) => g.id)
      const roleIds = (grupos ?? [])
        .flatMap((g) => [g.lider_id, g.sublider_id, g.anfitrion_id])
        .filter(Boolean) as string[]
      let memberIds: string[] = []
      if (grupoIds.length > 0) {
        const { data: mRows } = await supabase
          .from('grupo_miembros').select('persona_id')
          .in('grupo_id', grupoIds).eq('activo', true)
        memberIds = (mRows ?? []).map((m) => m.persona_id as string)
      }
      scopedIds = [...new Set([...memberIds, ...roleIds])]
    } else if ((currentUser.lider_grupo_ids ?? []).length > 0) {
      const { data: mRows } = await supabase
        .from('grupo_miembros').select('persona_id')
        .in('grupo_id', currentUser.lider_grupo_ids).eq('activo', true)
      scopedIds = [...new Set((mRows ?? []).map((m) => m.persona_id as string))]
    } else if (currentUser.red_id) {
      const { data: grupos } = await supabase
        .from('grupos').select('id')
        .eq('red_id', currentUser.red_id).is('deleted_at', null)
      const grupoIds = (grupos ?? []).map((g) => g.id)
      if (grupoIds.length > 0) {
        const { data: mRows } = await supabase
          .from('grupo_miembros').select('persona_id')
          .in('grupo_id', grupoIds).eq('activo', true)
        scopedIds = [...new Set((mRows ?? []).map((m) => m.persona_id as string))]
      } else {
        scopedIds = []
      }
    }
  }

  let lideresQuery = supabase
    .from('personas')
    .select('id, nombres, apellidos')
    .is('deleted_at', null)
    .neq('tipo_persona', 'visitante')
    .order('nombres')

  if (scopedIds !== null) {
    const ids = scopedIds.length > 0 ? scopedIds : ['00000000-0000-0000-0000-000000000000']
    lideresQuery = lideresQuery.in('id', ids)
  }

  const [{ data: estados }, { data: lideres }] = await Promise.all([
    supabase.from('estados_persona').select('id, nombre').eq('activo', true).order('orden'),
    lideresQuery,
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
