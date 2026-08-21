"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import type { Persona } from "@/types";

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

interface UseEditarPersonaProps {
  persona: Persona;
}

export function useEditarPersona({ persona }: UseEditarPersonaProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      telefono: persona.telefono ?? "",
      correo: persona.correo ?? "",
      direccion: persona.direccion ?? "",
      fecha_nacimiento: persona.fecha_nacimiento ?? "",
      tipo_persona: persona.tipo_persona,
      estado_persona_id: persona.estado_persona_id ?? "",
      lider_id: persona.lider_id ?? "",
      observaciones: persona.observaciones ?? "",
    },
  });

  useEffect(() => {
    register("tipo_persona");
    register("estado_persona_id");
    register("lider_id");
  }, [register]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError("");
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        nombres: data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        tipo_persona: data.tipo_persona,
        telefono: data.telefono?.trim() || null,
        correo: data.correo?.trim() || null,
        direccion: data.direccion?.trim() || null,
        fecha_nacimiento: data.fecha_nacimiento || null,
        estado_persona_id: data.estado_persona_id || null,
        lider_id:
          data.lider_id && data.lider_id !== "none" ? data.lider_id : null,
        observaciones: data.observaciones?.trim() || null,
      };

      const { data: updated, error } = await supabase
        .from("personas")
        .update(payload)
        .eq("id", persona.id)
        .select("id")
        .maybeSingle();

      if (error) {
        setServerError(error.message);
        return;
      }
      if (!updated) {
        setServerError(
          "No se pudieron guardar los cambios. Verifica que tengas permiso para editar esta persona.",
        );
        return;
      }
      router.push(`/personas/${persona.id}`);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.push(`/personas/${persona.id}`);
  };

  return {
    serverError,
    loading,
    register,
    handleSubmit,
    setValue,
    watch,
    errors,
    onSubmit,
    goBack,
  };
}
