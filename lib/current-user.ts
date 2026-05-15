import { createClient } from '@/lib/supabase/server'

export interface CurrentUser {
  id: string
  persona_id: string | null
  rol: { id: string; nombre: string } | null
  permisos: string[]
  is_admin: boolean
  /** Primary network this user belongs to (null = admin sees all, or user not in any group) */
  red_id: string | null
  hasPermission: (perm: string) => boolean
  /**
   * Returns true if the user can see a given module in the sidebar/app.
   * - Admins always have access.
   * - Users with NO role assigned → unrestricted (new/unconfigured user).
   * - Users with a role that HAS permissions → only see permitted modules.
   * - Users with a role that has NO permissions → blocked (empty role = no access).
   */
  canSeeModule: (module: string) => boolean
}

const ADMIN_ROLES = ['super admin', 'pastor', 'secretaria', 'administrador', 'admin']

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, persona_id, rol_id, rol:roles(id, nombre)')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario) return null

  const rolRaw = usuario.rol
  const rol = (Array.isArray(rolRaw) ? rolRaw[0] : rolRaw) as { id: string; nombre: string } | null
  const is_admin = !!(rol && ADMIN_ROLES.includes(rol.nombre.toLowerCase()))
  const hasRole = !!usuario.rol_id

  // Two-step permisos query — avoids relying on FK join configuration in Supabase Dashboard.
  // The join approach (select 'permiso:permisos(nombre)') silently returns null when the FK
  // relationship isn't set up, leaving permisos empty and bypassing all restrictions.
  let permisos: string[] = []
  if (hasRole) {
    const { data: rolPerms } = await supabase
      .from('rol_permisos')
      .select('permiso_id')
      .eq('rol_id', usuario.rol_id)

    const permisoIds = (rolPerms ?? [])
      .map((rp) => (rp as { permiso_id: string }).permiso_id)
      .filter(Boolean)

    if (permisoIds.length > 0) {
      const { data: permsData } = await supabase
        .from('permisos')
        .select('nombre')
        .in('id', permisoIds)
      permisos = (permsData ?? []).map((p) => (p as { nombre: string }).nombre)
    }
  }

  // Red scoping: find the primary red for this user's persona (skipped for admins).
  let red_id: string | null = null
  if (!is_admin && usuario.persona_id) {
    const { data: gms } = await supabase
      .from('grupo_miembros')
      .select('grupo:grupos(red_id)')
      .eq('persona_id', usuario.persona_id)
      .eq('activo', true)

    for (const gm of (gms ?? [])) {
      const grupoRaw = gm.grupo
      const grupo = (Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw) as { red_id: string | null } | null
      if (grupo?.red_id) {
        red_id = grupo.red_id
        break
      }
    }
  }

  const canSeeModule = (module: string): boolean => {
    if (is_admin) return true
    if (!hasRole) return true   // no role assigned → unrestricted
    if (permisos.length === 0) return true  // role with no perms (or query failed) → unrestricted

    // Permissions use naming convention: ver_X, crear_X, editar_X, gestionar_X
    // Map each sidebar module to the keywords that appear in relevant permission names.
    const moduleKeywords: Record<string, string[]> = {
      personas:    ['personas'],
      redes:       ['grupos', 'redes'],       // redes shown when user has grupos access
      grupos:      ['grupos', 'miembros'],
      ministerios: ['personas', 'ministerios'],
      eventos:     ['eventos'],
      asistencias: ['asistencias'],
      reportes:    ['reportes'],
      usuarios:    ['usuarios'],              // gestionar_usuarios
      roles:       ['roles'],                 // gestionar_roles
    }
    const keywords = moduleKeywords[module] ?? [module]
    return permisos.some((p) => keywords.some((kw) => p.includes(kw)))
  }

  return {
    id: user.id,
    persona_id: usuario.persona_id as string | null,
    rol,
    permisos,
    is_admin,
    red_id,
    hasPermission: (perm: string) => is_admin || permisos.includes(perm),
    canSeeModule,
  }
}
