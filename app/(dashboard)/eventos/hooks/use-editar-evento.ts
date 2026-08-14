"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Evento, EstadoEvento } from "@/types";

interface UseEditarEventoProps {
  evento: Evento;
}

export function useEditarEvento({ evento }: UseEditarEventoProps) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(evento.nombre);
  const [grupoId, setGrupoId] = useState(evento.grupo_id ?? "");
  const [fecha, setFecha] = useState(evento.fecha);
  const [horaInicio, setHoraInicio] = useState(evento.hora_inicio ?? "");
  const [horaFin, setHoraFin] = useState(evento.hora_fin ?? "");
  const [estado, setEstado] = useState<EstadoEvento>(evento.estado);
  const [descripcion, setDescripcion] = useState(evento.descripcion ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("eventos")
      .update({
        nombre: nombre.trim(),
        grupo_id: grupoId || null,
        fecha,
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        estado,
        descripcion: descripcion.trim() || null,
      })
      .eq("id", evento.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push(`/eventos/${evento.id}`);
    router.refresh();
  }

  const goBack = () => {
    router.push(`/eventos/${evento.id}`);
  };

  return {
    saving,
    error,
    setError,
    nombre,
    setNombre,
    grupoId,
    setGrupoId,
    fecha,
    setFecha,
    horaInicio,
    setHoraInicio,
    horaFin,
    setHoraFin,
    estado,
    setEstado,
    descripcion,
    setDescripcion,
    handleSubmit,
    goBack,
  };
}
