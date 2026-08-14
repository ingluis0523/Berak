"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Ministerio, Persona } from "@/types";

export interface MinisterioWithCount extends Ministerio {
  miembros_count: number;
}

export interface MinisterioForm {
  nombre: string;
  descripcion: string;
  lider_id: string;
}

const defaultForm: MinisterioForm = { nombre: "", descripcion: "", lider_id: "" };

export function useMinisterios() {
  const supabase = createClient();

  const [ministerios, setMinisterios] = useState<MinisterioWithCount[]>([]);
  const [lideres, setLideres] = useState<
    Pick<Persona, "id" | "nombres" | "apellidos">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ministerio | null>(null);
  const [form, setForm] = useState<MinisterioForm>(defaultForm);
  const [formErrors, setFormErrors] = useState<Partial<MinisterioForm>>({});

  const fetchMinisterios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ministerios")
      .select("*, lider:personas!lider_id(id,nombres,apellidos)")
      .is("deleted_at", null)
      .order("nombre");

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: pm } = await supabase
      .from("persona_ministerios")
      .select("ministerio_id")
      .eq("activo", true);
    const countMap: Record<string, number> = {};
    pm?.forEach((r) => {
      if (r.ministerio_id)
        countMap[r.ministerio_id] = (countMap[r.ministerio_id] ?? 0) + 1;
    });

    setMinisterios(
      (data ?? []).map((m) => ({
        ...m,
        miembros_count: countMap[m.id] ?? 0,
      })),
    );
    setLoading(false);
  }, [supabase]);

  const fetchLideres = useCallback(async () => {
    const { data } = await supabase
      .from("personas")
      .select("id, nombres, apellidos")
      .neq("tipo_persona", "visitante")
      .is("deleted_at", null)
      .order("nombres");
    setLideres(data ?? []);
  }, [supabase]);

  useEffect(() => {
    fetchMinisterios();
    fetchLideres();
  }, [fetchMinisterios, fetchLideres]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (m: Ministerio) => {
    setEditing(m);
    setForm({
      nombre: m.nombre,
      descripcion: m.descripcion ?? "",
      lider_id: m.lider_id ?? "",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errors: Partial<MinisterioForm> = {};
    if (!form.nombre.trim()) errors.nombre = "El nombre es requerido";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      lider_id:
        form.lider_id && form.lider_id !== "none" ? form.lider_id : null,
    };

    let err;
    if (editing) {
      const res = await supabase
        .from("ministerios")
        .update(payload)
        .eq("id", editing.id);
      err = res.error;
    } else {
      const res = await supabase
        .from("ministerios")
        .insert({ ...payload, estado: true });
      err = res.error;
    }

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setModalOpen(false);
    fetchMinisterios();
  };

  const nombrePersona = (p?: Pick<Persona, "nombres" | "apellidos"> | null) =>
    p ? `${p.nombres} ${p.apellidos}` : "—";

  return {
    ministerios,
    lideres,
    loading,
    saving,
    error,
    setError,
    modalOpen,
    setModalOpen,
    editing,
    form,
    setForm,
    formErrors,
    openCreate,
    openEdit,
    handleSave,
    nombrePersona,
  };
}
