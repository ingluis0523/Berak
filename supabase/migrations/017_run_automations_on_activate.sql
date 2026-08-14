-- Trigger: ejecutar automatizaciones para todos los miembros cuando una regla activa se crea o modifica
CREATE OR REPLACE FUNCTION public.on_regla_activa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activo = true THEN
    PERFORM public.ejecutar_automatizaciones(id) 
    FROM public.personas 
    WHERE deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_regla_activa
AFTER INSERT OR UPDATE ON public.reglas_automatizacion
FOR EACH ROW
EXECUTE FUNCTION public.on_regla_activa();
