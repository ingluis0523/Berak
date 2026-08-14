import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/current-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params

  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!serviceRoleKey) return NextResponse.json({ error: 'Service role key no configurada' }, { status: 500 })

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Rol de quien realiza la petición
  const { data: callerUsuario } = await adminClient
    .from('usuarios')
    .select('id, rol_id, rol:roles(nombre)')
    .eq('id', user.id)
    .maybeSingle()

  const callerRolRaw = callerUsuario?.rol
  let callerRolNombre = ((Array.isArray(callerRolRaw) ? callerRolRaw[0] : callerRolRaw) as { nombre: string } | null)?.nombre
  if (!callerRolNombre && callerUsuario?.rol_id) {
    const { data: rData } = await adminClient.from('roles').select('nombre').eq('id', callerUsuario.rol_id).maybeSingle()
    if (rData) callerRolNombre = rData.nombre
  }
  const isCallerSuperAdmin = isSuperAdmin(callerRolNombre)

  const body = await request.json()
  const { rol_id } = body

  // Verificar rol del usuario objetivo
  const { data: targetUsuario } = await adminClient
    .from('usuarios')
    .select('id, rol_id, rol:roles(nombre)')
    .eq('id', id)
    .maybeSingle()

  const targetRolRaw = targetUsuario?.rol
  let targetRolNombre = ((Array.isArray(targetRolRaw) ? targetRolRaw[0] : targetRolRaw) as { nombre: string } | null)?.nombre
  if (!targetRolNombre && targetUsuario?.rol_id) {
    const { data: rData } = await adminClient.from('roles').select('nombre').eq('id', targetUsuario.rol_id).maybeSingle()
    if (rData) targetRolNombre = rData.nombre
  }

  // Si el usuario objetivo es Superadmin y quien llama no lo es, denegar
  if (isSuperAdmin(targetRolNombre) && !isCallerSuperAdmin) {
    return NextResponse.json({ error: 'No tienes permiso para modificar a un Superadministrador' }, { status: 403 })
  }

  // Si el nuevo rol es Superadmin y quien llama no es Superadmin, denegar
  if (rol_id) {
    const { data: newRol } = await adminClient.from('roles').select('nombre').eq('id', rol_id).maybeSingle()
    if (isSuperAdmin(newRol?.nombre) && !isCallerSuperAdmin) {
      return NextResponse.json({ error: 'Solo el superadministrador puede asignar el rol de Superadmin' }, { status: 403 })
    }
  }

  const { error: updateErr } = await adminClient
    .from('usuarios')
    .update({ rol_id: rol_id || null })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
