-- ─── Reset de datos para pruebas ─────────────────────────────────────────────
-- Elimina TODOS los datos de prueba pero mantiene la estructura de la BD.
-- Ejecutar en Supabase SQL Editor.
-- ⚠️  NO ejecutar en producción con datos reales.

-- Orden: tablas dependientes primero, luego las principales

TRUNCATE TABLE asistencias            CASCADE;
TRUNCATE TABLE eventos                CASCADE;
TRUNCATE TABLE eventos_plantilla      CASCADE;
TRUNCATE TABLE grupo_miembros         CASCADE;
TRUNCATE TABLE persona_ministerios    CASCADE;
TRUNCATE TABLE grupos                 CASCADE;
TRUNCATE TABLE ministerios            CASCADE;
TRUNCATE TABLE redes                  CASCADE;
TRUNCATE TABLE personas               CASCADE;
TRUNCATE TABLE reglas_automatizacion  CASCADE;

-- Usuarios de Auth (borra también los registros en auth.users)
-- Descomenta solo si también quieres borrar los usuarios de login:
-- DELETE FROM auth.users WHERE email != 'TU_EMAIL_ADMIN@ejemplo.com';

-- Limpia también las tablas de roles si tienes datos de prueba:
-- TRUNCATE TABLE rol_permisos CASCADE;
-- TRUNCATE TABLE roles CASCADE;
-- TRUNCATE TABLE permisos CASCADE;
