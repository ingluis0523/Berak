-- ─── Migración 004: Simplificar RLS de personas y asegurar acceso a eventos/asistencias ──
-- Ejecutar en Supabase SQL Editor.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Simplificar personas_select: todos los usuarios autenticados ven todos los registros
--    La restricción fina por líder era demasiado agresiva para esta aplicación.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "personas_select" ON personas;

CREATE POLICY "personas_select" ON personas
  FOR SELECT TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Asegurar políticas explícitas en eventos y asistencias
--    (por si "Acceso autenticado" no cubre correctamente en el contexto server-side)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Eventos
DROP POLICY IF EXISTS "Acceso autenticado" ON eventos;
DROP POLICY IF EXISTS "eventos_select" ON eventos;
DROP POLICY IF EXISTS "eventos_insert" ON eventos;
DROP POLICY IF EXISTS "eventos_update" ON eventos;
DROP POLICY IF EXISTS "eventos_delete" ON eventos;

CREATE POLICY "eventos_select" ON eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "eventos_insert" ON eventos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "eventos_update" ON eventos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "eventos_delete" ON eventos FOR DELETE TO authenticated USING (is_admin_user());

-- Asistencias
DROP POLICY IF EXISTS "Acceso autenticado" ON asistencias;
DROP POLICY IF EXISTS "asistencias_select" ON asistencias;
DROP POLICY IF EXISTS "asistencias_insert" ON asistencias;
DROP POLICY IF EXISTS "asistencias_update" ON asistencias;
DROP POLICY IF EXISTS "asistencias_delete" ON asistencias;

CREATE POLICY "asistencias_select" ON asistencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "asistencias_insert" ON asistencias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "asistencias_update" ON asistencias FOR UPDATE TO authenticated USING (true);
CREATE POLICY "asistencias_delete" ON asistencias FOR DELETE TO authenticated USING (is_admin_user());
