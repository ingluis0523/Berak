-- ═══════════════════════════════════════════════════════════════════════════════
-- BERAK — Reset QA conservando el usuario principal
--
-- Borra todos los datos de negocio y usuarios secundarios.
-- CONSERVA: iglesiaapostolicajcreina@gmail.com, su rol y sus permisos.
--
-- EJECUTAR EN: Supabase → SQL Editor (sin RLS / como postgres)
-- ADVERTENCIA: Irreversible. Solo usar en entornos de prueba.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Paso 0: Guardar datos del usuario principal ───────────────────────────────
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

-- ── Paso 1: Deshabilitar triggers/FKs ────────────────────────────────────────
-- NOTA: session_replication_role = replica solo afecta DML (DELETE/UPDATE/INSERT),
-- no TRUNCATE. Por eso usamos DELETE FROM en lugar de TRUNCATE para las tablas
-- que tienen FKs cruzadas.
SET session_replication_role = replica;

-- ── Paso 2: Limpiar datos de negocio con DELETE (respeta replica mode) ────────
-- Limpiar FK de persona_id del usuario principal antes de borrar personas
UPDATE public.usuarios
  SET persona_id = NULL
  WHERE id IN (SELECT uid FROM _main_user);

DELETE FROM asistencias;
DELETE FROM eventos;
DELETE FROM eventos_plantilla;
DELETE FROM persona_ministerios;
DELETE FROM grupo_miembros;
DELETE FROM ministerios;
DELETE FROM grupos;
DELETE FROM redes;
DELETE FROM evangelismo_seguimientos;
DELETE FROM evangelismos;
DELETE FROM persona_estado_historial;
DELETE FROM personas;

-- Borrar usuarios secundarios
DELETE FROM public.usuarios
  WHERE id NOT IN (SELECT uid FROM _main_user);

-- ── Paso 3: Limpiar auth para usuarios secundarios ────────────────────────────
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

-- ── Restaurar triggers/FKs ────────────────────────────────────────────────────
SET session_replication_role = DEFAULT;

-- ── Paso 4: Limpiar roles/permisos preservando los del principal ──────────────
DELETE FROM rol_permisos
  WHERE rol_id IN (SELECT rol_id FROM _main_user WHERE rol_id IS NOT NULL);

DELETE FROM rol_permisos
  WHERE rol_id NOT IN (SELECT rol_id FROM _main_user WHERE rol_id IS NOT NULL);

DELETE FROM roles
  WHERE id NOT IN (SELECT rol_id FROM _main_user WHERE rol_id IS NOT NULL);

DELETE FROM reglas_automatizacion;

-- ── Paso 5: Re-insertar catálogo de estados de persona ────────────────────────
DELETE FROM estados_persona;

INSERT INTO estados_persona (nombre, descripcion, color, orden) VALUES
  ('nuevo',     'Primera vez registrado',             'blue',   1),
  ('visitante', 'Asiste pero no es miembro',          'yellow', 2),
  ('activo',    'Miembro activo de la iglesia',       'green',  3),
  ('servidor',  'Sirve en algún ministerio',          'purple', 4),
  ('lider',     'Líder de grupo o ministerio',        'indigo', 5),
  ('asistente', 'Asiste regularmente',                'teal',   6),
  ('inactivo',      'No ha asistido recientemente',              'gray',   7),
  ('evangelizada',  'Persona recién evangelizada',              '#f59e0b', 20),
  ('en seguimiento','Evangelizada en seguimiento activo',       '#3b82f6', 21),
  ('consolidada',   'Con asistencia regular, proceso avanzado', '#8b5cf6', 22),
  ('integrada',     'Integrada a un grupo de la iglesia',       '#10b981', 23);

-- ── Paso 6: Re-insertar catálogo de permisos ──────────────────────────────────
DELETE FROM permisos;

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
  ('gestionar_configuracion','sistema',     'Modificar configuración del sistema'),
  ('ver_evangelismo',        'evangelismo', 'Ver lista y detalle de evangelismos'),
  ('crear_evangelismo',      'evangelismo', 'Registrar nuevos evangelismos'),
  ('editar_evangelismo',     'evangelismo', 'Editar evangelismos y seguimientos');

-- ── Paso 7: Re-asignar TODOS los permisos al rol del usuario principal ─────────
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
--   ✓ Su fila en public.usuarios (con persona_id = NULL)
--   ✓ Su rol asignado
--   ✓ Todos los permisos re-asignados al rol
--
-- Se borraron:
--   ✗ Todos los demás usuarios (auth + public)
--   ✗ Personas, grupos, redes, ministerios, eventos, asistencias
--   ✗ Evangelismos, seguimientos, historial de estados de persona
--   ✗ Reglas de automatización (re-crear desde /configuracion)
-- ═══════════════════════════════════════════════════════════════════════════════
