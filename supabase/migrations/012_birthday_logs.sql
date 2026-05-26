-- Birthday email log — prevents duplicate sends per person per year
CREATE TABLE IF NOT EXISTS birthday_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid        NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  anio       integer     NOT NULL,
  enviado_at timestamptz NOT NULL DEFAULT now(),
  correo     text        NOT NULL,
  error      text,
  CONSTRAINT birthday_logs_persona_anio_unique UNIQUE(persona_id, anio)
);

-- Allow cron (service role) and admin reads
ALTER TABLE birthday_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view birthday logs"
  ON birthday_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      WHERE u.id = auth.uid()
        AND lower(r.nombre) IN ('super admin', 'pastor', 'secretaria', 'administrador', 'admin')
    )
  );

CREATE POLICY "Service role bypass"
  ON birthday_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
