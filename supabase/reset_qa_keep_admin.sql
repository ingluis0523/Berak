-- ═══════════════════════════════════════════════════════════════════════════════
-- BERAK — Reset QA conservando el usuario principal
--
-- Borra todos los datos de negocio y usuarios secundarios.
-- CONSERVA: iglesiaapostolicajcreina@gmail.com, su rol y sus permisos.
--
-- EJECUTAR EN: Supabase → SQL Editor
-- ADVERTENCIA: Irreversible. Solo usar en entornos de prueba.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Paso 0: Guardar datos del usuario principal en tabla temporal ─────────────
DROP TABLE IF EXISTS _main_user;
CREATE TEMP TABLE _main_user AS
SELECT
  au.id    AS uid,
  pu.rol_id
FROM auth.users au
LEFT JOIN public.usuarios pu ON pu.id = au.id
WHERE au.email = 'iglesiaapostolicajcreina@gmail.com';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _main_user) THEN
    RAISE EXCEPTION 'Usuario iglesiaapostolicajcreina@gmail.com no encontrado. Verifica el email.';
  END IF;
END $$;

-- ── Paso 1: Limpiar auth solo para usuarios secundarios ───────────────────────
DELETE FROM auth.mfa_challenges
  WHERE factor_id IN (
    SELECT id FROM auth.mfa_factors WHERE user_id NOT IN (SELECT uid FROM _main_user)
  );

DELETE FROM auth.mfa_factors
  WHERE user_id NOT IN (SELECT uid FROM _main_user);

DELETE FROM auth.refresh_tokens
  WHERE session_id IN (
    SELECT id FROM auth.sessions WHERE user_id NOT IN (SELECT uid FROM _main_user)
  );

DELETE FROM auth.sessions
  WHERE user_id NOT IN (SELECT uid FROM _main_user);

DELETE FROM auth.flow_state
  WHERE user_id NOT IN (SELECT uid FROM _main_user);

DELETE FROM auth.one_time_tokens
  WHERE user_id NOT IN (SELECT uid FROM _main_user);

DELETE FROM auth.saml_relay_states;

DELETE FROM auth.identities
  WHERE user_id NOT IN (SELECT uid FROM _main_user);

DELETE FROM auth.audit_log_entries;

DELETE FROM auth.users
  WHERE id NOT IN (SELECT uid FROM _main_user);

-- ── Paso 2: Borrar datos de negocio (deshabilitar FKs) ───────────────────────
SET session_replication_role = replica;

TRUNCATE TABLE asistencias         CASCADE;
TRUNCATE TABLE eventos             CASCADE;
TRUNCATE TABLE eventos_plantilla   CASCADE;
TRUNCATE TABLE persona_ministerios CASCADE;
TRUNCATE TABLE grupo_miembros      CASCADE;
TRUNCATE TABLE ministerios         CASCADE;
TRUNCATE TABLE grupos              CASCADE;
TRUNCATE TABLE redes               CASCADE;
TRUNCATE TABLE personas            CASCADE;

-- Borrar usuarios secundarios (preservar el principal)
DELETE FROM public.usuarios
  WHERE id NOT IN (SELECT uid FROM _main_user);

SET session_replication_role = DEFAULT;

-- ── Paso 3: Limpiar roles/permisos preservando los del principal ──────────────
-- Borrar rol_permisos del principal (se re-asignarán con los IDs nuevos)
DELETE FROM rol_permisos
  WHERE rol_id IN (SELECT rol_id FROM _main_user WHERE rol_id IS NOT NULL);

-- Borrar rol_permisos de otros roles
DELETE FROM rol_permisos
  WHERE rol_id NOT IN (SELECT rol_id FROM _main_user WHERE rol_id IS NOT NULL);

-- Borrar roles secundarios
DELETE FROM roles
  WHERE id NOT IN (SELECT rol_id FROM _main_user WHERE rol_id IS NOT NULL);

-- Limpiar reglas de automatización (se re-crean desde la UI)
TRUNCATE TABLE reglas_automatizacion;

-- ── Paso 4: Re-insertar catálogo de estados de persona ────────────────────────
TRUNCATE TABLE estados_persona CASCADE;

INSERT INTO estados_persona (nombre, descripcion, color, orden) VALUES
  ('nuevo',     'Primera vez registrado',             'blue',   1),
  ('visitante', 'Asiste pero no es miembro',          'yellow', 2),
  ('activo',    'Miembro activo de la iglesia',       'green',  3),
  ('servidor',  'Sirve en algún ministerio',          'purple', 4),
  ('lider',     'Líder de grupo o ministerio',        'indigo', 5),
  ('asistente', 'Asiste regularmente',                'teal',   6),
  ('inactivo',  'No ha asistido recientemente',       'gray',   7);

-- ── Paso 5: Re-insertar catálogo de permisos ──────────────────────────────────
TRUNCATE TABLE permisos CASCADE;

INSERT INTO permisos (nombre, modulo, descripcion) VALUES
  ('ver_personas',           'personas',    'Ver lista y detalle de personas'),
  ('crear_personas',         'personas',    'Crear nuevas personas'),
  ('editar_personas',        'personas',    'Editar datos de personas'),
  ('eliminar_personas',      'personas',    'Eliminar personas del sistema'),
  ('ver_grupos',             'grupos',      'Ver lista y detalle de grupos'),
  ('crear_grupos',           'grupos',      'Crear nuevos grupos'),
  ('editar_grupos',          'grupos',      'Editar información de grupos'),
  ('gestionar_miembros',     'grupos',      'Agregar/quitar miembros de grupos'),
  ('ver_redes',              'redes',       'Ver lista y detalle de redes'),
  ('crear_redes',            'redes',       'Crear nuevas redes'),
  ('editar_redes',           'redes',       'Editar información de redes'),
  ('ver_ministerios',        'ministerios', 'Ver lista y detalle de ministerios'),
  ('crear_ministerios',      'ministerios', 'Crear nuevos ministerios'),
  ('editar_ministerios',     'ministerios', 'Editar información de ministerios'),
  ('ver_eventos',            'eventos',     'Ver eventos programados'),
  ('crear_eventos',          'eventos',     'Crear nuevos eventos'),
  ('editar_eventos',         'eventos',     'Editar eventos existentes'),
  ('cancelar_eventos',       'eventos',     'Cancelar eventos'),
  ('ver_asistencias',        'asistencias', 'Ver registros de asistencia'),
  ('registrar_asistencias',  'asistencias', 'Registrar asistencia a eventos'),
  ('editar_asistencias',     'asistencias', 'Editar registros de asistencia'),
  ('ver_reportes',           'reportes',    'Ver reportes del sistema'),
  ('exportar_reportes',      'reportes',    'Exportar reportes a CSV/Excel'),
  ('gestionar_usuarios',     'sistema',     'Crear y administrar usuarios'),
  ('gestionar_roles',        'sistema',     'Gestionar roles y permisos'),
  ('acceso_todas_redes',     'sistema',     'Ver datos de todas las redes (sin restricción por red)'),
  ('ver_configuracion',      'sistema',     'Ver configuración del sistema'),
  ('gestionar_configuracion','sistema',     'Modificar configuración del sistema');

-- ── Paso 6: Re-asignar TODOS los permisos al rol del usuario principal ─────────
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT mu.rol_id, p.id
FROM _main_user mu
CROSS JOIN permisos p
WHERE mu.rol_id IS NOT NULL;

-- ── Limpieza de tabla temporal ────────────────────────────────────────────────
DROP TABLE IF EXISTS _main_user;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN
-- El usuario iglesiaapostolicajcreina@gmail.com conserva:
--   ✓ Su cuenta en auth.users (no pierde el login)
--   ✓ Su registro en public.usuarios
--   ✓ Su rol asignado
--   ✓ Todos los permisos re-asignados al rol
--
-- Se borraron:
--   ✗ Todos los demás usuarios (auth + public)
--   ✗ Personas, grupos, redes, ministerios, eventos, asistencias
--   ✗ Reglas de automatización (re-crear desde /configuracion)
-- ═══════════════════════════════════════════════════════════════════════════════
