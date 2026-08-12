-- ═══════════════════════════════════════════════════════════════════════════════
-- BERAK — Borrado selectivo de datos
--
-- Elimina el contenido de: personas, redes, grupos, usuarios, asistencias, eventos.
-- También limpia grupo_miembros y persona_ministerios para evitar registros huérfanos.
--
-- CONSERVA: iglesiaapostolicajcreina@gmail.com, su rol, sus permisos y los
--           catálogos del sistema (estados_persona, permisos, ministerios, roles).
--
-- EJECUTAR EN: Supabase → SQL Editor (sin RLS / como postgres)
-- ADVERTENCIA: Irreversible. Confirma antes de ejecutar.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Paso 0: Guardar referencia del usuario principal ─────────────────────────
DROP TABLE IF EXISTS _main_user;
CREATE TEMP TABLE _main_user AS
SELECT
  au.id    AS uid,
  pu.rol_id,
  pu.persona_id
FROM auth.users au
LEFT JOIN public.usuarios pu ON pu.id = au.id
WHERE au.email = 'iglesiaapostolicajcreina@gmail.com';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _main_user) THEN
    RAISE EXCEPTION 'Usuario iglesiaapostolicajcreina@gmail.com no encontrado. Verifica el email.';
  END IF;
END $$;

-- ── Paso 1: Deshabilitar verificación de FKs ─────────────────────────────────
-- NOTA: replica mode solo aplica a DML (DELETE/UPDATE/INSERT), no a TRUNCATE.
-- Por eso usamos DELETE FROM en todas las tablas.
SET session_replication_role = replica;

-- ── Paso 2: Nullear persona_id del usuario principal antes de borrar personas ─
UPDATE public.usuarios
  SET persona_id = NULL
  WHERE id IN (SELECT uid FROM _main_user);

-- ── Paso 3: Borrar datos en orden de dependencias ────────────────────────────

-- Asistencias (referencia eventos y personas)
DELETE FROM asistencias;

-- Eventos y plantillas
DELETE FROM eventos;
DELETE FROM eventos_plantilla;

-- Membresías (referencia grupos y personas)
DELETE FROM grupo_miembros;

-- Membresías de ministerios (referencia ministerios y personas)
DELETE FROM persona_ministerios;

-- Ministerios
DELETE FROM ministerios;

-- Grupos (referencia personas y redes)
DELETE FROM grupos;

-- Redes
DELETE FROM redes;

-- Personas
DELETE FROM personas;

-- ── Paso 4: Borrar usuarios secundarios (público) ────────────────────────────
DELETE FROM public.usuarios
  WHERE id NOT IN (SELECT uid FROM _main_user);

-- ── Paso 5: Borrar usuarios secundarios (auth) ───────────────────────────────
DELETE FROM auth.mfa_challenges
  WHERE factor_id IN (
    SELECT id FROM auth.mfa_factors
    WHERE user_id NOT IN (SELECT uid FROM _main_user)
  );

DELETE FROM auth.mfa_factors
  WHERE user_id NOT IN (SELECT uid FROM _main_user);

DELETE FROM auth.refresh_tokens
  WHERE session_id IN (
    SELECT id FROM auth.sessions
    WHERE user_id NOT IN (SELECT uid FROM _main_user)
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

-- ── Paso 6: Restaurar verificación de FKs ────────────────────────────────────
SET session_replication_role = DEFAULT;

-- ── Limpieza ──────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS _main_user;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN
--
-- Se conservó:
--   ✓  iglesiaapostolicajcreina@gmail.com (auth + public.usuarios)
--   ✓  Su rol y permisos asignados
--   ✓  Catálogos: estados_persona, permisos, roles
--
-- Se borró:
--   ✗  Todas las personas
--   ✗  Todas las redes y grupos
--   ✗  Todos los eventos y asistencias
--   ✗  Todos los usuarios secundarios (auth + public)
--   ✗  Todos los ministerios
--   ✗  grupo_miembros y persona_ministerios (integridad referencial)
-- ═══════════════════════════════════════════════════════════════════════════════
