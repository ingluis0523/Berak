-- ─── Migración 004: Fixes RLS, triggers automatización y asignación de red ────
-- Ejecutar en Supabase SQL Editor.
-- Seguro de re-ejecutar (usa CREATE OR REPLACE y DROP IF EXISTS).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Corregir is_admin_user() — comparación case-insensitive
--    El error: la función original usaba IN ('Super Admin', 'Pastor', 'Secretaria')
--    (case-sensitive), pero los roles pueden llamarse 'super admin', 'Administrador', etc.
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
-- 2. Corregir trigger de ministerio
--    El error: la función original actualizaba tipo_persona = 'servidor' (campo incorrecto).
--    Debe actualizar estado_persona_id buscando la regla ingreso_ministerio activa
--    o buscando el estado 'servidor' por nombre como fallback.
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Re-adjuntar el trigger (por si el DROP anterior no se ejecutó)
DROP TRIGGER IF EXISTS trg_persona_ministerio_tipo ON persona_ministerios;
CREATE TRIGGER trg_persona_ministerio_tipo
AFTER INSERT ON persona_ministerios
FOR EACH ROW EXECUTE FUNCTION on_persona_ministerio_insert();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Nuevo trigger: asignación automática de red por líder
--    Al crear o actualizar una persona con lider_id, si ese líder dirige un grupo,
--    la persona queda asociada a ese grupo (y por ende a su red).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION assign_persona_to_lider_grupo()
RETURNS TRIGGER AS $$
DECLARE
  v_grupo_id uuid;
BEGIN
  -- Salir si no hay líder
  IF NEW.lider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Salir si el líder no cambió (solo en UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.lider_id IS NOT DISTINCT FROM NEW.lider_id THEN
    RETURN NEW;
  END IF;

  -- Buscar el grupo activo que dirige este líder
  SELECT id INTO v_grupo_id
  FROM grupos
  WHERE lider_id = NEW.lider_id
    AND estado = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_grupo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Salir si la persona ya está activa en ese grupo
  IF EXISTS (
    SELECT 1 FROM grupo_miembros
    WHERE persona_id = NEW.id AND grupo_id = v_grupo_id AND activo = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Desactivar membresía activa anterior (solo puede haber una activa a la vez)
  UPDATE grupo_miembros
  SET activo = false, fecha_salida = CURRENT_DATE
  WHERE persona_id = NEW.id AND activo = true;

  -- Agregar al grupo del líder
  INSERT INTO grupo_miembros (persona_id, grupo_id, fecha_ingreso, activo)
  VALUES (NEW.id, v_grupo_id, CURRENT_DATE, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_persona_lider_grupo ON personas;
CREATE TRIGGER trg_persona_lider_grupo
AFTER INSERT OR UPDATE OF lider_id ON personas
FOR EACH ROW EXECUTE FUNCTION assign_persona_to_lider_grupo();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Actualizar política RLS personas_update para usar is_admin_user() corregida
--    (La función ya fue corregida arriba, las políticas siguen igual pero ahora
--     is_admin_user() funciona correctamente con todos los nombres de rol admin.)
-- ═══════════════════════════════════════════════════════════════════════════════

-- No es necesario recrear las políticas, solo actualizar la función (ya hecho arriba).
-- Si las políticas no existen (instancia fresca sin migración 003), las recreamos:

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'personas' AND policyname = 'personas_update'
  ) THEN
    CREATE POLICY "personas_update" ON personas
      FOR UPDATE TO authenticated
      USING (
        is_admin_user()
        OR has_permission('editar_personas')
        OR lider_id = get_current_persona_id()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'personas' AND policyname = 'personas_select'
  ) THEN
    -- Si no existe personas_select (instancia sin migración 003),
    -- la política 'Acceso autenticado' sigue activa → no hay restricción SELECT.
    -- Solo agregar si se quiere forzar la restricción (comentar si no aplica).
    NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN
-- ═══════════════════════════════════════════════════════════════════════════════
