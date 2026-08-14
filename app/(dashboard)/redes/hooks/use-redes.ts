"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Red, Persona } from "@/types";

export interface RedWithCount extends Red {
  grupos_count: number;
}

export interface RedFormState {
  nombre: string;
  descripcion: string;
  lider_id: string;
}

const defaultForm: RedFormState = { nombre: "", descripcion: "", lider_id: "" };

interface UseRedesProps {
  filterRedId: string | null | undefined;
}

export function useRedes({ filterRedId }: UseRedesProps) {
  const supabase = createClient();

  const [redes, setRedes] = useState<RedWithCount[]>([]);
  const [lideres, setLideres] = useState<
    Pick<Persona, "id" | "nombres" | "apellidos">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRed, setEditingRed] = useState<Red | null>(null);
  const [form, setForm] = useState<RedFormState>(defaultForm);
  const [formErrors, setFormErrors] = useState<Partial<RedFormState>>({});

  const fetchRedes = useCallback(async () => {
    setLoading(true);

    if (filterRedId === undefined) {
      setRedes([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("redes")
      .select("*, lider:personas!lider_id(id,nombres,apellidos)")
      .is("deleted_at", null)
      .order("nombre");

    if (filterRedId !== null) {
      query = query.eq("id", filterRedId);
    }

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: grupos } = await supabase
      .from("grupos")
      .select("red_id")
      .is("deleted_at", null)
      .eq("estado", true);

    const countMap: Record<string, number> = {};
    grupos?.forEach((g) => {
      if (g.red_id) countMap[g.red_id] = (countMap[g.red_id] ?? 0) + 1;
    });

    setRedes(
      (data ?? []).map((r) => ({
        ...r,
        grupos_count: countMap[r.id] ?? 0,
      })),
    );
    setLoading(false);
  }, [supabase, filterRedId]);

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
    fetchRedes();
    fetchLideres();
  }, [fetchRedes, fetchLideres]);

  const openCreate = () => {
    setEditingRed(null);
    setForm(defaultForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (red: Red) => {
    setEditingRed(red);
    setForm({
      nombre: red.nombre,
      descripcion: red.descripcion ?? "",
      lider_id: red.lider_id ?? "",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<RedFormState> = {};
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
    if (editingRed) {
      const res = await supabase
        .from("redes")
        .update(payload)
        .eq("id", editingRed.id);
      err = res.error;
    } else {
      const res = await supabase
        .from("redes")
        .insert({ ...payload, estado: true });
      err = res.error;
    }

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setModalOpen(false);
    fetchRedes();
  };

  const handleToggleEstado = async (red: Red) => {
    const { error } = await supabase
      .from("redes")
      .update({ estado: !red.estado })
      .eq("id", red.id);
    if (error) {
      setError(error.message);
      return;
    }
    fetchRedes();
  };

  const nombrePersona = (p?: Pick<Persona, "nombres" | "apellidos"> | null) =>
    p ? `${p.nombres} ${p.apellidos}` : "—";

  return {
    redes,
    lideres,
    loading,
    saving,
    error,
    setError,
    modalOpen,
    setModalOpen,
    editingRed,
    form,
    setForm,
    formErrors,
    openCreate,
    openEdit,
    handleSave,
    handleToggleEstado,
    nombrePersona,
  };
}
