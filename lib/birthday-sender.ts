import { createClient } from '@supabase/supabase-js'
import { sendBirthdayEmail } from '@/lib/email'

export interface BirthdaySendResult {
  sent: number
  failed: number
  skipped: number
  total: number
  date: string
  errors: string[]
}

// Creates a service-role Supabase client and runs birthday sends for the given date.
// date: 'YYYY-MM-DD' — defaults to today in Colombia time
export async function runBirthdaySends(date?: string): Promise<BirthdaySendResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Resolve target date
  let targetDate: Date
  if (date) {
    targetDate = new Date(date + 'T12:00:00')
  } else {
    // Colombia time (UTC-5)
    targetDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  }

  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')
  const year = targetDate.getFullYear()
  const mmdd = `${month}-${day}`
  const dateStr = `${year}-${mmdd}`

  // fecha_nacimiento is type 'date', so we can't use ilike.
  // Use filter with cast to text: fecha_nacimiento::text ilike '%-MM-DD'
  const { data: personas, error: personasErr } = await supabase
    .from('personas')
    .select('id, nombres, apellidos, correo, fecha_nacimiento')
    .not('correo', 'is', null)
    .is('deleted_at', null)
    .not('fecha_nacimiento', 'is', null)

  if (personasErr) throw new Error(personasErr.message)

  // Filter by MM-DD in application code (avoids ilike on date column)
  const birthdayPersonas = (personas ?? []).filter((p) => {
    if (!p.fecha_nacimiento) return false
    const parts = String(p.fecha_nacimiento).split('-')
    return parts.length >= 3 && `${parts[1]}-${parts[2]}` === mmdd
  })

  if (birthdayPersonas.length === 0) {
    return { sent: 0, failed: 0, skipped: 0, total: 0, date: dateStr, errors: [] }
  }

  // Check which ones already received a SUCCESSFUL email this year
  const personaIds = birthdayPersonas.map((p) => p.id)
  const { data: existingLogs } = await supabase
    .from('birthday_logs')
    .select('persona_id, error')
    .in('persona_id', personaIds)
    .eq('anio', year)

  // Only skip if previously sent without error — retry failed attempts
  const alreadySentIds = new Set(
    (existingLogs ?? []).filter((l) => !l.error).map((l) => l.persona_id)
  )
  const toSend = birthdayPersonas.filter((p) => !alreadySentIds.has(p.id))

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const persona of toSend) {
    if (!persona.correo) continue

    let sendError: string | null = null

    try {
      const result = await sendBirthdayEmail({
        to: persona.correo,
        nombre: persona.nombres,
        apellidos: persona.apellidos,
      })

      if ('error' in result && result.error) {
        sendError = String(result.error)
        failed++
        errors.push(`${persona.nombres} ${persona.apellidos}: ${sendError}`)
      } else {
        sent++
      }
    } catch (err) {
      sendError = err instanceof Error ? err.message : 'Unknown error'
      failed++
      errors.push(`${persona.nombres} ${persona.apellidos}: ${sendError}`)
    }

    // Log the attempt — upsert so retries don't create duplicates
    await supabase.from('birthday_logs').upsert(
      {
        persona_id: persona.id,
        anio: year,
        correo: persona.correo,
        enviado_at: new Date().toISOString(),
        error: sendError,
      },
      { onConflict: 'persona_id,anio' }
    )
  }

  return {
    sent,
    failed,
    skipped: alreadySentIds.size,
    total: birthdayPersonas.length,
    date: dateStr,
    errors,
  }
}
