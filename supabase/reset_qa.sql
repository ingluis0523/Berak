-- ═══════════════════════════════════════════════════════════════════════════
-- BERAK - Reset de datos para QA
-- Borra todos los datos de negocio y los usuarios de auth.
-- Los catálogos de permisos y estados se re-insertan al final.
--
-- EJECUTAR EN: Supabase → SQL Editor
-- ADVERTENCIA: irreversible, úsalo solo en entornos de prueba.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Limpiar auth por orden (hijos antes que padres) ─────────────────────
-- Se hace primero y sin deshabilitar triggers para que auth quede limpio.
DELETE FROM auth.mfa_challenges;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.flow_state;
DELETE FROM auth.one_time_tokens;
DELETE FROM auth.saml_relay_states;
DELETE FROM auth.identities;
DELETE FROM auth.audit_log_entries;
DELETE FROM auth.users;

-- ─── 2. Limpiar tablas públicas (desactivar FKs para poder truncar en cualquier orden) ──
SET session_replication_role = replica;

TRUNCATE TABLE asistencias              CASCADE;
TRUNCATE TABLE eventos                  CASCADE;
TRUNCATE TABLE eventos_plantilla        CASCADE;
TRUNCATE TABLE persona_ministerios      CASCADE;
TRUNCATE TABLE grupo_miembros           CASCADE;
TRUNCATE TABLE reglas_automatizacion    CASCADE;
TRUNCATE TABLE ministerios              CASCADE;
TRUNCATE TABLE grupos                   CASCADE;
TRUNCATE TABLE redes                    CASCADE;
TRUNCATE TABLE rol_permisos             CASCADE;
TRUNCATE TABLE permisos                 CASCADE;
TRUNCATE TABLE usuarios                 CASCADE;
TRUNCATE TABLE roles                    CASCADE;
TRUNCATE TABLE personas                 CASCADE;
TRUNCATE TABLE estados_persona          CASCADE;

-- ─── 3. Reactivar triggers ────────────────────────────────────────────────────
SET session_replication_role = DEFAULT;

-- ─── 5. Re-insertar catálogo de estados de persona ───────────────────────────
INSERT INTO estados_persona (nombre, descripcion, color, orden) VALUES
  ('nuevo',      'Primera vez registrado',             'blue',   1),
  ('visitante',  'Asiste pero no es miembro',          'yellow', 2),
  ('activo',     'Miembro activo de la iglesia',       'green',  3),
  ('servidor',   'Sirve en algún ministerio',          'purple', 4),
  ('lider',      'Líder de grupo o ministerio',        'indigo', 5),
  ('asistente',  'Asiste regularmente',                'teal',   6),
  ('inactivo',   'No ha asistido recientemente',       'gray',   7);

-- ─── 6. Re-insertar catálogo de permisos ─────────────────────────────────────
INSERT INTO permisos (nombre, modulo, descripcion) VALUES
  -- Personas
  ('ver_personas',          'personas',    'Ver lista y detalle de personas'),
  ('crear_personas',        'personas',    'Crear nuevas personas'),
  ('editar_personas',       'personas',    'Editar datos de personas'),
  ('eliminar_personas',     'personas',    'Eliminar personas del sistema'),
  -- Grupos
  ('ver_grupos',            'grupos',      'Ver lista y detalle de grupos'),
  ('crear_grupos',          'grupos',      'Crear nuevos grupos'),
  ('editar_grupos',         'grupos',      'Editar información de grupos'),
  ('gestionar_miembros',    'grupos',      'Agregar/quitar miembros de grupos'),
  -- Redes
  ('ver_redes',             'redes',       'Ver lista y detalle de redes'),
  ('crear_redes',           'redes',       'Crear nuevas redes'),
  ('editar_redes',          'redes',       'Editar información de redes'),
  -- Ministerios
  ('ver_ministerios',       'ministerios', 'Ver lista y detalle de ministerios'),
  ('crear_ministerios',     'ministerios', 'Crear nuevos ministerios'),
  ('editar_ministerios',    'ministerios', 'Editar información de ministerios'),
  -- Eventos
  ('ver_eventos',           'eventos',     'Ver eventos programados'),
  ('crear_eventos',         'eventos',     'Crear nuevos eventos'),
  ('editar_eventos',        'eventos',     'Editar eventos existentes'),
  ('cancelar_eventos',      'eventos',     'Cancelar eventos'),
  -- Asistencias
  ('ver_asistencias',       'asistencias', 'Ver registros de asistencia'),
  ('registrar_asistencias', 'asistencias', 'Registrar asistencia a eventos'),
  ('editar_asistencias',    'asistencias', 'Editar registros de asistencia'),
  -- Reportes
  ('ver_reportes',          'reportes',    'Ver reportes del sistema'),
  ('exportar_reportes',     'reportes',    'Exportar reportes a CSV/Excel'),
  -- Sistema
  ('gestionar_usuarios',    'sistema',     'Crear y administrar usuarios'),
  ('gestionar_roles',       'sistema',     'Gestionar roles y permisos'),
  ('acceso_todas_redes',    'sistema',     'Ver datos de todas las redes (sin restricción por red)'),
  ('ver_configuracion',     'sistema',     'Ver configuración del sistema'),
  ('gestionar_configuracion','sistema',    'Modificar configuración del sistema');

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- Ahora puedes registrar un nuevo usuario desde la app (/login)
-- y asignarle un rol con los permisos que quieras probar.
-- ═══════════════════════════════════════════════════════════════════════════
