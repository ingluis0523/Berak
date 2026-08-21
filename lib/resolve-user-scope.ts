import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveUserScope(supabase: SupabaseClient, currentUser: any) {
  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')

  let myGroupIds: string[] = []
  let scopedPersonaIds: string[] = []

  if (hasFullAccess) {
    return { hasFullAccess, myGroupIds, scopedPersonaIds }
  }

  // 1. Resolve direct groups and roles
  if (currentUser?.is_encargado_red && currentUser.red_id) {
    // Encargado de red → all groups in their network
    const { data: networkGroups } = await supabase
      .from('grupos')
      .select('id, lider_id, sublider_id, anfitrion_id')
      .eq('red_id', currentUser.red_id)
      .is('deleted_at', null)
    myGroupIds = (networkGroups ?? []).map((g) => g.id)
    const roleIds = (networkGroups ?? [])
      .flatMap((g) => [g.lider_id, g.sublider_id, g.anfitrion_id])
      .filter(Boolean) as string[]
    
    let memberIds: string[] = []
    if (myGroupIds.length > 0) {
      const { data: miembroRows } = await supabase
        .from('grupo_miembros')
        .select('persona_id')
        .in('grupo_id', myGroupIds)
        .eq('activo', true)
      memberIds = (miembroRows ?? []).map((m) => m.persona_id as string)
    }

    const startingLiders = Array.from(new Set([currentUser.persona_id, ...roleIds, ...memberIds].filter(Boolean) as string[]))
    scopedPersonaIds = [...startingLiders]
  } else {
    // Regular group leader or member
    const liderIds = currentUser?.lider_grupo_ids ?? []
    const miembroIds = currentUser?.miembro_grupo_ids ?? []
    myGroupIds = Array.from(new Set([...liderIds, ...miembroIds]))

    let roleIds: string[] = []
    if (myGroupIds.length > 0) {
      const { data: groupRoles } = await supabase
        .from('grupos')
        .select('lider_id, sublider_id, anfitrion_id')
        .in('id', myGroupIds)
        .is('deleted_at', null)
      roleIds = (groupRoles ?? [])
        .flatMap((g) => [g.lider_id, g.sublider_id, g.anfitrion_id])
        .filter(Boolean) as string[]
    }

    let memberIds: string[] = []
    if (myGroupIds.length > 0) {
      const { data: miembroRows } = await supabase
        .from('grupo_miembros')
        .select('persona_id')
        .in('grupo_id', myGroupIds)
        .eq('activo', true)
      memberIds = (miembroRows ?? []).map((m) => m.persona_id as string)
    }

    const startingLiders = Array.from(new Set([currentUser?.persona_id, ...roleIds, ...memberIds].filter(Boolean) as string[]))
    scopedPersonaIds = [...startingLiders]
  }

  if (scopedPersonaIds.length === 0) {
    scopedPersonaIds = ['00000000-0000-0000-0000-000000000000']
  }

  return { hasFullAccess, myGroupIds, scopedPersonaIds }
}
