import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/current-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params

  // 1. Verify authenticated user
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Verify Superadmin role strictly (only superadmin, not regular admin)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Service role key no configurada' },
      { status: 500 }
    )
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: callerUsuario } = await adminClient
    .from('usuarios')
    .select('id, rol_id, rol:roles(nombre)')
    .eq('id', user.id)
    .maybeSingle()

  const rolRaw = callerUsuario?.rol
  let rolNombre = ((Array.isArray(rolRaw) ? rolRaw[0] : rolRaw) as { nombre: string } | null)?.nombre
  if (!rolNombre && callerUsuario?.rol_id) {
    const { data: rolData } = await adminClient
      .from('roles')
      .select('nombre')
      .eq('id', callerUsuario.rol_id)
      .maybeSingle()
    if (rolData) rolNombre = rolData.nombre
  }

  if (!isSuperAdmin(rolNombre)) {
    return NextResponse.json(
      { error: 'Solo el superadministrador tiene permiso para eliminar personas' },
      { status: 403 }
    )
  }

  // 3. Perform soft delete on the persona
  const now = new Date().toISOString()
  const { error: deleteErr } = await adminClient
    .from('personas')
    .update({
      deleted_at: now,
      updated_at: now,
    })
    .eq('id', id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  // 4. Deactivate group and ministry memberships
  await Promise.all([
    adminClient
      .from('grupo_miembros')
      .update({ activo: false, fecha_salida: now.split('T')[0] })
      .eq('persona_id', id)
      .eq('activo', true),
    adminClient
      .from('persona_ministerios')
      .update({ activo: false, fecha_salida: now.split('T')[0] })
      .eq('persona_id', id)
      .eq('activo', true),
  ])

  return NextResponse.json({ success: true })
}
