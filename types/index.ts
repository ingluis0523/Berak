// ─── Core Types for Berak Church Management System ─────────────────────────

export type UUID = string

// ─── Personas ────────────────────────────────────────────────────────────────

export type TipoPersona =
  | 'miembro'
  | 'lider'
  | 'visitante'
  | 'servidor'
  | 'anfitrion'
  | 'pastor'
  | 'sublider'
  | 'anciano'

export interface EstadoPersona {
  id: UUID
  nombre: string
  descripcion: string | null
  color: string | null
  orden: number
  activo: boolean
  created_at: string
}

export interface Persona {
  id: UUID
  nombres: string
  apellidos: string
  telefono: string | null
  correo: string | null
  direccion: string | null
  fecha_nacimiento: string | null
  fecha_registro: string
  estado_persona_id: UUID | null
  estado_persona?: EstadoPersona
  lider_id: UUID | null
  lider?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  observaciones: string | null
  tipo_persona: TipoPersona
  foto_url: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface PersonaFormData {
  nombres: string
  apellidos: string
  telefono?: string
  correo?: string
  direccion?: string
  fecha_nacimiento?: string
  estado_persona_id?: string
  lider_id?: string
  observaciones?: string
  tipo_persona: TipoPersona
}

// ─── Roles & Permisos ─────────────────────────────────────────────────────────

export interface Permiso {
  id: UUID
  nombre: string
  modulo: string
  descripcion: string | null
  created_at: string
}

export interface Rol {
  id: UUID
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  permisos?: Permiso[]
}

export interface RolPermiso {
  id: UUID
  rol_id: UUID
  permiso_id: UUID
  permiso?: Permiso
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export interface Usuario {
  id: UUID
  persona_id: UUID | null
  rol_id: UUID | null
  estado: boolean
  ultimo_acceso: string | null
  created_at: string
  updated_at: string
  persona?: Persona
  rol?: Rol
}

// ─── Redes ────────────────────────────────────────────────────────────────────

export interface Red {
  id: UUID
  nombre: string
  lider_id: UUID | null
  descripcion: string | null
  estado: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  lider?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  grupos_count?: number
}

// ─── Grupos ───────────────────────────────────────────────────────────────────

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo'

export interface Grupo {
  id: UUID
  nombre: string
  lider_id: UUID | null
  sublider_id: UUID | null
  anfitrion_id: UUID | null
  red_id: UUID | null
  direccion: string | null
  dia_reunion: DiaSemana | null
  hora_reunion: string | null
  estado: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  lider?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  sublider?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  anfitrion?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  red?: Pick<Red, 'id' | 'nombre'>
  miembros_count?: number
}

export interface GrupoMiembro {
  id: UUID
  grupo_id: UUID
  persona_id: UUID
  fecha_ingreso: string
  fecha_salida: string | null
  activo: boolean
  created_at: string
  persona?: Persona
  grupo?: Grupo
}

// ─── Ministerios ──────────────────────────────────────────────────────────────

export interface Ministerio {
  id: UUID
  nombre: string
  lider_id: UUID | null
  descripcion: string | null
  estado: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  lider?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  miembros_count?: number
}

export interface PersonaMinisterio {
  id: UUID
  persona_id: UUID
  ministerio_id: UUID
  fecha_ingreso: string
  fecha_salida: string | null
  activo: boolean
  created_at: string
  persona?: Persona
  ministerio?: Ministerio
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export type FrecuenciaEvento = 'unico' | 'semanal' | 'quincenal' | 'mensual'
export type EstadoEvento = 'programado' | 'realizado' | 'cancelado'

export interface EventoPlantilla {
  id: UUID
  nombre: string
  grupo_id: UUID | null
  frecuencia: FrecuenciaEvento
  intervalo: number
  fecha_inicio: string
  fecha_fin: string | null
  hora_inicio: string | null
  hora_fin: string | null
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
  grupo?: Pick<Grupo, 'id' | 'nombre'>
}

export interface Evento {
  id: UUID
  plantilla_id: UUID | null
  grupo_id: UUID | null
  nombre: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  estado: EstadoEvento
  descripcion: string | null
  created_at: string
  updated_at: string
  plantilla?: EventoPlantilla
  grupo?: Pick<Grupo, 'id' | 'nombre'>
  asistencias_count?: number
}

// ─── Asistencias ──────────────────────────────────────────────────────────────

export type EstadoAsistencia = 'asistio' | 'no_asistio' | 'visitante' | 'primera_vez'

export interface Asistencia {
  id: UUID
  evento_id: UUID
  persona_id: UUID | null
  estado: EstadoAsistencia
  es_visitante: boolean
  nombre_visitante: string | null
  telefono_visitante: string | null
  notas: string | null
  registrado_por: UUID | null
  created_at: string
  updated_at: string
  persona?: Persona
  evento?: Pick<Evento, 'id' | 'nombre' | 'fecha'>
}

// ─── Automatizaciones ─────────────────────────────────────────────────────────

export type TipoRegla =
  | 'ausencias_consecutivas'
  | 'dias_sin_asistir'
  | 'asistencias_acumuladas'
  | 'ingreso_ministerio'

export interface ReglaAutomatizacion {
  id: UUID
  nombre: string
  tipo: TipoRegla
  condicion_valor: number | null
  accion: string
  estado_resultado_id: UUID | null
  activo: boolean
  created_at: string
  estado_resultado?: EstadoPersona
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface TableFilter {
  search?: string
  estado?: string
  tipo?: string
  red_id?: string
  grupo_id?: string
  [key: string]: string | undefined
}

// ─── Evangelismo ──────────────────────────────────────────────────────────────

export type TipoSeguimiento = 'contacto' | 'visita' | 'reunion' | 'oracion' | 'otro'
export type ResultadoSeguimiento = 'positivo' | 'neutral' | 'pendiente' | 'sin_respuesta'

export interface Evangelismo {
  id: UUID
  persona_id: UUID
  evangelizador_id: UUID | null
  encargado_id: UUID | null
  fecha_evangelismo: string
  lugar: string | null
  notas: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  persona?: Pick<Persona, 'id' | 'nombres' | 'apellidos' | 'foto_url' | 'estado_persona_id'> & {
    estado_persona?: Pick<EstadoPersona, 'id' | 'nombre' | 'color'> | null
  }
  evangelizador?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  encargado?: Pick<Persona, 'id' | 'nombres' | 'apellidos'>
  seguimientos?: EvangelismoSeguimiento[]
}

export interface EvangelismoSeguimiento {
  id: UUID
  evangelismo_id: UUID
  fecha: string
  tipo: TipoSeguimiento
  descripcion: string | null
  responsable_id: UUID | null
  resultado: ResultadoSeguimiento | null
  created_at: string
  responsable?: Pick<Persona, 'id' | 'nombres' | 'apellidos'> | null
}

export interface PersonaEstadoHistorial {
  id: UUID
  persona_id: UUID
  estado_id: UUID | null
  estado_nombre: string | null
  cambiado_por: UUID | null
  notas: string | null
  created_at: string
}
