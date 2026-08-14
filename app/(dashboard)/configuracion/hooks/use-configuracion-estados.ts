"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EstadoPersona } from "@/types";
import { ESTADOS_SEED } from "../components/constants";

export function useConfiguracionEstados() {
  const supabase = createClient();
  const [estados, setEstados] = useState<EstadoPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    edit: EstadoPersona | null;
  }>({ open: false, edit: null });

  const seedEstados = async () => {
    const { data: existing } = await supabase
      .from("estados_persona")
      .select("nombre");
    const existingNames = new Set(
      (existing ?? []).map((e: { nombre: string }) => e.nombre.toLowerCase()),
    );
    const toInsert = ESTADOS_SEED.filter(
      (e) => !existingNames.has(e.nombre.toLowerCase()),
    );
    if (toInsert.length > 0)
      await supabase.from("estados_persona").insert(toInsert);
  };

  const loadEstados = useCallback(async () => {
    setLoading(true);
    await seedEstados();
    const { data } = await supabase
      .from("estados_persona")
      .select("*")
      .order("orden");
    setEstados(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEstados();
  }, [loadEstados]);

  const handleOrdenChange = async (id: string, orden: number) => {
    setEstados((prev) => prev.map((e) => (e.id === id ? { ...e, orden } : e)));
    await supabase.from("estados_persona").update({ orden }).eq("id", id);
  };

  // Modal form hook logic
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    color: "blue",
    orden: 1,
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = useCallback((estadoEdit: EstadoPersona | null) => {
    if (estadoEdit) {
      setForm({
        nombre: estadoEdit.nombre,
        descripcion: estadoEdit.descripcion ?? "",
        color: estadoEdit.color ?? "blue",
        orden: estadoEdit.orden,
        activo: estadoEdit.activo,
      });
    } else {
      setForm({
        nombre: "",
        descripcion: "",
        color: "blue",
        orden: 1,
        activo: true,
      });
    }
    setError("");
  }, []);

  const handleSaveEstado = async (estadoEdit: EstadoPersona | null, onSaved: () => void, onClose: () => void) => {
    if (!form.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setSaving(true);
    setError("");
    if (estadoEdit) {
      const { error: err } = await supabase
        .from("estados_persona")
        .update({
          nombre: form.nombre.trim(),
          descripcion: form.descripcion || null,
          color: form.color,
          orden: form.orden,
          activo: form.activo,
        })
        .eq("id", estadoEdit.id);
      if (err) {
        setSaving(false);
        setError(err.message);
        return;
      }
    } else {
      const { error: err } = await supabase.from("estados_persona").insert({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        color: form.color,
        orden: form.orden,
        activo: form.activo,
      });
      if (err) {
        setSaving(false);
        setError(err.message);
        return;
      }
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return {
    estados,
    loading,
    modal,
    setModal,
    loadEstados,
    handleOrdenChange,
    form,
    setForm,
    saving,
    error,
    setError,
    resetForm,
    handleSaveEstado,
  };
}
