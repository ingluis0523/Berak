import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, getInitials } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cake, Users, MailCheck, CalendarDays } from 'lucide-react'
import { BirthdayTrigger } from './birthday-trigger'

export const metadata: Metadata = { title: 'Cumpleaños' }

export default async function CumpleanosPage() {
  const supabase = await createClient()

  // Today in Colombia time
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayMonth = pad(now.getMonth() + 1)
  const todayDay = pad(now.getDate())
  const todayYear = now.getFullYear()
  const todayMmdd = `${todayMonth}-${todayDay}`

  // All personas with registered birthdays
  const { data: allPersonas } = await supabase
    .from('personas')
    .select('id, nombres, apellidos, correo, fecha_nacimiento')
    .not('fecha_nacimiento', 'is', null)
    .is('deleted_at', null)
    .order('nombres')

  // Birthday logs for current year (who already received the email)
  const { data: logsAnio } = await supabase
    .from('birthday_logs')
    .select('persona_id, correo, enviado_at, error, anio')
    .eq('anio', todayYear)
    .order('enviado_at', { ascending: false })

  const sentIds = new Set((logsAnio ?? []).filter((l) => !l.error).map((l) => l.persona_id))
  const logsByPersona = Object.fromEntries((logsAnio ?? []).map((l) => [l.persona_id, l]))

  // Compute upcoming birthdays in the next 30 days (wraps year boundary)
  type PersonaWithBirthday = {
    id: string; nombres: string; apellidos: string; correo: string | null
    fecha_nacimiento: string; daysUntil: number; isToday: boolean; turnsAge: number | null
  }

  const upcoming: PersonaWithBirthday[] = []

  for (const p of allPersonas ?? []) {
    const fn = p.fecha_nacimiento!
    const [, fnMonth, fnDay] = fn.split('-')
    if (!fnMonth || !fnDay) continue

    // Compute days until next birthday (0 = today, positive = future, handles year wrap)
    const thisYearBday = new Date(todayYear, Number(fnMonth) - 1, Number(fnDay))
    const todayNorm = new Date(todayYear, now.getMonth(), now.getDate())
    let diff = Math.round((thisYearBday.getTime() - todayNorm.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) diff += 365 // wrap to next year

    if (diff <= 30) {
      const birthYear = fn.split('-')[0]
      const turnsAge = birthYear ? todayYear - Number(birthYear) + (diff > 0 ? 1 : 0) : null
      upcoming.push({
        ...p,
        fecha_nacimiento: fn,
        daysUntil: diff,
        isToday: diff === 0,
        turnsAge,
      })
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil)

  // Today's birthdays specifically
  const todayBirthdays = upcoming.filter((p) => p.isToday)

  // Stats
  const totalConCumple = (allPersonas ?? []).length
  const totalEnviadosAnio = (logsAnio ?? []).filter((l) => !l.error).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cake size={24} className="text-pink-500" />
            Cumpleaños
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Correos automáticos de felicitación · Se envían diariamente a las 9am (Colombia)
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Envío manual (hoy)</p>
          <BirthdayTrigger />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Users size={12} /> Con fecha registrada
            </p>
            <p className="text-2xl font-bold text-gray-900">{totalConCumple}</p>
            <p className="text-xs text-gray-400 mt-0.5">personas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Cake size={12} /> Hoy
            </p>
            <p className="text-2xl font-bold text-pink-600">{todayBirthdays.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{todayMmdd.replace('-', '/')} · cumpleaños</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <MailCheck size={12} /> Enviados {todayYear}
            </p>
            <p className="text-2xl font-bold text-green-700">{totalEnviadosAnio}</p>
            <p className="text-xs text-gray-400 mt-0.5">correos este año</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming birthdays */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays size={16} />
            Próximos 30 días ({upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              No hay cumpleaños registrados en los próximos 30 días
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcoming.map((p) => {
                const log = logsByPersona[p.id]
                const emailSent = sentIds.has(p.id)
                return (
                  <li key={p.id} className={`flex items-center gap-3 px-5 py-3 ${p.isToday ? 'bg-pink-50' : ''}`}>
                    <div className={`h-9 w-9 shrink-0 rounded-full text-white text-xs font-semibold flex items-center justify-center ${p.isToday ? 'bg-pink-500' : 'bg-blue-800'}`}>
                      {getInitials(p.nombres, p.apellidos)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/personas/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-700 truncate block">
                        {p.nombres} {p.apellidos}
                        {p.turnsAge !== null && (
                          <span className="text-gray-400 font-normal ml-1 text-xs">· {p.turnsAge} años</span>
                        )}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {p.isToday
                          ? '🎂 ¡Hoy!'
                          : `En ${p.daysUntil} día${p.daysUntil !== 1 ? 's' : ''}`
                        }
                        {' · '}
                        {new Date(p.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })}
                        {p.correo
                          ? <span className="text-green-600 ml-1">· ✉ {p.correo}</span>
                          : <span className="text-red-400 ml-1">· Sin correo</span>
                        }
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {p.isToday && (
                        emailSent
                          ? <Badge variant="success" className="text-xs">Enviado</Badge>
                          : p.correo
                          ? <Badge variant="programado" className="text-xs">Pendiente</Badge>
                          : <Badge variant="cancelado" className="text-xs">Sin correo</Badge>
                      )}
                      {!p.isToday && log && (
                        <Badge variant="success" className="text-xs">✓ {new Date(log.enviado_at).getFullYear()}</Badge>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Log de envíos del año */}
      {(logsAnio ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MailCheck size={16} />
              Log de envíos {todayYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Persona</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Correo</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha envío</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(logsAnio ?? []).map((log) => {
                    const persona = (allPersonas ?? []).find((p) => p.id === log.persona_id)
                    return (
                      <tr key={log.persona_id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {persona ? (
                            <Link href={`/personas/${persona.id}`} className="hover:text-blue-700">
                              {persona.nombres} {persona.apellidos}
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-xs">ID: {log.persona_id.slice(0, 8)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{log.correo}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(log.enviado_at)}</td>
                        <td className="px-4 py-3">
                          {log.error ? (
                            <span className="inline-flex items-center text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full" title={log.error}>
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              Enviado
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
