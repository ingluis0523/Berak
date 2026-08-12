-- ─── Módulo Evangelismo ───────────────────────────────────────────────────────

-- ── Nuevos estados evangelísticos ─────────────────────────────────────────────
INSERT INTO estados_persona (nombre, color, descripcion, orden)
SELECT t.nombre, t.color, t.descripcion, t.orden
FROM (VALUES
  ('Evangelizada',   '#f59e0b', 'Persona recién evangelizada',               20),
  ('En seguimiento', '#3b82f6', 'Evangelizada en seguimiento activo',        21),
  ('Consolidada',    '#8b5cf6', 'Con asistencia regular, proceso avanzado',  22),
  ('Integrada',      '#10b981', 'Integrada a un grupo de la iglesia',         23)
) AS t(nombre, color, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM estados_persona e WHERE lower(e.nombre) = lower(t.nombre)
);

-- ── Tabla principal de evangelismos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evangelismos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id        uuid        NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  evangelizador_id  uuid        REFERENCES personas(id),
  encargado_id      uuid        REFERENCES personas(id),
  fecha_evangelismo date        NOT NULL DEFAULT CURRENT_DATE,
  lugar             text,
  notas             text,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evangelismos_persona_unique UNIQUE(persona_id)
);

CREATE INDEX IF NOT EXISTS idx_evangelismos_persona       ON evangelismos(persona_id);
CREATE INDEX IF NOT EXISTS idx_evangelismos_evangelizador ON evangelismos(evangelizador_id);
CREATE INDEX IF NOT EXISTS idx_evangelismos_encargado     ON evangelismos(encargado_id);
CREATE INDEX IF NOT EXISTS idx_evangelismos_fecha         ON evangelismos(fecha_evangelismo);

-- ── Seguimientos ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evangelismo_seguimientos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  evangelismo_id  uuid        NOT NULL REFERENCES evangelismos(id) ON DELETE CASCADE,
  fecha           date        NOT NULL DEFAULT CURRENT_DATE,
  tipo            text        NOT NULL DEFAULT 'contacto'
                              CHECK (tipo IN ('contacto','visita','reunion','oracion','otro')),
  descripcion     text,
  responsable_id  uuid        REFERENCES personas(id),
  resultado       text        CHECK (resultado IN ('positivo','neutral','pendiente','sin_respuesta')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ev_seg_evangelismo ON evangelismo_seguimientos(evangelismo_id);

-- ── Historial de cambios de estado ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS persona_estado_historial (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id    uuid        NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  estado_id     uuid        REFERENCES estados_persona(id),
  estado_nombre text,
  cambiado_por  uuid        REFERENCES personas(id),
  notas         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estado_historial_persona ON persona_estado_historial(persona_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE evangelismos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evangelismo_seguimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_estado_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ev_select"   ON evangelismos FOR SELECT TO authenticated USING (true);
CREATE POLICY "ev_insert"   ON evangelismos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ev_update"   ON evangelismos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "seg_select"  ON evangelismo_seguimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "seg_insert"  ON evangelismo_seguimientos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "seg_update"  ON evangelismo_seguimientos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "seg_delete"  ON evangelismo_seguimientos FOR DELETE TO authenticated USING (true);

CREATE POLICY "hist_select" ON persona_estado_historial FOR SELECT TO authenticated USING (true);
CREATE POLICY "hist_insert" ON persona_estado_historial FOR INSERT TO authenticated WITH CHECK (true);

-- ── Trigger: auto-Integrada al unirse a un grupo ──────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_integrada_grupo_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_integrada_id  uuid;
  v_estado_nombre text;
BEGIN
  -- Solo actúa si la persona tiene un evangelismo activo
  IF NOT EXISTS (
    SELECT 1 FROM evangelismos
    WHERE persona_id = NEW.persona_id AND deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- Estado actual de la persona
  SELECT lower(ep.nombre) INTO v_estado_nombre
  FROM personas p
  JOIN estados_persona ep ON ep.id = p.estado_persona_id
  WHERE p.id = NEW.persona_id;

  -- Solo promueve si está en estado evangelístico previo a Integrada
  IF v_estado_nombre IN ('evangelizada', 'en seguimiento', 'consolidada') THEN
    SELECT id INTO v_integrada_id
    FROM estados_persona WHERE lower(nombre) = 'integrada' LIMIT 1;

    IF v_integrada_id IS NOT NULL THEN
      UPDATE personas
        SET estado_persona_id = v_integrada_id, updated_at = now()
        WHERE id = NEW.persona_id;

      INSERT INTO persona_estado_historial (persona_id, estado_id, estado_nombre, notas)
        VALUES (NEW.persona_id, v_integrada_id, 'Integrada', 'Auto: ingresó a grupo');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grupo_join_integrada ON grupo_miembros;
CREATE TRIGGER trg_grupo_join_integrada
  AFTER INSERT ON grupo_miembros
  FOR EACH ROW EXECUTE FUNCTION fn_auto_integrada_grupo_join();
