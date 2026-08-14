"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EvangelismoSeguimiento } from "@/types";

type SeguimientoWithResp = EvangelismoSeguimiento & {
  responsable: { id: string; nombres: string; apellidos: string } | null;
};

interface UseSeguimientoProps {
  evangelismoId: string;
  initialSeguimientos: SeguimientoWithResp[];
}

export function useSeguimiento({
  evangelismoId,
  initialSeguimientos,
}: UseSeguimientoProps) {
  const supabase = createClient();
  const [seguimientos, setSeguimientos] =
    useState<SeguimientoWithResp[]>(initialSeguimientos);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    fecha: today,
    tipo: "contacto",
    descripcion: "",
    resultado: "pendiente",
  });

  const handleAdd = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("evangelismo_seguimientos")
      .insert({
        evangelismo_id: evangelismoId,
        fecha: form.fecha,
        tipo: form.tipo,
        descripcion: form.descripcion.trim() || null,
        resultado: form.resultado,
      })
      .select("*, responsable:personas!responsable_id(id, nombres, apellidos)")
      .single();

    if (!error && data) {
      const newSeg = {
        ...(data as EvangelismoSeguimiento),
        responsable: null,
      };
      setSeguimientos((prev) =>
        [newSeg, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)),
      );
      setForm({
        fecha: today,
        tipo: "contacto",
        descripcion: "",
        resultado: "pendiente",
      });
      setFormOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async (segId: string) => {
    setDeleting(segId);
    await supabase.from("evangelismo_seguimientos").delete().eq("id", segId);
    setSeguimientos((prev) => prev.filter((s) => s.id !== segId));
    setDeleting(null);
  };

  return {
    seguimientos,
    formOpen,
    setFormOpen,
    deleting,
    saving,
    form,
    setForm,
    handleAdd,
    handleDelete,
    today,
  };
}
