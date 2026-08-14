"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addWeeks, addMonths, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Grupo, FrecuenciaEvento } from "@/types";

export interface FormState {
  nombre: string;
  grupo_id: string;
  todos_grupos: boolean;
  frecuencia: FrecuenciaEvento;
  intervalo: number;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string;
  hora_fin: string;
  descripcion: string;
}

export const INITIAL: FormState = {
  nombre: "",
  grupo_id: "",
  todos_grupos: false,
  frecuencia: "semanal",
  intervalo: 1,
  fecha_inicio: "",
  fecha_fin: "",
  hora_inicio: "",
  hora_fin: "",
  descripcion: "",
};

export function generarFechas(plantilla: {
  fecha_inicio: string;
  fecha_fin: string | null;
  frecuencia: FrecuenciaEvento;
  intervalo: number;
}): Date[] {
  const fechas: Date[] = [];
  let current = parseISO(plantilla.fecha_inicio);
  const end = plantilla.fecha_fin
    ? parseISO(plantilla.fecha_fin)
    : addMonths(current, 3);

  if (plantilla.frecuencia === "unico") return [current];

  while (current <= end) {
    fechas.push(new Date(current));
    if (plantilla.frecuencia === "semanal") {
      current = addWeeks(current, plantilla.intervalo);
    } else if (plantilla.frecuencia === "quincenal") {
      current = addWeeks(current, 2 * plantilla.intervalo);
    } else if (plantilla.frecuencia === "mensual") {
      current = addMonths(current, plantilla.intervalo);
    }
  }

  return fechas;
}

export function useNuevaPlantilla() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [grupos, setGrupos] = useState<Pick<Grupo, "id" | "nombre">[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    plantillaId: string;
    eventosGenerados: number;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("grupos")
      .select("id, nombre")
      .is("deleted_at", null)
      .order("nombre")
      .then(({ data }) => setGrupos(data ?? []));
  }, [supabase]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const previewCount = form.fecha_inicio
    ? generarFechas({
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
        frecuencia: form.frecuencia,
        intervalo: form.intervalo,
      }).length
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!form.fecha_inicio) {
      setError("La fecha de inicio es obligatoria.");
      return;
    }

    setLoading(true);

    const grupoIdFinal = form.todos_grupos ? null : form.grupo_id || null;

    // 1. Insert plantilla
    const { data: plantilla, error: plantillaError } = await supabase
      .from("eventos_plantilla")
      .insert({
        nombre: form.nombre.trim(),
        grupo_id: grupoIdFinal,
        frecuencia: form.frecuencia,
        intervalo: form.intervalo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        descripcion: form.descripcion.trim() || null,
        activo: true,
      })
      .select()
      .single();

    if (plantillaError || !plantilla) {
      setError(plantillaError?.message ?? "Error al crear la plantilla.");
      setLoading(false);
      return;
    }

    // 2. Generate and insert events
    const fechas = generarFechas({
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      frecuencia: form.frecuencia,
      intervalo: form.intervalo,
    });

    const eventosInsert = fechas.map((fecha) => ({
      plantilla_id: plantilla.id,
      grupo_id: grupoIdFinal,
      nombre: form.nombre.trim(),
      fecha: fecha.toISOString().split("T")[0],
      hora_inicio: form.hora_inicio || null,
      hora_fin: form.hora_fin || null,
      estado: "programado" as const,
      descripcion: form.descripcion.trim() || null,
    }));

    const { error: eventosError } = await supabase
      .from("eventos")
      .insert(eventosInsert);

    if (eventosError) {
      setError(
        `Plantilla creada pero error al generar eventos: ${eventosError.message}`,
      );
      setLoading(false);
      return;
    }

    setSuccess({ plantillaId: plantilla.id, eventosGenerados: fechas.length });
    setLoading(false);
  }

  const resetSuccess = () => {
    setSuccess(null);
    setForm(INITIAL);
  };

  return {
    form,
    setForm,
    set,
    grupos,
    loading,
    error,
    setError,
    success,
    setSuccess,
    previewCount,
    handleSubmit,
    resetSuccess,
    router,
  };
}
