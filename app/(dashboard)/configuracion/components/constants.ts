import type { TipoRegla } from "@/types";

export const REGLAS_SEED = [
  {
    nombre: "4 ausencias consecutivas",
    tipo: "ausencias_consecutivas" as TipoRegla,
    condicion_valor: 4,
    accion: "cambiar_estado",
    activo: false,
  },
  {
    nombre: "30 días sin asistir",
    tipo: "dias_sin_asistir" as TipoRegla,
    condicion_valor: 30,
    accion: "cambiar_estado",
    activo: false,
  },
  {
    nombre: "10 asistencias acumuladas",
    tipo: "asistencias_acumuladas" as TipoRegla,
    condicion_valor: 10,
    accion: "cambiar_estado",
    activo: false,
  },
  {
    nombre: "Ingreso a ministerio → Servidor",
    tipo: "ingreso_ministerio" as TipoRegla,
    condicion_valor: null,
    accion: "cambiar_estado",
    activo: true,
  },
];

export const TIPO_REGLA_OPTIONS: {
  value: TipoRegla;
  label: string;
  defaultValor: number | null;
}[] = [
  {
    value: "ausencias_consecutivas",
    label: "4 ausencias consecutivas",
    defaultValor: 4,
  },
  { value: "dias_sin_asistir", label: "30 días sin asistir", defaultValor: 30 },
  {
    value: "asistencias_acumuladas",
    label: "10 asistencias acumuladas",
    defaultValor: 10,
  },
  {
    value: "ingreso_ministerio",
    label: "Ingreso a ministerio",
    defaultValor: null,
  },
];

export const COLOR_OPTIONS = [
  { value: "blue", label: "Azul", className: "bg-blue-500" },
  { value: "green", label: "Verde", className: "bg-green-500" },
  { value: "orange", label: "Naranja", className: "bg-orange-500" },
  { value: "gray", label: "Gris", className: "bg-gray-400" },
  { value: "purple", label: "Morado", className: "bg-purple-500" },
  { value: "red", label: "Rojo", className: "bg-red-500" },
];

export const ESTADOS_SEED = [
  {
    nombre: "Nuevo",
    descripcion: "Persona recién registrada",
    color: "blue",
    orden: 1,
    activo: true,
  },
  {
    nombre: "Visitante",
    descripcion: "Ha visitado pero no es miembro",
    color: "purple",
    orden: 2,
    activo: true,
  },
  {
    nombre: "Asistente",
    descripcion: "Asiste regularmente",
    color: "green",
    orden: 3,
    activo: true,
  },
  {
    nombre: "Servidor",
    descripcion: "Sirve activamente en la iglesia",
    color: "orange",
    orden: 4,
    activo: true,
  },
  {
    nombre: "Inactivo",
    descripcion: "No ha asistido en mucho tiempo",
    color: "gray",
    orden: 5,
    activo: true,
  },
];
