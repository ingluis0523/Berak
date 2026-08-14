"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PersonaMinisterio, Persona } from "@/types";

interface UseMinisterioDetalleProps {
  ministerioId: string;
  miembrosIniciales: PersonaMinisterio[];
}

export function useMinisterioDetalle({
  ministerioId,
  miembrosIniciales,
}: UseMinisterioDetalleProps) {
  const supabase = createClient();
  const router = useRouter();

  const [miembros, setMiembros] = useState<PersonaMinisterio[]>(miembrosIniciales);
  const [searchPersona, setSearchPersona] = useState("");
  const [personas, setPersonas] = useState<
    Pick<Persona, "id" | "nombres" | "apellidos" | "tipo_persona">[]
  >([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);

  const handleOpenAddModal = useCallback(async () => {
    setSearchPersona("");
    setSelectedPersonaId(null);
    setAddError(null);

    const { data } = await supabase
      .from("personas")
      .select("id, nombres, apellidos, tipo_persona")
      .is("deleted_at", null)
      .order("nombres");
    setPersonas(data ?? []);
    setAddModalOpen(true);
  }, [supabase]);

  const filteredPersonas = useMemo(() => {
    if (!searchPersona.trim()) return personas;
    const q = searchPersona.toLowerCase();
    return personas.filter(
      (p) =>
        p.nombres.toLowerCase().includes(q) ||
        p.apellidos.toLowerCase().includes(q)
    );
  }, [personas, searchPersona]);

  const handleAddMiembro = async () => {
    if (!selectedPersonaId) return;
    setAddLoading(true);
    setAddError(null);

    const today = new Date().toISOString().split("T")[0];

    // Insert in persona_ministerios
    const { error: insertError } = await supabase.from("persona_ministerios").insert({
      ministerio_id: ministerioId,
      persona_id: selectedPersonaId,
      fecha_ingreso: today,
      activo: true,
    });

    if (insertError) {
      setAddError(insertError.message);
      setAddLoading(false);
      return;
    }

    // Cambiar estado a 'Servidor' (sin modificar tipo_persona)
    let { data: estadoServidor } = await supabase
      .from("estados_persona")
      .select("id")
      .ilike("nombre", "%servidor%")
      .maybeSingle();
    if (!estadoServidor) {
      // Create it if it doesn't exist yet
      const { data: created } = await supabase
        .from("estados_persona")
        .insert({
          nombre: "Servidor",
          descripcion: "Sirve activamente en la iglesia",
          color: "orange",
          orden: 4,
          activo: true,
        })
        .select("id")
        .single();
      estadoServidor = created;
    }
    if (estadoServidor?.id) {
      await supabase
        .from("personas")
        .update({ estado_persona_id: estadoServidor.id })
        .eq("id", selectedPersonaId);
    }

    // Refresh members
    const { data: updated } = await supabase
      .from("persona_ministerios")
      .select("*, persona:personas(id,nombres,apellidos,tipo_persona,foto_url)")
      .eq("ministerio_id", ministerioId)
      .eq("activo", true)
      .order("fecha_ingreso", { ascending: false });

    setMiembros(updated ?? []);
    setAddLoading(false);
    setAddModalOpen(false);
  };

  const handleRemoveMiembro = async (m: PersonaMinisterio) => {
    setRemoveLoadingId(m.id);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("persona_ministerios")
      .update({ activo: false, fecha_salida: today })
      .eq("id", m.id);

    if (!error) {
      setMiembros((prev) => prev.filter((item) => item.id !== m.id));
    }
    setRemoveLoadingId(null);
  };

  const nombrePersona = (p?: Pick<Persona, "nombres" | "apellidos"> | null) =>
    p ? `${p.nombres} ${p.apellidos}` : "—";

  const goBack = () => {
    router.push("/ministerios");
  };

  const goEdit = () => {
    router.push(`/ministerios/${ministerioId}/editar`);
  };

  return {
    miembros,
    searchPersona,
    setSearchPersona,
    selectedPersonaId,
    setSelectedPersonaId,
    addModalOpen,
    setAddModalOpen,
    addLoading,
    addError,
    removeLoadingId,
    handleOpenAddModal,
    filteredPersonas,
    handleAddMiembro,
    handleRemoveMiembro,
    nombrePersona,
    goBack,
    goEdit,
  };
}
