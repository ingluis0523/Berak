import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runBirthdaySends } from '@/lib/birthday-sender'

// Manual trigger — admin only, protected by session
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify admin via rol name (same logic as getCurrentUser)
  const ADMIN_ROLES = ['super admin', 'pastor', 'secretaria', 'administrador', 'admin']
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol:roles(nombre)')
    .eq('id', user.id)
    .maybeSingle()

  const rolRaw = usuario?.rol
  const rol = (Array.isArray(rolRaw) ? rolRaw[0] : rolRaw) as { nombre: string } | null
  const isAdmin = !!(rol && ADMIN_ROLES.includes(rol.nombre.toLowerCase()))

  if (!isAdmin) {
    return NextResponse.json({ error: 'Solo administradores pueden ejecutar esto' }, { status: 403 })
  }

  try {
    const result = await runBirthdaySends()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
