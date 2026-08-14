-- Crear vista para reporte de personas inactivas
CREATE OR REPLACE VIEW public.reporte_personas_inactivas WITH (security_invoker = true) AS
WITH last_attendances AS (
  SELECT DISTINCT ON (persona_id)
    persona_id,
    e.fecha as fecha_evento,
    e.nombre as nombre_evento,
    a.created_at as fecha_registro_asistencia
  FROM public.asistencias a
  JOIN public.eventos e ON a.evento_id = e.id
  WHERE a.estado = 'asistio'
  ORDER BY persona_id, e.fecha DESC, a.created_at DESC
)
SELECT 
  p.id,
  p.nombres,
  p.apellidos,
  p.fecha_registro,
  la.nombre_evento as ultimo_evento_nombre,
  la.fecha_evento as ultimo_evento_fecha,
  la.fecha_registro_asistencia as ultimo_evento_creado,
  COALESCE(
    CURRENT_DATE - la.fecha_evento::date,
    CURRENT_DATE - p.fecha_registro::date
  ) as dias_sin_asistir
FROM public.personas p
LEFT JOIN last_attendances la ON la.persona_id = p.id
WHERE p.deleted_at IS NULL
  AND p.tipo_persona != 'visitante'
  AND COALESCE(
    CURRENT_DATE - la.fecha_evento::date,
    CURRENT_DATE - p.fecha_registro::date
  ) >= 30;

-- Crear vista para reporte de personas nuevas (con su grupo actual)
CREATE OR REPLACE VIEW public.reporte_personas_nuevas WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.nombres,
  p.apellidos,
  p.fecha_registro,
  (
    SELECT g.nombre 
    FROM public.grupo_miembros gm
    JOIN public.grupos g ON gm.grupo_id = g.id
    WHERE gm.persona_id = p.id
      AND gm.activo = true
    LIMIT 1
  ) as grupo_nombre
FROM public.personas p
WHERE p.deleted_at IS NULL;
