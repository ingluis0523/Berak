-- ─── Migración 008: RLS granular para redes y grupos ─────────────────────────
-- Ejecutar en Supabase → SQL Editor (sin RLS / como postgres).
--
-- PROBLEMA: redes y grupos tienen políticas catch-all "Acceso autenticado"
-- que permiten a cualquier usuario autenticado ver y modificar cualquier red/grupo.
--
-- FIX: Políticas específicas por operación:
--   SELECT  → admin | acceso_todas_redes | usuario sin rol | usuario sin persona | pertenece a la red
--   INSERT  → admin | tiene permiso crear_X | bootstrap
--   UPDATE  → admin | tiene permiso editar_X | bootstrap
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Helper: determina si el usuario pertenece a una red dada ─────────────────
-- (busca si el usuario está activo en algún grupo de esa red)
CREATE OR REPLACE FUNCTION user_belongs_to_red(p_red_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
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
    -- También aplica si el usuario es el líder de un grupo en esa red
    SELECT 1
    FROM grupos g
    JOIN usuarios u ON u.persona_id = g.lider_id
    WHERE g.red_id = p_red_id
      AND u.id = auth.uid()
      AND g.deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ══════════════════════════════════════════════════════════════════════════════
-- REDES
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Acceso autenticado" ON redes;
DROP POLICY IF EXISTS "redes_select"       ON redes;
DROP POLICY IF EXISTS "redes_insert"       ON redes;
DROP POLICY IF EXISTS "redes_update"       ON redes;
DROP POLICY IF EXISTS "redes_delete"       ON redes;

-- SELECT: admin | acceso_todas_redes | sin rol (bootstrap) | sin persona (admin Supabase) | pertenece a la red
CREATE POLICY "redes_select" ON redes
  FOR SELECT TO authenticated
  USING (
    is_admin_user()
    OR has_permission('acceso_todas_redes')
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id   IS NULL)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
    OR user_belongs_to_red(redes.id)
  );

-- INSERT: admin | crear_redes | bootstrap
CREATE POLICY "redes_insert" ON redes
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_user()
    OR has_permission('crear_redes')
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id   IS NULL)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
  );

-- UPDATE: admin | editar_redes | bootstrap
CREATE POLICY "redes_update" ON redes
  FOR UPDATE TO authenticated
  USING (
    is_admin_user()
    OR has_permission('editar_redes')
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id   IS NULL)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPOS
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Acceso autenticado" ON grupos;
DROP POLICY IF EXISTS "grupos_select"      ON grupos;
DROP POLICY IF EXISTS "grupos_insert"      ON grupos;
DROP POLICY IF EXISTS "grupos_update"      ON grupos;
DROP POLICY IF EXISTS "grupos_delete"      ON grupos;

-- SELECT: admin | acceso_todas_redes | bootstrap | pertenece al grupo | lidera el grupo | pertenece a la misma red
CREATE POLICY "grupos_select" ON grupos
  FOR SELECT TO authenticated
  USING (
    is_admin_user()
    OR has_permission('acceso_todas_redes')
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id   IS NULL)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
    -- Es miembro activo de este grupo
    OR EXISTS (
      SELECT 1 FROM grupo_miembros gm
      JOIN usuarios u ON u.persona_id = gm.persona_id
      WHERE gm.grupo_id = grupos.id
        AND u.id = auth.uid()
        AND gm.activo = true
    )
    -- Es líder de este grupo
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.persona_id = grupos.lider_id
    )
    -- Pertenece a la red de este grupo (ve todos los grupos de su red)
    OR (grupos.red_id IS NOT NULL AND user_belongs_to_red(grupos.red_id))
  );

-- INSERT: admin | crear_grupos | bootstrap
CREATE POLICY "grupos_insert" ON grupos
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_user()
    OR has_permission('crear_grupos')
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id   IS NULL)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
  );

-- UPDATE: admin | editar_grupos | bootstrap
CREATE POLICY "grupos_update" ON grupos
  FOR UPDATE TO authenticated
  USING (
    is_admin_user()
    OR has_permission('editar_grupos')
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol_id   IS NULL)
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND persona_id IS NULL)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- FIN
-- Después de ejecutar este script:
--   ✓ Usuarios regulares solo ven su propia red y sus grupos
--   ✓ Admins y usuarios con acceso_todas_redes ven todo
--   ✓ Usuarios bootstrap (sin rol / sin persona) tienen acceso total
-- ══════════════════════════════════════════════════════════════════════════════
