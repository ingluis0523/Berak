-- ─── Migración 007: Acceso total para usuarios sin persona vinculada ─────────
-- Ejecutar en Supabase SQL Editor.
--
-- PROBLEMA: Usuarios creados directamente en Supabase (no por el formulario)
-- tienen persona_id = NULL en la tabla usuarios. Cuando se les asigna un rol,
-- las políticas RLS de personas no les permiten ver nada porque:
--   - is_admin_user() puede fallar si el rol no está en la lista exacta
--   - get_current_persona_id() devuelve NULL → condiciones de lider/miembro = false
--
-- FIX: Añadir condición: si persona_id IS NULL en usuarios → acceso sin restricción
-- (Solo usuarios admin del sistema carecen de persona vinculada en producción)

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. personas_select
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "personas_select" ON personas;
CREATE POLICY "personas_select" ON personas
  FOR SELECT TO authenticated
  USING (
    -- Admins por nombre de rol
    is_admin_user()
    -- Usuario sin persona vinculada = creado directamente en Supabase (admin del sistema)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
    -- Usuario bootstrap: sin rol asignado
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id IS NULL)
    -- Ve personas donde es el líder asignado
    OR lider_id = get_current_persona_id()
    -- Ve su propio registro
    OR id = get_current_persona_id()
    -- Líder de grupo: ve todos los miembros activos de sus grupos
    OR EXISTS (
      SELECT 1 FROM grupo_miembros gm
      JOIN grupos g ON g.id = gm.grupo_id
      WHERE gm.persona_id = personas.id
        AND gm.activo = true
        AND g.lider_id = get_current_persona_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. personas_update
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "personas_update" ON personas;
CREATE POLICY "personas_update" ON personas
  FOR UPDATE TO authenticated
  USING (
    is_admin_user()
    OR has_permission('editar_personas')
    OR lider_id = get_current_persona_id()
    -- Sin rol asignado (bootstrap)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id IS NULL)
    -- Sin persona vinculada (admin del sistema creado en Supabase)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN
-- ═══════════════════════════════════════════════════════════════════════════════
