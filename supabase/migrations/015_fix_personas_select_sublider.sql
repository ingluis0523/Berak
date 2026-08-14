-- ─── Migración 015: Ampliar personas_select para sublíderes, anfitriones y gestores ──
-- PROBLEMA: 
--   1. El sublíder y el anfitrión de un grupo no podían ver los miembros de su grupo 
--      (personas_select solo permitía al lider_id del grupo).
--   2. Cuando un usuario con permiso de crear personas (crear_personas) insertaba una persona, 
--      Supabase ejecutaba un RETURNING (SELECT) sobre la nueva fila. Al no ser el creador el lider_id, 
--      la consulta SELECT fallaba y lanzaba "new row violates row-level security policy".
--
-- FIX:
--   A) Permitir que sublíderes y anfitriones de grupos vean a sus miembros activos.
--   B) Permitir que usuarios con permiso 'crear_personas' o 'editar_personas' tengan acceso de lectura a las personas.

DROP POLICY IF EXISTS "personas_select" ON personas;

CREATE POLICY "personas_select" ON personas
  FOR SELECT TO authenticated
  USING (
    -- Admins por nombre de rol
    is_admin_user()
    -- Permiso explícito de ver todas las redes (acceso global)
    OR has_permission('acceso_todas_redes')
    -- Permisos de gestión de personas (crear/editar)
    OR has_permission('crear_personas')
    OR has_permission('editar_personas')
    -- Usuario sin persona vinculada (creado directamente en Supabase)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
    -- Usuario sin rol (bootstrap)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id IS NULL)
    -- Ve personas donde es el líder asignado
    OR lider_id = get_current_persona_id()
    -- Ve su propio registro
    OR id = get_current_persona_id()
    -- Líder, sublíder o anfitrión de grupo: ve todos los miembros activos de sus grupos
    OR EXISTS (
      SELECT 1 FROM grupo_miembros gm
      JOIN grupos g ON g.id = gm.grupo_id
      WHERE gm.persona_id = personas.id
        AND gm.activo = true
        AND (
          g.lider_id = get_current_persona_id()
          OR g.sublider_id = get_current_persona_id()
          OR g.anfitrion_id = get_current_persona_id()
        )
    )
    -- Ver ministerios: puede ver cualquier persona activa en un ministerio
    OR (
      has_permission('ver_ministerios')
      AND EXISTS (
        SELECT 1 FROM persona_ministerios pm
        WHERE pm.persona_id = personas.id AND pm.activo = true
      )
    )
    -- Encargado de red: ve todas las personas en grupos de su red
    -- (miembros activos + líderes/sublíderes/anfitriones de grupos)
    OR EXISTS (
      SELECT 1 FROM redes r
      JOIN usuarios u ON u.persona_id = r.lider_id
      WHERE u.id = auth.uid()
        AND r.deleted_at IS NULL
        AND r.estado = true
        AND (
          EXISTS (
            SELECT 1 FROM grupos g
            JOIN grupo_miembros gm ON gm.grupo_id = g.id
            WHERE g.red_id = r.id
              AND g.deleted_at IS NULL
              AND gm.persona_id = personas.id
              AND gm.activo = true
          )
          OR EXISTS (
            SELECT 1 FROM grupos g
            WHERE g.red_id = r.id
              AND g.deleted_at IS NULL
              AND (
                g.lider_id    = personas.id
                OR g.sublider_id  = personas.id
                OR g.anfitrion_id = personas.id
              )
          )
        )
    )
  );
