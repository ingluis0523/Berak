import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

const ADMIN_ROLES = ['super admin', 'pastor', 'secretaria', 'administrador', 'admin']

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params

  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return NextResponse.json({ error: 'Service role key no configurada' }, { status: 500 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify caller is admin
  const { data: callerUsuario } = await adminClient
    .from('usuarios')
    .select('rol:roles(nombre)')
    .eq('id', user.id)
    .maybeSingle()
  const rolRaw = callerUsuario?.rol
  const rol = (Array.isArray(rolRaw) ? rolRaw[0] : rolRaw) as { nombre: string } | null
  if (!rol || !ADMIN_ROLES.includes(rol.nombre.toLowerCase())) {
    return NextResponse.json({ error: 'Solo administradores pueden hacer esto' }, { status: 403 })
  }

  // Get the auth user's email
  const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(id)
  if (authErr || !authData.user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const email = authData.user.email
  if (!email) return NextResponse.json({ error: 'El usuario no tiene email de autenticación' }, { status: 400 })

  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (linkErr || !linkData) {
    return NextResponse.json({ error: linkErr?.message ?? 'Error generando el enlace' }, { status: 500 })
  }

  return NextResponse.json({
    link: linkData.properties?.action_link ?? null,
    email,
  })
}
