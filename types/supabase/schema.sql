-- ═══════════════════════════════════════════════════════════════════════════
-- BERAK - IglesiaJCReina
-- Esquema completo de base de datos para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONES ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── 1. ESTADOS DE PERSONA ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estados_persona (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(50) NOT NULL UNIQUE,
  descripcion text,
  color       varchar(20) DEFAULT 'gray',
  orden       int DEFAULT 0,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─── 2. PERSONAS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres          varchar(100) NOT NULL,
  apellidos        varchar(100) NOT NULL,
  telefono         varchar(20),
  correo           varchar(150),
  direccion        text,
  fecha_nacimiento date,
  fecha_registro   date DEFAULT CURRENT_DATE,
  estado_persona_id uuid REFERENCES estados_persona(id),
  lider_id         uuid REFERENCES personas(id),
  observaciones    text,
  tipo_persona     varchar(30) DEFAULT 'visitante'
                   CHECK (tipo_persona IN ('miembro','lider','visitante','servidor','anfitrion','pastor','sublider')),
  foto_url         text,
  deleted_at       timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personas_nombres ON personas USING gin(nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_personas_apellidos ON personas USING gin(apellidos gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_personas_tipo ON personas(tipo_persona);
CREATE INDEX IF NOT EXISTS idx_personas_estado ON personas(estado_persona_id);
CREATE INDEX IF NOT EXISTS idx_personas_deleted ON personas(deleted_at) WHERE deleted_at IS NULL;

-- ─── 3. ROLES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(50) NOT NULL UNIQUE,
  descripcion text,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─── 4. PERMISOS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permisos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(100) NOT NULL UNIQUE,
  modulo      varchar(50)  NOT NULL,
  descripcion text,
  created_at  timestamptz DEFAULT now()
);

-- ─── 5. ROL_PERMISOS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rol_permisos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id     uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id uuid NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  UNIQUE(rol_id, permiso_id)
);

-- ─── 6. USUARIOS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id    uuid REFERENCES personas(id),
  rol_id        uuid REFERENCES roles(id),
  estado        boolean DEFAULT true,
  ultimo_acceso timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);

-- ─── 7. REDES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS redes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(100) NOT NULL,
  lider_id    uuid REFERENCES personas(id),
  descripcion text,
  estado      boolean DEFAULT true,
  deleted_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ─── 8. GRUPOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       varchar(100) NOT NULL,
  lider_id     uuid REFERENCES personas(id),
  sublider_id  uuid REFERENCES personas(id),
  anfitrion_id uuid REFERENCES personas(id),
  red_id       uuid REFERENCES redes(id),
  direccion    text,
  dia_reunion  varchar(20) CHECK (dia_reunion IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  hora_reunion time,
  estado       boolean DEFAULT true,
  deleted_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grupos_red ON grupos(red_id);
CREATE INDEX IF NOT EXISTS idx_grupos_lider ON grupos(lider_id);

-- ─── 9. GRUPO_MIEMBROS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupo_miembros (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id     uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  persona_id   uuid NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  fecha_ingreso date DEFAULT CURRENT_DATE,
  fecha_salida  date,
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grupo_miembros_grupo   ON grupo_miembros(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_persona ON grupo_miembros(persona_id);
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_activo  ON grupo_miembros(activo) WHERE activo = true;

-- Un miembro solo puede estar activo en un grupo a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_grupo_miembros_unique_activo
  ON grupo_miembros(persona_id) WHERE activo = true;

-- ─── 10. MINISTERIOS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ministerios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(100) NOT NULL,
  lider_id    uuid REFERENCES personas(id),
  descripcion text,
  estado      boolean DEFAULT true,
  deleted_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ─── 11. PERSONA_MINISTERIOS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS persona_ministerios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id    uuid NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  ministerio_id uuid NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  fecha_ingreso date DEFAULT CURRENT_DATE,
  fecha_salida  date,
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persona_ministerios_persona    ON persona_ministerios(persona_id);
CREATE INDEX IF NOT EXISTS idx_persona_ministerios_ministerio ON persona_ministerios(ministerio_id);

-- ─── 12. EVENTOS_PLANTILLA ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos_plantilla (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       varchar(150) NOT NULL,
  grupo_id     uuid REFERENCES grupos(id),
  frecuencia   varchar(20) NOT NULL DEFAULT 'semanal'
               CHECK (frecuencia IN ('unico','semanal','quincenal','mensual')),
  intervalo    int DEFAULT 1,
  fecha_inicio date NOT NULL,
  fecha_fin    date,
  hora_inicio  time,
  hora_fin     time,
  descripcion  text,
  activo       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ─── 13. EVENTOS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id uuid REFERENCES eventos_plantilla(id),
  grupo_id     uuid REFERENCES grupos(id),
  nombre       varchar(150) NOT NULL,
  fecha        date NOT NULL,
  hora_inicio  time,
  hora_fin     time,
  estado       varchar(20) DEFAULT 'programado'
               CHECK (estado IN ('programado','realizado','cancelado')),
  descripcion  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_fecha   ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_grupo   ON eventos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_eventos_estado  ON eventos(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_plantilla ON eventos(plantilla_id);

-- ─── 14. ASISTENCIAS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asistencias (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id          uuid NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  persona_id         uuid REFERENCES personas(id),
  estado             varchar(20) DEFAULT 'no_asistio'
                     CHECK (estado IN ('asistio','no_asistio','visitante','primera_vez')),
  es_visitante       boolean DEFAULT false,
  nombre_visitante   varchar(200),
  telefono_visitante varchar(20),
  notas              text,
  registrado_por     uuid REFERENCES auth.users(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE(evento_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_evento  ON asistencias(evento_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_persona ON asistencias(persona_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_estado  ON asistencias(estado);

-- ─── 15. REGLAS_AUTOMATIZACION ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reglas_automatizacion (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             varchar(150) NOT NULL,
  tipo               varchar(50)  NOT NULL
                     CHECK (tipo IN ('ausencias_consecutivas','dias_sin_asistir','asistencias_acumuladas','ingreso_ministerio')),
  condicion_valor    int,
  accion             varchar(50) NOT NULL DEFAULT 'cambiar_estado',
  estado_resultado_id uuid REFERENCES estados_persona(id),
  activo             boolean DEFAULT true,
  created_at         timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCIONES Y TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['personas','usuarios','redes','grupos','ministerios','eventos_plantilla','eventos','asistencias']
  LOOP
    EXECUTE format('
      CREATE OR REPLACE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END;
$$;

-- Trigger: al agregar persona a ministerio → cambiar tipo a servidor
CREATE OR REPLACE FUNCTION on_persona_ministerio_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE personas
  SET tipo_persona = 'servidor', updated_at = now()
  WHERE id = NEW.persona_id
    AND tipo_persona NOT IN ('lider', 'pastor', 'sublider');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_persona_ministerio_tipo
AFTER INSERT ON persona_ministerios
FOR EACH ROW EXECUTE FUNCTION on_persona_ministerio_insert();

-- Función: obtener grupo activo de una persona
CREATE OR REPLACE FUNCTION get_grupo_activo(p_persona_id uuid)
RETURNS TABLE (
  grupo_id   uuid,
  grupo_nombre varchar,
  fecha_ingreso date
) AS $$
  SELECT g.id, g.nombre, gm.fecha_ingreso
  FROM grupo_miembros gm
  JOIN grupos g ON g.id = gm.grupo_id
  WHERE gm.persona_id = p_persona_id AND gm.activo = true
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Función: estadísticas de asistencia de una persona
CREATE OR REPLACE FUNCTION get_asistencia_stats(p_persona_id uuid)
RETURNS TABLE (
  total_eventos      bigint,
  total_asistio      bigint,
  tasa_asistencia    numeric,
  ultimo_evento_fecha date
) AS $$
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE a.estado = 'asistio')::bigint,
    ROUND(COUNT(*) FILTER (WHERE a.estado = 'asistio') * 100.0 / NULLIF(COUNT(*), 0), 1),
    MAX(e.fecha)
  FROM asistencias a
  JOIN eventos e ON e.id = a.evento_id
  WHERE a.persona_id = p_persona_id;
$$ LANGUAGE sql STABLE;

-- Función: ejecutar reglas de automatización para una persona
CREATE OR REPLACE FUNCTION ejecutar_automatizaciones(p_persona_id uuid)
RETURNS void AS $$
DECLARE
  regla        reglas_automatizacion%ROWTYPE;
  ausencias    int;
  dias_inactivo int;
  asistencias_total int;
BEGIN
  FOR regla IN SELECT * FROM reglas_automatizacion WHERE activo = true LOOP

    -- Ausencias consecutivas
    IF regla.tipo = 'ausencias_consecutivas' THEN
      SELECT COUNT(*) INTO ausencias
      FROM (
        SELECT a.estado
        FROM asistencias a
        JOIN eventos e ON e.id = a.evento_id
        WHERE a.persona_id = p_persona_id
        ORDER BY e.fecha DESC
        LIMIT regla.condicion_valor
      ) sub
      WHERE sub.estado = 'no_asistio';

      IF ausencias >= regla.condicion_valor THEN
        UPDATE personas SET estado_persona_id = regla.estado_resultado_id, updated_at = now()
        WHERE id = p_persona_id;
      END IF;

    -- Días sin asistir
    ELSIF regla.tipo = 'dias_sin_asistir' THEN
      SELECT COALESCE(EXTRACT(EPOCH FROM (now() - MAX(e.fecha))) / 86400, 999)::int
      INTO dias_inactivo
      FROM asistencias a
      JOIN eventos e ON e.id = a.evento_id
      WHERE a.persona_id = p_persona_id AND a.estado = 'asistio';

      IF dias_inactivo >= regla.condicion_valor THEN
        UPDATE personas SET estado_persona_id = regla.estado_resultado_id, updated_at = now()
        WHERE id = p_persona_id;
      END IF;

    -- Asistencias acumuladas
    ELSIF regla.tipo = 'asistencias_acumuladas' THEN
      SELECT COUNT(*) INTO asistencias_total
      FROM asistencias
      WHERE persona_id = p_persona_id AND estado = 'asistio';

      IF asistencias_total >= regla.condicion_valor THEN
        UPDATE personas SET estado_persona_id = regla.estado_resultado_id, updated_at = now()
        WHERE id = p_persona_id;
      END IF;

    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger: ejecutar automatizaciones al registrar asistencia
CREATE OR REPLACE FUNCTION on_asistencia_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.persona_id IS NOT NULL THEN
    PERFORM ejecutar_automatizaciones(NEW.persona_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_asistencia_automatizacion
AFTER INSERT OR UPDATE ON asistencias
FOR EACH ROW EXECUTE FUNCTION on_asistencia_change();

-- Función: ultimo acceso del usuario al hacer login
CREATE OR REPLACE FUNCTION on_auth_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE usuarios SET ultimo_acceso = now(), updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_personas_completo AS
SELECT
  p.*,
  ep.nombre  AS estado_nombre,
  ep.color   AS estado_color,
  l.nombres  || ' ' || l.apellidos AS lider_nombre,
  (SELECT gm.grupo_id FROM grupo_miembros gm WHERE gm.persona_id = p.id AND gm.activo = true LIMIT 1) AS grupo_actual_id,
  (SELECT g.nombre FROM grupo_miembros gm JOIN grupos g ON g.id = gm.grupo_id WHERE gm.persona_id = p.id AND gm.activo = true LIMIT 1) AS grupo_actual_nombre
FROM personas p
LEFT JOIN estados_persona ep ON ep.id = p.estado_persona_id
LEFT JOIN personas l ON l.id = p.lider_id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_asistencia_semanal AS
SELECT
  DATE_TRUNC('week', e.fecha) AS semana,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'asistio') AS asistentes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'no_asistio') AS ausentes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado IN ('visitante','primera_vez')) AS visitantes,
  COUNT(DISTINCT e.id) AS total_eventos
FROM eventos e
LEFT JOIN asistencias a ON a.evento_id = e.id
WHERE e.estado != 'cancelado'
GROUP BY DATE_TRUNC('week', e.fecha)
ORDER BY semana DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Habilitar RLS en todas las tablas
ALTER TABLE personas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_persona     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol_permisos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE redes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_miembros      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_ministerios ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_plantilla   ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_automatizacion ENABLE ROW LEVEL SECURITY;

-- Política base: usuario autenticado puede ver/modificar todo
-- (Para producción, refinar por rol usando la función has_permission abajo)
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS boolean AS $$
  SELECT auth.role() = 'authenticated';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Función para verificar permiso de un usuario
CREATE OR REPLACE FUNCTION has_permission(p_permiso_nombre text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    JOIN rol_permisos rp ON rp.rol_id = u.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE u.id = auth.uid() AND p.nombre = p_permiso_nombre
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas: usuarios autenticados tienen acceso completo (ajustar por rol en producción)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'personas','estados_persona','roles','permisos','rol_permisos',
    'usuarios','redes','grupos','grupo_miembros','ministerios',
    'persona_ministerios','eventos_plantilla','eventos','asistencias',
    'reglas_automatizacion'
  ] LOOP
    EXECUTE format('
      CREATE POLICY "Acceso autenticado" ON %s
      FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES (SEED)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Estados de persona
INSERT INTO estados_persona (nombre, descripcion, color, orden) VALUES
  ('nuevo',      'Persona recién registrada',          'blue',   1),
  ('visitante',  'Ha asistido pocas veces',            'purple', 2),
  ('asistente',  'Asiste regularmente',                'green',  3),
  ('servidor',   'Participa activamente en ministerio','orange', 4),
  ('inactivo',   'No ha asistido recientemente',       'gray',   5)
ON CONFLICT (nombre) DO NOTHING;

-- Rol Super Administrador
INSERT INTO roles (nombre, descripcion) VALUES
  ('Super Admin',  'Acceso total al sistema — Pastor Principal'),
  ('Pastor',       'Acceso a todos los módulos operativos'),
  ('Líder',        'Gestión de su grupo y asistencias'),
  ('Secretaria',   'Gestión de personas y reportes'),
  ('Visualizador', 'Solo lectura')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos del sistema
INSERT INTO permisos (nombre, modulo, descripcion) VALUES
  ('ver_personas',           'personas',    'Ver lista de personas'),
  ('crear_personas',         'personas',    'Crear nuevas personas'),
  ('editar_personas',        'personas',    'Editar datos de personas'),
  ('eliminar_personas',      'personas',    'Eliminar personas (soft)'),
  ('ver_grupos',             'grupos',      'Ver grupos'),
  ('crear_grupos',           'grupos',      'Crear grupos'),
  ('editar_grupos',          'grupos',      'Editar grupos'),
  ('gestionar_miembros',     'grupos',      'Agregar/remover miembros de grupos'),
  ('ver_eventos',            'eventos',     'Ver eventos'),
  ('crear_eventos',          'eventos',     'Crear eventos y plantillas'),
  ('editar_eventos',         'eventos',     'Editar eventos'),
  ('cancelar_eventos',       'eventos',     'Cancelar eventos'),
  ('ver_asistencias',        'asistencias', 'Ver registros de asistencia'),
  ('registrar_asistencias',  'asistencias', 'Tomar asistencia'),
  ('editar_asistencias',     'asistencias', 'Editar asistencias existentes'),
  ('ver_reportes',           'reportes',    'Ver reportes'),
  ('exportar_reportes',      'reportes',    'Exportar reportes en CSV'),
  ('gestionar_usuarios',     'sistema',     'Crear y gestionar usuarios'),
  ('gestionar_roles',        'sistema',     'Gestionar roles y permisos'),
  ('ver_configuracion',      'sistema',     'Ver configuración del sistema'),
  ('gestionar_configuracion','sistema',     'Modificar configuración del sistema')
ON CONFLICT (nombre) DO NOTHING;

-- Reglas de automatización por defecto
INSERT INTO reglas_automatizacion (nombre, tipo, condicion_valor, accion, estado_resultado_id)
SELECT
  'Inactivo por 4 ausencias consecutivas',
  'ausencias_consecutivas',
  4,
  'cambiar_estado',
  ep.id
FROM estados_persona ep WHERE ep.nombre = 'inactivo'
ON CONFLICT DO NOTHING;

INSERT INTO reglas_automatizacion (nombre, tipo, condicion_valor, accion, estado_resultado_id)
SELECT
  'Inactivo por 30 días sin asistir',
  'dias_sin_asistir',
  30,
  'cambiar_estado',
  ep.id
FROM estados_persona ep WHERE ep.nombre = 'inactivo'
ON CONFLICT DO NOTHING;

INSERT INTO reglas_automatizacion (nombre, tipo, condicion_valor, accion, estado_resultado_id)
SELECT
  'Asistente regular (10 asistencias)',
  'asistencias_acumuladas',
  10,
  'cambiar_estado',
  ep.id
FROM estados_persona ep WHERE ep.nombre = 'asistente'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN: Crear perfil de usuario al registrarse en auth
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  rol_base uuid;
BEGIN
  SELECT id INTO rol_base FROM roles WHERE nombre = 'Visualizador' LIMIT 1;

  INSERT INTO public.usuarios (id, rol_id, estado)
  VALUES (NEW.id, rol_base, true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users para crear el registro en usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
