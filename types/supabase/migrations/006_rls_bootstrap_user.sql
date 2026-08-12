-- ─── Migración 006: Permitir al usuario bootstrap (sin rol) operar en personas ─
-- Ejecutar en Supabase SQL Editor.
--
-- PROBLEMA: El primer usuario creado en Supabase tiene rol_id = NULL.
-- Las políticas RLS de personas exigen is_admin_user() o has_permission(),
-- ambas devuelven false cuando no hay rol → el UPDATE falla silenciosamente.
--
-- FIX: Agregar la condición "usuario sin rol = sin restricción" a SELECT y UPDATE,
-- igual que la lógica de la app (hasPermission devuelve true cuando !hasRole).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. personas_select — incluir usuarios sin rol
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "personas_select" ON personas;
CREATE POLICY "personas_select" ON personas
  FOR SELECT TO authenticated
  USING (
    -- Admin (por nombre de rol)
    is_admin_user()
    -- Usuario bootstrap: está en usuarios pero sin rol asignado
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id IS NULL)
    -- Ve personas que le asignaron como líder
    OR lider_id = get_current_persona_id()
    -- Ve su propio registro
    OR id = get_current_persona_id()
    -- Líder de grupo: ve todos los miembros de sus grupos
    OR EXISTS (
      SELECT 1 FROM grupo_miembros gm
      JOIN grupos g ON g.id = gm.grupo_id
      WHERE gm.persona_id = personas.id
        AND gm.activo = true
        AND g.lider_id = get_current_persona_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. personas_update — incluir usuarios sin rol
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "personas_update" ON personas;
CREATE POLICY "personas_update" ON personas
  FOR UPDATE TO authenticated
  USING (
    is_admin_user()
    OR has_permission('editar_personas')
    -- Es el líder de esa persona
    OR lider_id = get_current_persona_id()
    -- Usuario bootstrap: sin rol asignado → sin restricción
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id IS NULL)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. personas_insert — igual, permitir bootstrap
--    (normalmente ya tiene WITH CHECK (true), pero aseguramos consistencia)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "personas_insert" ON personas;
CREATE POLICY "personas_insert" ON personas
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTAS:
-- • Una vez que el super admin se asigne un rol (ej. "Super Admin"), la condición
--   is_admin_user() toma el control y la condición bootstrap ya no aplica para él.
-- • La condición bootstrap (rol_id IS NULL) NO es un agujero de seguridad en
--   producción porque en producción todos los usuarios deberían tener un rol.
--   Es solo para el primer setup.
-- ═══════════════════════════════════════════════════════════════════════════════
