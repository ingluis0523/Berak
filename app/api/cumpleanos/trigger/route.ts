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

  // Verify admin
  const { data: appUser } = await supabase
    .from('app_usuarios')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!appUser?.is_admin) {
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
