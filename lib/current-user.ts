import { createClient } from '@/lib/supabase/server'

export interface CurrentUser {
  id: string
  persona_id: string | null
  rol: { id: string; nombre: string } | null
  permisos: string[]
  is_admin: boolean
  hasPermission: (perm: string) => boolean
  /** Returns true if the user can see a given module in the sidebar/app.
   *  - Admins always have access.
   *  - Users with a role that has NO permissions configured → unrestricted (see all non-admin modules).
   *  - Users with a role that HAS explicit permissions → only see permitted modules.
   *  Permission names follow the convention "<module>_leer" or "<module>_escribir".
   */
  canSeeModule: (module: string) => boolean
}

const ADMIN_ROLES = ['super admin', 'pastor', 'secretaria', 'administrador', 'admin', 'lider', 'líder']

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

  let permisos: string[] = []
  if (usuario.rol_id) {
    const { data: rps } = await supabase
      .from('rol_permisos')
      .select('permiso:permisos(nombre)')
      .eq('rol_id', usuario.rol_id)

    permisos = (rps ?? []).flatMap((rp) => {
      const p = rp.permiso as { nombre: string }[] | { nombre: string } | null
      if (!p) return []
      if (Array.isArray(p)) return p.map((x) => x.nombre)
      return [p.nombre]
    })
  }

  const is_admin = !!(rol && ADMIN_ROLES.includes(rol.nombre.toLowerCase()))

  // If role has no permissions configured → treat as unrestricted (show all non-admin modules).
  // If role has explicit permissions → only the modules whose "_leer" perm is present.
  const canSeeModule = (module: string): boolean => {
    if (is_admin) return true
    if (permisos.length === 0) return true
    return permisos.some(
      (p) => p === `${module}_leer` || p === `${module}_escribir` || p === `${module}.*` || p === '*'
    )
  }

  return {
    id: user.id,
    persona_id: usuario.persona_id as string | null,
    rol,
    permisos,
    is_admin,
    hasPermission: (perm: string) => is_admin || permisos.includes(perm),
    canSeeModule,
  }
}
