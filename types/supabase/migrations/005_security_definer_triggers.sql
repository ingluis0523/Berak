-- ─── Migración 005: SECURITY DEFINER en triggers + is_admin_user case-insensitive ─
-- Ejecutar en Supabase SQL Editor.
-- Incluye todo lo de 004 + fix crítico: triggers con SECURITY DEFINER
-- para que el UPDATE a personas no sea bloqueado por RLS.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. is_admin_user() — case-insensitive (idempotente con 004)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = auth.uid()
      AND lower(r.nombre) IN ('super admin', 'pastor', 'secretaria', 'administrador', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. on_persona_ministerio_insert — SECURITY DEFINER
--    Sin SECURITY DEFINER, el trigger corre como el usuario que insertó en
--    persona_ministerios, y la política RLS de personas_update lo bloquea.
--    Con SECURITY DEFINER corre como el dueño de la función (postgres) y
--    siempre puede actualizar el estado de la persona.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_persona_ministerio_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_estado_id uuid;
BEGIN
  -- Buscar regla activa de tipo ingreso_ministerio
  SELECT estado_resultado_id INTO v_estado_id
  FROM reglas_automatizacion
  WHERE tipo = 'ingreso_ministerio' AND activo = true
  LIMIT 1;

  -- Fallback: buscar el estado 'servidor' por nombre
  IF v_estado_id IS NULL THEN
    SELECT id INTO v_estado_id
    FROM estados_persona
    WHERE lower(nombre) = 'servidor'
    LIMIT 1;
  END IF;

  IF v_estado_id IS NOT NULL THEN
    UPDATE personas
    SET estado_persona_id = v_estado_id,
        updated_at = now()
    WHERE id = NEW.persona_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_persona_ministerio_tipo ON persona_ministerios;
CREATE TRIGGER trg_persona_ministerio_tipo
AFTER INSERT ON persona_ministerios
FOR EACH ROW EXECUTE FUNCTION on_persona_ministerio_insert();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. assign_persona_to_lider_grupo — SECURITY DEFINER
--    Mismo motivo: cuando se asigna un líder a una persona, el trigger
--    inserta en grupo_miembros. Sin SECURITY DEFINER podría fallar por RLS.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION assign_persona_to_lider_grupo()
RETURNS TRIGGER AS $$
DECLARE
  v_grupo_id uuid;
BEGIN
  IF NEW.lider_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.lider_id IS NOT DISTINCT FROM NEW.lider_id THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_grupo_id
  FROM grupos
  WHERE lider_id = NEW.lider_id
    AND estado = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_grupo_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM grupo_miembros
    WHERE persona_id = NEW.id AND grupo_id = v_grupo_id AND activo = true
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE grupo_miembros
  SET activo = false, fecha_salida = CURRENT_DATE
  WHERE persona_id = NEW.id AND activo = true;

  INSERT INTO grupo_miembros (persona_id, grupo_id, fecha_ingreso, activo)
  VALUES (NEW.id, v_grupo_id, CURRENT_DATE, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_persona_lider_grupo ON personas;
CREATE TRIGGER trg_persona_lider_grupo
AFTER INSERT OR UPDATE OF lider_id ON personas
FOR EACH ROW EXECUTE FUNCTION assign_persona_to_lider_grupo();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Asegurar que personas_update permite a admins siempre editar
--    (si la política ya existe con la definición correcta, no cambia nada)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "personas_update" ON personas;
CREATE POLICY "personas_update" ON personas
  FOR UPDATE TO authenticated
  USING (
    is_admin_user()
    OR has_permission('editar_personas')
    OR lider_id = get_current_persona_id()
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN
-- Después de ejecutar este script, las actualizaciones de personas desde
-- el formulario de edición y las automatizaciones de ministerio funcionarán.
-- ═══════════════════════════════════════════════════════════════════════════════
