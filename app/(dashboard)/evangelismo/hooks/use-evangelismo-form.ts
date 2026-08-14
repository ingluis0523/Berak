"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type PersonaBasic = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string | null;
};

export function useEvangelismoForm() {
  const router = useRouter();
  const supabase = createClient();

  const [personaMode, setPersonaMode] = useState<"buscar" | "nueva">("buscar");
  const [selectedPersona, setSelectedPersona] = useState<PersonaBasic | null>(
    null,
  );
  const [nuevaPersona, setNuevaPersona] = useState({
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
  });

  // Persona search for evangelizado (solo buscar mode)
  const [personaSearch, setPersonaSearch] = useState("");
  const [personaResults, setPersonaResults] = useState<PersonaBasic[]>([]);

  const [selectedEv, setSelectedEv] = useState<PersonaBasic | null>(null);
  const [selectedEnc, setSelectedEnc] = useState<PersonaBasic | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState(today);
  const [lugar, setLugar] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!personaSearch || personaSearch.length < 2) {
      setPersonaResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("personas")
        .select("id, nombres, apellidos, correo, telefono")
        .or(
          `nombres.ilike.%${personaSearch}%,apellidos.ilike.%${personaSearch}%`,
        )
        .is("deleted_at", null)
        .limit(8);
      setPersonaResults((data ?? []) as PersonaBasic[]);
    }, 300);
    return () => clearTimeout(t);
  }, [personaSearch, supabase]);

  const handleSubmit = useCallback(async () => {
    setError("");

    if (personaMode === "buscar" && !selectedPersona) {
      setError("Selecciona una persona evangelizada");
      return;
    }
    if (
      personaMode === "nueva" &&
      (!nuevaPersona.nombres.trim() || !nuevaPersona.apellidos.trim())
    ) {
      setError("Nombres y apellidos son requeridos");
      return;
    }
    if (!fecha) {
      setError("La fecha de evangelismo es requerida");
      return;
    }

    setSaving(true);

    // Obtener estado "Evangelizada"
    const { data: estadoRow } = await supabase
      .from("estados_persona")
      .select("id")
      .ilike("nombre", "evangelizada")
      .limit(1)
      .maybeSingle();

    let personaId: string;

    if (personaMode === "nueva") {
      const { data: newP, error: pErr } = await supabase
        .from("personas")
        .insert({
          nombres: nuevaPersona.nombres.trim(),
          apellidos: nuevaPersona.apellidos.trim(),
          correo: nuevaPersona.correo.trim() || null,
          telefono: nuevaPersona.telefono.trim() || null,
          tipo_persona: "visitante",
          estado_persona_id: estadoRow?.id ?? null,
        })
        .select("id")
        .single();

      if (pErr || !newP) {
        setError(pErr?.message ?? "Error creando la persona");
        setSaving(false);
        return;
      }
      personaId = newP.id;
    } else {
      personaId = selectedPersona!.id;
      if (estadoRow?.id) {
        await supabase
          .from("personas")
          .update({
            estado_persona_id: estadoRow.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", personaId);
      }
    }

    // Crear evangelismo
    const { data: ev, error: evErr } = await supabase
      .from("evangelismos")
      .insert({
        persona_id: personaId,
        evangelizador_id: selectedEv?.id ?? null,
        encargado_id: selectedEnc?.id ?? null,
        fecha_evangelismo: fecha,
        lugar: lugar.trim() || null,
        notas: notas.trim() || null,
      })
      .select("id")
      .single();

    if (evErr || !ev) {
      setError(evErr?.message ?? "Error registrando el evangelismo");
      setSaving(false);
      return;
    }

    // Log cambio de estado
    if (estadoRow?.id) {
      await supabase.from("persona_estado_historial").insert({
        persona_id: personaId,
        estado_id: estadoRow.id,
        estado_nombre: "Evangelizada",
        notas: `Evangelismo registrado${lugar ? ` en ${lugar}` : ""}`,
      });
    }

    router.push(`/evangelismo/${ev.id}`);
  }, [
    personaMode,
    selectedPersona,
    nuevaPersona,
    fecha,
    lugar,
    notas,
    selectedEv,
    selectedEnc,
    router,
    supabase,
  ]);

  const goBack = () => {
    router.push("/evangelismo");
  };

  return {
    personaMode,
    setPersonaMode,
    selectedPersona,
    setSelectedPersona,
    nuevaPersona,
    setNuevaPersona,
    personaSearch,
    setPersonaSearch,
    personaResults,
    selectedEv,
    setSelectedEv,
    selectedEnc,
    setSelectedEnc,
    fecha,
    setFecha,
    lugar,
    setLugar,
    notas,
    setNotas,
    saving,
    error,
    handleSubmit,
    goBack,
  };
}
