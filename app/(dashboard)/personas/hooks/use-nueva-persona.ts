"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { TIPO_PERSONA_LABELS } from "@/lib/utils";
import type { TipoPersona } from "@/types";

export const schema = z.object({
  nombres: z.string().min(2, "Mínimo 2 caracteres").max(100),
  apellidos: z.string().min(2, "Mínimo 2 caracteres").max(100),
  telefono: z.string().optional(),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  tipo_persona: z.enum([
    "miembro",
    "lider",
    "visitante",
    "anfitrion",
    "pastor",
    "sublider",
    "anciano",
    "servidor",
  ] as const),
  estado_persona_id: z.string().optional(),
  lider_id: z.string().optional(),
  observaciones: z.string().optional(),
});

export type FormData = z.infer<typeof schema>;

export const TIPO_OPTIONS = (
  Object.entries(TIPO_PERSONA_LABELS) as [TipoPersona, string][]
).filter(([val]) => val !== "servidor");

export function useNuevaPersona() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redNombre, setRedNombre] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_persona: "visitante" },
  });

  async function handleLiderChange(v: string) {
    setValue("lider_id", v);
    setRedNombre(null);
    if (!v || v === "none") return;
    const supabase = createClient();
    const { data: gm } = await supabase
      .from("grupos")
      .select("redes(nombre)")
      .eq("lider_id", v)
      .eq("estado", true)
      .is("deleted_at", null)
      .maybeSingle();
    const redRaw = gm?.redes as unknown;
    const red = (
      Array.isArray(redRaw) ? redRaw[0] : redRaw
    ) as { nombre: string } | null;
    setRedNombre(red?.nombre ?? null);
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError("");
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        nombres: data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        tipo_persona: data.tipo_persona,
      };
      if (data.telefono) payload.telefono = data.telefono.trim();
      if (data.correo) payload.correo = data.correo.trim();
      if (data.direccion) payload.direccion = data.direccion.trim();
      if (data.fecha_nacimiento) payload.fecha_nacimiento = data.fecha_nacimiento;
      if (data.estado_persona_id)
        payload.estado_persona_id = data.estado_persona_id;
      if (data.lider_id && data.lider_id !== "none")
        payload.lider_id = data.lider_id;
      if (data.observaciones) payload.observaciones = data.observaciones.trim();

      const { error } = await supabase.from("personas").insert(payload);
      if (error) {
        setServerError(error.message);
        return;
      }
      router.push("/personas");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.push("/personas");
  };

  return {
    serverError,
    loading,
    redNombre,
    register,
    handleSubmit,
    setValue,
    watch,
    errors,
    handleLiderChange,
    onSubmit,
    goBack,
  };
}
