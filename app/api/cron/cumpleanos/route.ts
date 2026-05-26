import { NextResponse } from 'next/server'
import { runBirthdaySends } from '@/lib/birthday-sender'

// Called by Vercel Cron daily at 14:00 UTC (9am Colombia)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[cron/cumpleanos] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
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
