-- ─── Migración 003: Corregir trigger ministerio + RLS por roles ───────────────
-- Ejecutar en Supabase SQL Editor.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Corregir trigger de ministerio: actualizar estado, NO tipo_persona
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_persona_ministerio_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_estado_id uuid;
BEGIN
  -- Obtener el id del estado 'servidor'
  SELECT id INTO v_estado_id
  FROM estados_persona
  WHERE lower(nombre) = 'servidor'
  LIMIT 1;

  -- Actualizar solo el estado, SIN cambiar tipo_persona
  IF v_estado_id IS NOT NULL THEN
    UPDATE personas
    SET estado_persona_id = v_estado_id,
        updated_at = now()
    WHERE id = NEW.persona_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Funciones de apoyo para RLS por rol
-- ═══════════════════════════════════════════════════════════════════════════════

-- Retorna el persona_id del usuario autenticado actualmente
CREATE OR REPLACE FUNCTION get_current_persona_id()
RETURNS uuid AS $$
  SELECT persona_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Retorna true si el usuario tiene alguno de los roles admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = auth.uid()
      AND r.nombre IN ('Super Admin', 'Pastor', 'Secretaria')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Retorna true si el usuario tiene el permiso indicado
CREATE OR REPLACE FUNCTION has_permission(p_permiso_nombre text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u
    JOIN rol_permisos rp ON rp.rol_id = u.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE u.id = auth.uid() AND p.nombre = p_permiso_nombre
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Actualizar políticas RLS para personas
--    - Admins ven todo
--    - Líderes ven personas donde son el lider_id o están en su grupo
-- ═══════════════════════════════════════════════════════════════════════════════

-- Eliminar política amplia existente en personas
DROP POLICY IF EXISTS "Acceso autenticado" ON personas;

-- SELECT: admin ve todo; líder ve los suyos
CREATE POLICY "personas_select" ON personas
  FOR SELECT TO authenticated
  USING (
    is_admin_user()
    OR lider_id = get_current_persona_id()
    OR id = get_current_persona_id()
    OR EXISTS (
      SELECT 1 FROM grupo_miembros gm
      JOIN grupos g ON g.id = gm.grupo_id
      WHERE gm.persona_id = personas.id
        AND gm.activo = true
        AND g.lider_id = get_current_persona_id()
    )
  );

-- INSERT: cualquier usuario autenticado puede crear personas
CREATE POLICY "personas_insert" ON personas
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: admins y quien tiene editar_personas
CREATE POLICY "personas_update" ON personas
  FOR UPDATE TO authenticated
  USING (
    is_admin_user()
    OR has_permission('editar_personas')
    OR lider_id = get_current_persona_id()
  );

-- DELETE (soft): solo admins
CREATE POLICY "personas_delete" ON personas
  FOR DELETE TO authenticated
  USING (is_admin_user());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Mantener acceso amplio en tablas de catálogo y configuración
--    (estas no necesitan restricción por usuario)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Las tablas sin política propia (que siguen con "Acceso autenticado"):
-- estados_persona, roles, permisos, rol_permisos, redes, grupos, grupo_miembros,
-- ministerios, persona_ministerios, eventos, eventos_plantilla, asistencias,
-- reglas_automatizacion, usuarios
-- → se mantienen con la política original "Acceso autenticado" hasta próxima fase.
