-- ─── Migración 014: corregir trigger assign_persona_to_lider_grupo ─────────────
-- PROBLEMA: cuando se actualiza personas.lider_id, el trigger busca el primer
-- grupo con ese líder (LIMIT 1) y mueve a la persona allí, desactivando su
-- membresía actual. Si el líder tiene 2+ grupos, la persona siempre termina en
-- el grupo más antiguo, ignorando a cuál se la agregó manualmente.
--
-- FIX: antes de reasignar, verificar si la persona ya pertenece activamente a
-- CUALQUIER grupo liderado por NEW.lider_id. En ese caso, no mover.

CREATE OR REPLACE FUNCTION assign_persona_to_lider_grupo()
RETURNS TRIGGER AS $$
DECLARE
  v_grupo_id uuid;
BEGIN
  -- Sin líder: nada que hacer
  IF NEW.lider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- lider_id no cambió en un UPDATE: nada que hacer
  IF TG_OP = 'UPDATE' AND OLD.lider_id IS NOT DISTINCT FROM NEW.lider_id THEN
    RETURN NEW;
  END IF;

  -- Si la persona ya está en algún grupo activo de este líder, respetar esa membresía
  IF EXISTS (
    SELECT 1
    FROM grupo_miembros gm
    JOIN grupos g ON g.id = gm.grupo_id
    WHERE gm.persona_id = NEW.id
      AND g.lider_id   = NEW.lider_id
      AND gm.activo    = true
      AND g.deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- Buscar cualquier grupo activo de este líder (para personas nuevas sin grupo)
  SELECT id INTO v_grupo_id
  FROM grupos
  WHERE lider_id  = NEW.lider_id
    AND estado    = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_grupo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si ya está en exactamente ese grupo, no hacer nada
  IF EXISTS (
    SELECT 1 FROM grupo_miembros
    WHERE persona_id = NEW.id AND grupo_id = v_grupo_id AND activo = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Desactivar membresías previas y asignar al grupo del líder
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
