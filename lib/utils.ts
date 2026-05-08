import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date Helpers ──────────────────────────────────────────────────────────────

export function formatDate(date: string | Date | null, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, pattern, { locale: es })
  } catch {
    return '—'
  }
}

export function formatDateLong(date: string | Date | null): string {
  return formatDate(date, "d 'de' MMMM 'de' yyyy")
}

export function formatRelative(date: string | Date | null): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true, locale: es })
  } catch {
    return '—'
  }
}

export function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null
  try {
    return differenceInYears(new Date(), parseISO(fechaNacimiento))
  } catch {
    return null
  }
}

// ─── String Helpers ────────────────────────────────────────────────────────────

export function getNombreCompleto(nombres: string, apellidos: string): string {
  return `${nombres} ${apellidos}`.trim()
}

export function getInitials(nombres: string, apellidos: string): string {
  const n = nombres.trim().charAt(0).toUpperCase()
  const a = apellidos.trim().charAt(0).toUpperCase()
  return `${n}${a}`
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// ─── Color Helpers ─────────────────────────────────────────────────────────────

export const ESTADO_PERSONA_COLORS: Record<string, string> = {
  nuevo:      'bg-blue-100 text-blue-700',
  visitante:  'bg-purple-100 text-purple-700',
  asistente:  'bg-green-100 text-green-700',
  servidor:   'bg-orange-100 text-orange-700',
  inactivo:   'bg-gray-100 text-gray-600',
}

export const TIPO_PERSONA_LABELS: Record<string, string> = {
  miembro:   'Miembro',
  lider:     'Líder',
  visitante: 'Visitante',
  servidor:  'Servidor',
  anfitrion: 'Anfitrión',
  pastor:    'Pastor',
  sublider:  'Sublíder',
  anciano:   'Anciano',
}

export const DIA_LABELS: Record<string, string> = {
  lunes:     'Lunes',
  martes:    'Martes',
  miercoles: 'Miércoles',
  jueves:    'Jueves',
  viernes:   'Viernes',
  sabado:    'Sábado',
  domingo:   'Domingo',
}

export const FRECUENCIA_LABELS: Record<string, string> = {
  unico:     'Único',
  semanal:   'Semanal',
  quincenal: 'Quincenal',
  mensual:   'Mensual',
}

export const ESTADO_EVENTO_LABELS: Record<string, string> = {
  programado: 'Programado',
  realizado:  'Realizado',
  cancelado:  'Cancelado',
}

export const ESTADO_ASISTENCIA_LABELS: Record<string, string> = {
  asistio:     'Asistió',
  no_asistio:  'No asistió',
  visitante:   'Visitante',
  primera_vez: 'Primera vez',
}

// ─── Pagination ─────────────────────────────────────────────────────────────────

export function getRange(page: number, perPage: number): { from: number; to: number } {
  return {
    from: (page - 1) * perPage,
    to: page * perPage - 1,
  }
}
