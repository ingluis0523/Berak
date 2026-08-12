// Types for BERAK - IglesiaJCReina

export type TipoPersona =
  | 'miembro'
  | 'lider'
  | 'visitante'
  | 'servidor'
  | 'anfitrion'
  | 'pastor'
  | 'sublider';

export interface EstadoPersona {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface Persona {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  fecha_registro: string;
  estado_persona_id: string | null;
  lider_id: string | null;
  observaciones: string | null;
  tipo_persona: TipoPersona;
  foto_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  estado_persona?: EstadoPersona | null;
  lider?: Persona | null;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
}

export interface Permiso {
  id: string;
  nombre: string;
  modulo: string;
  descripcion: string | null;
  created_at: string;
}

export interface RolPermiso {
  id: string;
  rol_id: string;
  permiso_id: string;
  rol?: Rol | null;
  permiso?: Permiso | null;
}

export interface Usuario {
  id: string;
  persona_id: string | null;
  rol_id: string | null;
  estado: boolean;
  ultimo_acceso: string | null;
  created_at: string;
  updated_at: string;
  persona?: Persona | null;
  rol?: Rol | null;
}

export interface Red {
  id: string;
  nombre: string;
  lider_id: string | null;
  descripcion: string | null;
  estado: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  lider?: Persona | null;
}

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface Grupo {
  id: string;
  nombre: string;
  lider_id: string | null;
  sublider_id: string | null;
  anfitrion_id: string | null;
  red_id: string | null;
  direccion: string | null;
  dia_reunion: DiaSemana | string | null;
  hora_reunion: string | null;
  estado: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  lider?: Persona | null;
  sublider?: Persona | null;
  anfitrion?: Persona | null;
  red?: Red | null;
}

export interface GrupoMiembro {
  id: string;
  grupo_id: string;
  persona_id: string;
  fecha_ingreso: string;
  fecha_salida: string | null;
  activo: boolean;
  created_at: string;
  grupo?: Grupo | null;
  persona?: Persona | null;
}

export interface Ministerio {
  id: string;
  nombre: string;
  lider_id: string | null;
  descripcion: string | null;
  estado: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  lider?: Persona | null;
}

export interface PersonaMinisterio {
  id: string;
  persona_id: string;
  ministerio_id: string;
  fecha_ingreso: string;
  fecha_salida: string | null;
  activo: boolean;
  created_at: string;
  persona?: Persona | null;
  ministerio?: Ministerio | null;
}

export type FrecuenciaEvento = 'unico' | 'semanal' | 'quincenal' | 'mensual';

export interface EventoPlantilla {
  id: string;
  nombre: string;
  grupo_id: string | null;
  frecuencia: FrecuenciaEvento;
  intervalo: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  grupo?: Grupo | null;
}

export type EstadoEvento = 'programado' | 'realizado' | 'cancelado';

export interface Evento {
  id: string;
  plantilla_id: string | null;
  grupo_id: string | null;
  nombre: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: EstadoEvento;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
  grupo?: Grupo | null;
  plantilla?: EventoPlantilla | null;
  asistencias_count?: number;
}

export type EstadoAsistencia = 'asistio' | 'no_asistio' | 'visitante' | 'primera_vez';

export interface Asistencia {
  id: string;
  evento_id: string;
  persona_id: string | null;
  estado: EstadoAsistencia;
  es_visitante: boolean;
  nombre_visitante: string | null;
  telefono_visitante: string | null;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
  evento?: Evento | null;
  persona?: Persona | null;
}

export type TipoRegla =
  | 'ausencias_consecutivas'
  | 'dias_sin_asistir'
  | 'asistencias_acumuladas'
  | 'ingreso_ministerio';

export interface ReglaAutomatizacion {
  id: string;
  nombre: string;
  tipo: TipoRegla;
  condicion_valor: number;
  accion: string;
  estado_resultado_id: string | null;
  activo: boolean;
  created_at: string;
  estado_resultado?: EstadoPersona | null;
}

export interface EvangelismoSeguimiento {
  id: string;
  persona_id: string;
  fecha: string;
  notas: string | null;
  tipo: string;
  resultado: string | null;
  descripcion: string | null;
  created_at: string;
  persona?: Persona | null;
}

export interface PersonaEstadoHistorial {
  id: string;
  persona_id: string;
  estado_anterior_id: string | null;
  estado_nuevo_id: string | null;
  estado_nombre: string | null;
  motivo: string | null;
  notas: string | null;
  created_at: string;
  persona?: Persona | null;
  estado_anterior?: EstadoPersona | null;
  estado_nuevo?: EstadoPersona | null;
}

export interface SelectOption {
  value: string;
  label: string;
}
