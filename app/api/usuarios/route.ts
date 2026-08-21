import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { isSuperAdmin, getCurrentUser } from '@/lib/current-user'

export async function GET(request: Request) {
  // Verificar que el usuario que llama está autenticado
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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

  // Obtener rol del usuario que realiza la consulta
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

  const currentUser = await getCurrentUser()
  let scopedPersonaIds: string[] = []
  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')
  if (!hasFullAccess && currentUser) {
    const { resolveUserScope } = await import('@/lib/resolve-user-scope')
    const { scopedPersonaIds: resolvedIds } = await resolveUserScope(adminClient, currentUser)
    scopedPersonaIds = resolvedIds
  }

  // Obtener IDs de roles que corresponden a Superadmin
  const { data: allRoles } = await adminClient.from('roles').select('id, nombre')
  const superAdminRoleIds = new Set(
    (allRoles ?? [])
      .filter(r => isSuperAdmin(r.nombre))
      .map(r => r.id)
  )

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10))
  const search = (searchParams.get('search') ?? '').trim()

  const from = (page - 1) * limit
  const to = from + limit - 1

  // Fetch all auth users to map auth_email and last_sign_in_at
  const { data: authUsersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const authMap = new Map<string, { email?: string; last_sign_in_at?: string | null }>()
  for (const u of (authUsersData?.users ?? [])) {
    authMap.set(u.id, {
      email: u.email,
      last_sign_in_at: u.last_sign_in_at ?? null,
    })
  }

  let matchedUserIds: string[] | null = null
  if (search) {
    // Search in persona
    const { data: matchedPersonas } = await adminClient
      .from('personas')
      .select('id')
      .or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%,correo.ilike.%${search}%`)
    const matchedPersonaIds = new Set((matchedPersonas ?? []).map(p => p.id))

    // Search in auth emails
    const matchingAuthIds = new Set<string>()
    for (const [id, info] of authMap.entries()) {
      if (info.email && info.email.toLowerCase().includes(search.toLowerCase())) {
        matchingAuthIds.add(id)
      }
    }

    // Query usuarios where persona_id in matchedPersonaIds OR id in matchingAuthIds
    const { data: uRows } = await adminClient
      .from('usuarios')
      .select('id, persona_id')

    matchedUserIds = (uRows ?? [])
      .filter(u => (u.persona_id && matchedPersonaIds.has(u.persona_id)) || matchingAuthIds.has(u.id))
      .map(u => u.id)
  }

  let query = adminClient
    .from('usuarios')
    .select(`
      *,
      persona:persona_id(id, nombres, apellidos, correo, tipo_persona, lider_id),
      rol:rol_id(id, nombre, activo)
    `, { count: 'exact' })
    .neq('id', user.id) // Excluir al usuario actual en sesión
    .order('created_at', { ascending: false })

  // Si el usuario que consulta NO es superadministrador, ocultar a todos los superadministradores
  if (!isCallerSuperAdmin && superAdminRoleIds.size > 0) {
    for (const sId of superAdminRoleIds) {
      query = query.neq('rol_id', sId)
    }
  }

  if (search) {
    if (matchedUserIds && matchedUserIds.length > 0) {
      query = query.in('id', matchedUserIds)
    } else {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    }
  }

  if (!hasFullAccess) {
    query = query.or(`persona_id.in.(${scopedPersonaIds.join(',')}),persona.lider_id.in.(${scopedPersonaIds.join(',')})`)
  }

  query = query.range(from, to)

  const { data: usuariosData, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const usuariosWithAuthEmail = (usuariosData ?? []).map(u => {
    const authInfo = authMap.get(u.id)
    return {
      ...u,
      auth_email: authInfo?.email ?? undefined,
      ultimo_acceso: u.ultimo_acceso || authInfo?.last_sign_in_at || null,
    }
  })

  return NextResponse.json({
    usuarios: usuariosWithAuthEmail,
    totalCount: count ?? 0,
    page,
    limit,
    is_superadmin: isCallerSuperAdmin,
  })
}

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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Service role key no configurada. Agrega SUPABASE_SERVICE_ROLE_KEY en las variables de entorno' },
      { status: 500 }
    )
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Obtener rol del que crea el usuario
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

  const currentUser = await getCurrentUser()
  let scopedPersonaIds: string[] = []
  const hasFullAccess = currentUser?.is_admin || (currentUser?.permisos ?? []).includes('acceso_todas_redes')
  if (!hasFullAccess && currentUser) {
    const { resolveUserScope } = await import('@/lib/resolve-user-scope')
    const { scopedPersonaIds: resolvedIds } = await resolveUserScope(adminClient, currentUser)
    scopedPersonaIds = resolvedIds
  }

  if (!hasFullAccess) {
    if (!persona_id) {
      return NextResponse.json(
        { error: 'Debe asociar el usuario a una persona bajo su cargo' },
        { status: 400 }
      )
    }
    const { data: targetPersona } = await adminClient
      .from('personas')
      .select('id, lider_id')
      .eq('id', persona_id)
      .maybeSingle()

    const isAllowed = targetPersona && (
      scopedPersonaIds.includes(targetPersona.id) ||
      (targetPersona.lider_id && scopedPersonaIds.includes(targetPersona.lider_id))
    )

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'No tiene permisos para crear un usuario para esta persona' },
        { status: 403 }
      )
    }
  }

  // Si intentan asignar rol de superadmin y no son superadmin, bloquear
  if (rol_id) {
    const { data: requestedRole } = await adminClient.from('roles').select('nombre').eq('id', rol_id).maybeSingle()
    if (isSuperAdmin(requestedRole?.nombre) && !isCallerSuperAdmin) {
      return NextResponse.json(
        { error: 'Solo el superadministrador puede crear usuarios con el rol de Superadmin' },
        { status: 403 }
      )
    }
  }

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

  // Obtener datos de la persona vinculada y actualizar correo si está vacío
  let nombrePersona: string | undefined
  if (persona_id) {
    const { data: persona } = await adminClient
      .from('personas')
      .select('nombres, correo')
      .eq('id', persona_id)
      .maybeSingle()
    if (persona?.nombres) nombrePersona = persona.nombres
    if (!persona?.correo) {
      await adminClient
        .from('personas')
        .update({ correo: email, updated_at: new Date().toISOString() })
        .eq('id', persona_id)
    }
  }

  // Enviar email de bienvenida (no bloqueante — si falla, el usuario ya fue creado)
  sendWelcomeEmail({ to: email, email, password, nombre: nombrePersona }).catch(
    (err) => console.error('Welcome email failed:', err)
  )

  return NextResponse.json({ success: true, userId })
}
