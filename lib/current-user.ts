import { createClient } from '@/lib/supabase/server'

export interface CurrentUser {
  id: string
  persona_id: string | null
  rol: { id: string; nombre: string } | null
  permisos: string[]
  is_admin: boolean
  hasPermission: (perm: string) => boolean
}

const ADMIN_ROLES = ['Super Admin', 'Pastor', 'Secretaria']

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

  const is_admin = !!(rol && ADMIN_ROLES.includes(rol.nombre))

  return {
    id: user.id,
    persona_id: usuario.persona_id as string | null,
    rol,
    permisos,
    is_admin,
    hasPermission: (perm: string) => is_admin || permisos.includes(perm),
  }
}
