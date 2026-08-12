-- ─── Migración 009: personas_select permite acceso total a usuarios con acceso_todas_redes ──
-- Ejecutar en Supabase → SQL Editor (sin RLS / como postgres).
--
-- PROBLEMA: La política personas_select (migración 007) no incluye has_permission('acceso_todas_redes').
-- Un usuario no-admin con ese permiso pero con persona_id vinculada solo veía sus propias personas,
-- porque las condiciones OR lider_id / OR id / OR grupo_lider no cubrían el acceso total.
--
-- FIX: Agregar OR has_permission('acceso_todas_redes') como segunda condición.

DROP POLICY IF EXISTS "personas_select" ON personas;

CREATE POLICY "personas_select" ON personas
  FOR SELECT TO authenticated
  USING (
    -- Admins por nombre de rol
    is_admin_user()
    -- Permiso explícito de ver todas las redes (acceso global)
    OR has_permission('acceso_todas_redes')
    -- Usuario sin persona vinculada (creado directamente en Supabase)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
    -- Usuario sin rol (bootstrap)
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
