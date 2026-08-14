"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EstadoPersona, ReglaAutomatizacion, TipoRegla } from "@/types";
import { REGLAS_SEED, TIPO_REGLA_OPTIONS } from "../components/constants";

export function useConfiguracionAutomatizaciones() {
  const supabase = createClient();
  const [reglas, setReglas] = useState<ReglaAutomatizacion[]>([]);
  const [estados, setEstados] = useState<EstadoPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    edit: ReglaAutomatizacion | null;
  }>({ open: false, edit: null });

  const seedReglas = async () => {
    const { data: existing } = await supabase
      .from("reglas_automatizacion")
      .select("tipo");
    const existingTypes = new Set(
      (existing ?? []).map((r: { tipo: string }) => r.tipo),
    );
    const toInsert = REGLAS_SEED.filter((r) => !existingTypes.has(r.tipo));
    if (toInsert.length > 0)
      await supabase.from("reglas_automatizacion").insert(toInsert);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    await seedReglas();
    const [{ data: reglasData }, { data: estadosData }] = await Promise.all([
      supabase
        .from("reglas_automatizacion")
        .select("*, estado_resultado:estado_resultado_id(id, nombre, color)")
        .order("created_at"),
      supabase
        .from("estados_persona")
        .select("*")
        .eq("activo", true)
        .order("orden"),
    ]);
    setReglas(reglasData ?? []);
    setEstados(estadosData ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (regla: ReglaAutomatizacion) => {
    setToggling(regla.id);
    await supabase
      .from("reglas_automatizacion")
      .update({ activo: !regla.activo })
      .eq("id", regla.id);
    setReglas((prev) =>
      prev.map((r) => (r.id === regla.id ? { ...r, activo: !r.activo } : r)),
    );
    setToggling(null);
  };

  const handleDelete = async (regla: ReglaAutomatizacion) => {
    if (!window.confirm(`¿Eliminar la regla "${regla.nombre}"?`)) return;
    setDeleting(regla.id);
    await supabase.from("reglas_automatizacion").delete().eq("id", regla.id);
    setReglas((prev) => prev.filter((r) => r.id !== regla.id));
    setDeleting(null);
  };

  // Modal Form State and Logic
  const [form, setForm] = useState({
    nombre: "",
    tipo: "" as TipoRegla | "",
    condicion_valor: "" as string,
    estado_resultado_id: "",
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = useCallback((reglaEdit: ReglaAutomatizacion | null) => {
    if (reglaEdit) {
      setForm({
        nombre: reglaEdit.nombre,
        tipo: reglaEdit.tipo,
        condicion_valor: String(reglaEdit.condicion_valor ?? ""),
        estado_resultado_id: reglaEdit.estado_resultado_id ?? "",
        activo: reglaEdit.activo,
      });
    } else {
      setForm({
        nombre: "",
        tipo: "",
        condicion_valor: "",
        estado_resultado_id: "",
        activo: true,
      });
    }
    setError("");
  }, []);

  const handleTipoChange = (tipo: TipoRegla) => {
    const opt = TIPO_REGLA_OPTIONS.find((o) => o.value === tipo);
    setForm((f) => ({
      ...f,
      tipo,
      nombre: opt?.label ?? f.nombre,
      condicion_valor:
        opt?.defaultValor != null ? String(opt.defaultValor) : "",
    }));
  };

  const handleSaveRegla = async (reglaEdit: ReglaAutomatizacion | null, onSaved: () => void, onClose: () => void) => {
    if (!form.nombre.trim() || !form.tipo) {
      setError("Nombre y tipo son requeridos");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      condicion_valor: form.condicion_valor
        ? parseInt(form.condicion_valor)
        : null,
      accion: "cambiar_estado",
      estado_resultado_id: form.estado_resultado_id || null,
      activo: form.activo,
    };
    if (reglaEdit) {
      const { error: err } = await supabase
        .from("reglas_automatizacion")
        .update(payload)
        .eq("id", reglaEdit.id);
      if (err) {
        setSaving(false);
        setError(err.message);
        return;
      }
    } else {
      const { error: err } = await supabase
        .from("reglas_automatizacion")
        .insert(payload);
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
    reglas,
    estados,
    loading,
    toggling,
    deleting,
    modal,
    setModal,
    loadData,
    handleToggle,
    handleDelete,
    form,
    setForm,
    saving,
    error,
    setError,
    resetForm,
    handleTipoChange,
    handleSaveRegla,
  };
}
