"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Persona, Red, DiaSemana } from "@/types";

export const grupoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(120),
  lider_id: z.string().min(1, "El líder es requerido"),
  sublider_id: z.string().optional(),
  anfitrion_id: z.string().optional(),
  red_id: z.string().optional(),
  direccion: z.string().optional(),
  dia_reunion: z.string().optional(),
  hora_reunion: z.string().optional(),
  estado: z.boolean(),
});

export type GrupoFormData = z.infer<typeof grupoSchema>;
export type FormErrors = Partial<Record<keyof GrupoFormData, string>>;

export const DIAS: { value: DiaSemana; label: string }[] = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

interface UseNuevoGrupoProps {
  defaultRedId: string | null;
  lockRed: boolean;
  redes: Pick<Red, "id" | "nombre">[];
}

export function useNuevoGrupo({
  defaultRedId,
  lockRed,
  redes,
}: UseNuevoGrupoProps) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [form, setForm] = useState<GrupoFormData>({
    nombre: "",
    lider_id: "",
    sublider_id: "",
    anfitrion_id: "",
    red_id: defaultRedId ?? "",
    direccion: "",
    dia_reunion: "",
    hora_reunion: "",
    estado: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const setField = <K extends keyof GrupoFormData>(
    key: K,
    value: GrupoFormData[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleLiderChange = async (personaId: string) => {
    setField("lider_id", personaId);
    if (!personaId || personaId === "none") return;
    // If red is locked, don't override it with the lider's red
    if (lockRed) return;
    const { data: gm } = await supabase
      .from("grupo_miembros")
      .select("grupo:grupos(red_id)")
      .eq("persona_id", personaId)
      .eq("activo", true)
      .maybeSingle();
    const grupoRaw = gm?.grupo;
    const grupo = (
      Array.isArray(grupoRaw) ? grupoRaw[0] : grupoRaw
    ) as { red_id: string | null } | null;
    const redId = grupo?.red_id;
    if (redId) setField("red_id", redId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    const result = grupoSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((err) => {
        const key = err.path[0] as keyof GrupoFormData;
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const toId = (v?: string) => (v && v !== "none" ? v : null);
    const payload = {
      nombre: form.nombre.trim(),
      lider_id: toId(form.lider_id),
      sublider_id: toId(form.sublider_id),
      anfitrion_id: toId(form.anfitrion_id),
      red_id: toId(form.red_id),
      direccion: form.direccion?.trim() || null,
      dia_reunion: (form.dia_reunion && form.dia_reunion !== "none"
        ? form.dia_reunion
        : null) as DiaSemana | null,
      hora_reunion: form.hora_reunion || null,
      estado: form.estado,
    };

    const { error } = await supabase.from("grupos").insert(payload);
    if (error) {
      setSaving(false);
      setGlobalError(error.message);
      return;
    }

    const updates: Promise<unknown>[] = [];
    if (form.lider_id)
      updates.push(
        Promise.resolve(
          supabase
            .from("personas")
            .update({ tipo_persona: "lider" })
            .eq("id", form.lider_id),
        ),
      );
    if (form.sublider_id && form.sublider_id !== "none")
      updates.push(
        Promise.resolve(
          supabase
            .from("personas")
            .update({ tipo_persona: "sublider" })
            .eq("id", form.sublider_id),
        ),
      );
    if (form.anfitrion_id && form.anfitrion_id !== "none")
      updates.push(
        Promise.resolve(
          supabase
            .from("personas")
            .update({ tipo_persona: "anfitrion" })
            .eq("id", form.anfitrion_id),
        ),
      );
    if (updates.length > 0) await Promise.all(updates);

    setSaving(true);
    router.push("/grupos");
  };

  const redNombreLocked = lockRed
    ? redes.find((r) => r.id === defaultRedId)?.nombre ?? null
    : null;

  const goBack = () => {
    router.push("/grupos");
  };

  return {
    saving,
    globalError,
    form,
    errors,
    setField,
    handleLiderChange,
    handleSubmit,
    redNombreLocked,
    goBack,
  };
}
