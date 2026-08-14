import { NextResponse } from 'next/server'
import { runBirthdaySends } from '@/lib/birthday-sender'

// Called by Vercel Cron daily at 14:00 UTC (9am Colombia)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!serviceRoleKey) {
    console.error('[cron/cumpleanos] Service role key is not set')
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  try {
    const result = await runBirthdaySends()
    console.log('[cron/cumpleanos] result:', result)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/cumpleanos] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
