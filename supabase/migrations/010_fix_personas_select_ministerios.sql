-- ─── Migración 010: personas_select permite ver miembros de ministerios ──────
-- PROBLEMA: La política personas_select restringe por red/grupo. Cuando un usuario
-- con ver_ministerios consulta los miembros de un ministerio, las personas de otras
-- redes retornan null en el JOIN → se muestran como "Persona desconocida".
--
-- FIX: Agregar condición que permite ver cualquier persona activa en un ministerio
-- si el usuario tiene el permiso ver_ministerios.

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
    -- Ver ministerios: puede ver cualquier persona activa en un ministerio
    OR (
      has_permission('ver_ministerios')
      AND EXISTS (
        SELECT 1 FROM persona_ministerios pm
        WHERE pm.persona_id = personas.id AND pm.activo = true
      )
    )
  );
