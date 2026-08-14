"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Grupo } from "@/types";

export interface FormState {
  nombre: string;
  grupo_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  todos_grupos: boolean;
}

export const EMPTY: FormState = {
  nombre: "",
  grupo_id: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  todos_grupos: false,
};

export function useNuevoEvento() {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [grupos, setGrupos] = useState<Pick<Grupo, "id" | "nombre">[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("grupos")
      .select("id, nombre")
      .is("deleted_at", null)
      .order("nombre")
      .then(({ data }) => setGrupos(data ?? []));
  }, [open, supabase]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!form.fecha) {
      setError("La fecha es obligatoria.");
      return;
    }

    setLoading(true);

    if (form.todos_grupos) {
      // Create a single global event (grupo_id = null) visible to all groups
      const { data, error: insertError } = await supabase
        .from("eventos")
        .insert({
          nombre: form.nombre.trim(),
          grupo_id: null,
          fecha: form.fecha,
          hora_inicio: form.hora_inicio || null,
          hora_fin: form.hora_fin || null,
          estado: "programado",
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
      if (data?.id) router.push(`/eventos/${data.id}`);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("eventos")
      .insert({
        nombre: form.nombre.trim(),
        grupo_id: form.grupo_id || null,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        estado: "programado",
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    setForm(EMPTY);
    router.refresh();
    if (data?.id) router.push(`/eventos/${data.id}`);
  }

  const openModal = () => {
    setOpen(true);
    setForm(EMPTY);
    setError(null);
  };

  return {
    open,
    setOpen,
    form,
    setForm,
    set,
    grupos,
    loading,
    error,
    handleSubmit,
    openModal,
  };
}
