-- Agregar tipo 'anciano' al CHECK constraint de personas
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar el constraint existente (el nombre puede variar, busca el correcto)
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_tipo_persona_check;

-- 2. Agregar nuevo constraint con 'anciano' incluido
ALTER TABLE personas ADD CONSTRAINT personas_tipo_persona_check
  CHECK (tipo_persona IN ('miembro','lider','visitante','servidor','anfitrion','pastor','sublider','anciano'));

-- 3. También agregar trigger para cambiar tipo al asignar como líder de grupo
CREATE OR REPLACE FUNCTION on_grupo_lider_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si cambió el lider_id, actualizar tipo_persona
  IF NEW.lider_id IS NOT NULL AND (OLD.lider_id IS NULL OR NEW.lider_id != OLD.lider_id) THEN
    UPDATE personas SET tipo_persona = 'lider', updated_at = now()
    WHERE id = NEW.lider_id
      AND tipo_persona NOT IN ('pastor', 'anciano');
  END IF;

  -- Si cambió el sublider_id
  IF NEW.sublider_id IS NOT NULL AND (OLD.sublider_id IS NULL OR NEW.sublider_id != OLD.sublider_id) THEN
    UPDATE personas SET tipo_persona = 'sublider', updated_at = now()
    WHERE id = NEW.sublider_id
      AND tipo_persona NOT IN ('pastor', 'lider', 'anciano');
  END IF;

  -- Si cambió el anfitrion_id
  IF NEW.anfitrion_id IS NOT NULL AND (OLD.anfitrion_id IS NULL OR NEW.anfitrion_id != OLD.anfitrion_id) THEN
    UPDATE personas SET tipo_persona = 'anfitrion', updated_at = now()
    WHERE id = NEW.anfitrion_id
      AND tipo_persona NOT IN ('pastor', 'lider', 'sublider', 'anciano');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_grupo_lider_tipo
AFTER INSERT OR UPDATE OF lider_id, sublider_id, anfitrion_id ON grupos
FOR EACH ROW EXECUTE FUNCTION on_grupo_lider_change();
