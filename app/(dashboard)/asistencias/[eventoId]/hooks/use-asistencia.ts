"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import type { Persona, Asistencia, GrupoMiembro, EstadoAsistencia } from "@/types";

export interface EventoInfo {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string;
  grupo: { id: string; nombre: string } | null;
  grupo_id: string | null;
}

export interface MiembroRow {
  personaId: string;
  nombre: string;
  initials: string;
  tipo: string;
  estado: EstadoAsistencia | null;
  asistenciaId: string | null;
  saving: boolean;
}

export interface VisitanteRow {
  id: string;
  nombre: string;
  telefono: string | null;
  estado: "visitante" | "primera_vez";
}

interface UseAsistenciaProps {
  evento: EventoInfo;
  grupoOrigenId: string | null;
  miembrosIniciales: (GrupoMiembro & { persona: Persona })[];
  asistenciasIniciales: (Asistencia & { persona: Persona | null })[];
  usuarioId: string | null;
  hasFullAccess: boolean;
  scopedPersonaIds: string[];
}

export function useAsistencia({
  evento,
  grupoOrigenId,
  miembrosIniciales,
  asistenciasIniciales,
  usuarioId,
  hasFullAccess,
  scopedPersonaIds,
}: UseAsistenciaProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const asistenciasByPersonaId = useMemo(() => {
    const map: Record<string, Asistencia & { persona: Persona | null }> = {};
    asistenciasIniciales.forEach((a) => {
      if (a.persona_id) map[a.persona_id] = a;
    });
    return map;
  }, [asistenciasIniciales]);

  function buildMiembroRow(m: GrupoMiembro & { persona: Persona }): MiembroRow {
    const p = m.persona;
    const existing = asistenciasByPersonaId[p.id];
    return {
      personaId: p.id,
      nombre: `${p.nombres} ${p.apellidos}`,
      initials: getInitials(p.nombres, p.apellidos),
      tipo: p.tipo_persona,
      estado: existing ? existing.estado : null,
      asistenciaId: existing ? existing.id : null,
      saving: false,
    };
  }

  const [rows, setRows] = useState<MiembroRow[]>(() =>
    miembrosIniciales.map(buildMiembroRow),
  );

  const [visitantes, setVisitantes] = useState<VisitanteRow[]>(() =>
    asistenciasIniciales
      .filter((a) => a.es_visitante || !a.persona_id)
      .map((a) => ({
        id: a.id,
        nombre: a.nombre_visitante ?? "Visitante",
        telefono: a.telefono_visitante,
        estado: (a.estado === "primera_vez"
          ? "primera_vez"
          : "visitante") as "visitante" | "primera_vez",
      })),
  );

  const [searchPersona, setSearchPersona] = useState("");
  const [searchResults, setSearchResults] = useState<Persona[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [visitanteModal, setVisitanteModal] = useState(false);
  const [visitanteForm, setVisitanteForm] = useState({
    nombre: "",
    telefono: "",
    estado: "visitante" as "visitante" | "primera_vez",
  });
  const [visitanteSaving, setVisitanteSaving] = useState(false);
  const [visitanteError, setVisitanteError] = useState<string | null>(null);

  const [finalizing, setFinalizing] = useState(false);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const latestEstado = useRef<Record<string, EstadoAsistencia | null>>({});

  const stats = useMemo(() => {
    const asistio = rows.filter((r) => r.estado === "asistio").length;
    const noAsistio = rows.filter(
      (r) => r.estado === "no_asistio" || r.estado === null,
    ).length;
    const totalMiembros = rows.length;
    const pct =
      totalMiembros > 0 ? Math.round((asistio / totalMiembros) * 100) : 0;
    return {
      total: totalMiembros,
      asistio,
      noAsistio,
      visitantes: visitantes.length,
      pct,
    };
  }, [rows, visitantes]);

  const toggleAsistencia = useCallback(
    (personaId: string) => {
      setRows((prev) => {
        const updated = prev.map((r) => {
          if (r.personaId !== personaId) return r;
          const nuevoEstado: EstadoAsistencia =
            r.estado === "asistio" ? "no_asistio" : "asistio";
          latestEstado.current[personaId] = nuevoEstado;
          return { ...r, estado: nuevoEstado, saving: true };
        });
        return updated;
      });

      clearTimeout(debounceTimers.current[personaId]);
      debounceTimers.current[personaId] = setTimeout(async () => {
        const nuevoEstado = latestEstado.current[personaId] ?? "asistio";

        const { data, error } = await supabase
          .from("asistencias")
          .upsert(
            {
              evento_id: evento.id,
              persona_id: personaId,
              estado: nuevoEstado,
              es_visitante: false,
              registrado_por: usuarioId,
            },
            { onConflict: "evento_id,persona_id", ignoreDuplicates: false },
          )
          .select("id")
          .single();

        setRows((prev) =>
          prev.map((r) => {
            if (r.personaId !== personaId) return r;
            return {
              ...r,
              saving: false,
              asistenciaId: error
                ? r.asistenciaId
                : data?.id ?? r.asistenciaId,
            };
          }),
        );
      }, 500);
    },
    [supabase, evento.id, usuarioId],
  );

  const handleSearchPersona = useCallback(
    async (q: string) => {
      setSearchPersona(q);
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      let query = supabase
        .from("personas")
        .select("id, nombres, apellidos, tipo_persona, foto_url")
        .or(`nombres.ilike.%${q}%,apellidos.ilike.%${q}%`)
        .is("deleted_at", null)
        .limit(10);

      if (!hasFullAccess) {
        query = query.or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`);
      }

      const { data } = await query;
      setSearchResults((data ?? []) as Persona[]);
      setSearchLoading(false);
    },
    [supabase, hasFullAccess, scopedPersonaIds],
  );

  const addPersonaFromSearch = useCallback(
    (persona: Persona) => {
      const existing = rows.find((r) => r.personaId === persona.id);
      if (existing) return;
      const newRow: MiembroRow = {
        personaId: persona.id,
        nombre: `${persona.nombres} ${persona.apellidos}`,
        initials: getInitials(persona.nombres, persona.apellidos),
        tipo: persona.tipo_persona,
        estado: null,
        asistenciaId: null,
        saving: false,
      };
      setRows((prev) => [...prev, newRow]);
      setSearchPersona("");
      setSearchResults([]);
    },
    [rows],
  );

  async function handleAddVisitante() {
    if (!visitanteForm.nombre.trim()) {
      setVisitanteError("El nombre es obligatorio.");
      return;
    }
    setVisitanteSaving(true);
    setVisitanteError(null);

    const { data, error } = await supabase
      .from("asistencias")
      .insert({
        evento_id: evento.id,
        persona_id: null,
        estado: visitanteForm.estado,
        es_visitante: true,
        nombre_visitante: visitanteForm.nombre.trim(),
        telefono_visitante: visitanteForm.telefono.trim() || null,
        registrado_por: usuarioId,
      })
      .select("id")
      .single();

    if (error) {
      setVisitanteError(error.message);
      setVisitanteSaving(false);
      return;
    }

    setVisitantes((prev) => [
      ...prev,
      {
        id: data!.id,
        nombre: visitanteForm.nombre.trim(),
        telefono: visitanteForm.telefono.trim() || null,
        estado: visitanteForm.estado,
      },
    ]);
    setVisitanteForm({ nombre: "", telefono: "", estado: "visitante" });
    setVisitanteSaving(false);
    setVisitanteModal(false);
  }

  async function handleFinalizar() {
    setFinalizing(true);

    Object.values(debounceTimers.current).forEach(clearTimeout);
    debounceTimers.current = {};

    const rowsToSave = rows.map((r) => ({
      evento_id: evento.id,
      persona_id: r.personaId,
      estado: r.estado ?? "no_asistio",
      es_visitante: false,
      registrado_por: usuarioId,
    }));

    if (rowsToSave.length > 0) {
      await supabase.from("asistencias").upsert(
        rowsToSave,
        { onConflict: "evento_id,persona_id", ignoreDuplicates: false },
      );
    }

    await supabase
      .from("eventos")
      .update({ estado: "realizado" })
      .eq("id", evento.id);

    setFinalizing(false);
    const queryParts: string[] = [];
    if (grupoOrigenId) {
      queryParts.push(`grupo_id=${grupoOrigenId}`);
    }
    if (tabParam) {
      queryParts.push(`tab=${tabParam}`);
    }
    const params = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    router.push(`/eventos/${evento.id}${params}`);
  }

  const goBack = () => {
    const params = tabParam ? `?tab=${tabParam}` : "";
    router.push(
      grupoOrigenId ? `/grupos/${grupoOrigenId}${params}` : "/eventos",
    );
  };

  return {
    rows,
    setRows,
    visitantes,
    setVisitantes,
    searchPersona,
    searchResults,
    searchLoading,
    visitanteModal,
    setVisitanteModal,
    visitanteForm,
    setVisitanteForm,
    visitanteSaving,
    visitanteError,
    setVisitanteError,
    finalizing,
    stats,
    toggleAsistencia,
    handleSearchPersona,
    addPersonaFromSearch,
    handleAddVisitante,
    handleFinalizar,
    goBack,
  };
}
