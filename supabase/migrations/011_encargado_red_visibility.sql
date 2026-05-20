-- ─── Migración 011: visibilidad completa para encargados de red ───────────────
-- PROBLEMA: El encargado de una red (redes.lider_id) no podía ver todas las
-- personas ni todos los grupos de su red porque:
--   1. user_belongs_to_red() no verificaba redes.lider_id → grupos_select y
--      redes_select bloqueaban al encargado a nivel de DB.
--   2. personas_select no tenía condición para el encargado.
--
-- FIX:
--   A) Actualizar user_belongs_to_red() para incluir redes.lider_id.
--      → Esto cubre automáticamente redes_select y grupos_select (sin tocarlos).
--   B) Agregar condición en personas_select para que el encargado vea todas
--      las personas en grupos de su red (miembros + líderes).

-- ── A) Actualizar helper user_belongs_to_red ─────────────────────────────────

CREATE OR REPLACE FUNCTION user_belongs_to_red(p_red_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    -- Es miembro activo de algún grupo en esta red
    SELECT 1
    FROM grupos g
    JOIN grupo_miembros gm ON gm.grupo_id = g.id
    JOIN usuarios u ON u.persona_id = gm.persona_id
    WHERE g.red_id = p_red_id
      AND u.id = auth.uid()
      AND gm.activo = true
      AND g.deleted_at IS NULL
  )
  OR EXISTS (
    -- Es líder de algún grupo en esta red
    SELECT 1
    FROM grupos g
    JOIN usuarios u ON u.persona_id = g.lider_id
    WHERE g.red_id = p_red_id
      AND u.id = auth.uid()
      AND g.deleted_at IS NULL
  )
  OR EXISTS (
    -- Es el encargado (lider) de esta red directamente
    SELECT 1
    FROM redes r
    JOIN usuarios u ON u.persona_id = r.lider_id
    WHERE r.id = p_red_id
      AND u.id = auth.uid()
      AND r.deleted_at IS NULL
      AND r.estado = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── B) Actualizar personas_select ────────────────────────────────────────────

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

-- ══════════════════════════════════════════════════════════════════════════════
-- Resultado:
--   ✓ Encargado ve su red en redes_select (vía user_belongs_to_red actualizado)
--   ✓ Encargado ve todos los grupos de su red en grupos_select (ídem)
--   ✓ Encargado ve todas las personas (miembros + líderes) de su red en personas_select
-- ══════════════════════════════════════════════════════════════════════════════
