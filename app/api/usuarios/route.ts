import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verificar que el usuario que llama está autenticado
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { email, password, persona_id, rol_id } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
  }

  // Usar service role key (solo servidor)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Service role key no configurada. Agrega SUPABASE_SERVICE_ROLE_KEY en .env.local' },
      { status: 500 }
    )
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Crear usuario sin enviar email de confirmación
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // true = confirmado automáticamente, sin email
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'No se pudo obtener el ID del usuario creado' }, { status: 500 })
  }

  // Crear registro en tabla usuarios
  const { error: dbError } = await adminClient
    .from('usuarios')
    .upsert({ id: userId, persona_id: persona_id || null, rol_id: rol_id || null, estado: true })

  if (dbError) {
    // Si falla la tabla usuarios, eliminar el usuario auth para no dejar huérfanos
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId })
}
