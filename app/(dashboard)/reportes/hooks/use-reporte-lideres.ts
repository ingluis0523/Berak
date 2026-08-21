"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getNombreCompleto } from "@/lib/utils";
import { subDays, subMonths, parseISO, isAfter } from "date-fns";
import { useReporteScope } from "./use-reporte-scope";

export function useReporteLideres() {
  const supabase = createClient();
  const { loading: loadingScope, hasFullAccess, myGroupIds, scopedPersonaIds } = useReporteScope();
  const [loading, setLoading] = useState(true);
  const [lideres, setLideres] = useState<
    {
      id: string;
      nombre: string;
      grupo: string;
      eventosRegistrados: number;
      pctRegistrado: number;
      activo: boolean;
    }[]
  >([]);

  useEffect(() => {
    if (loadingScope) return;
    const load = async () => {
      setLoading(true);
      const hoy = new Date();
      const hace1m = subMonths(hoy, 1);
      const hace2sem = subDays(hoy, 14);

      // Mapeo de usuarios (auth.users id) a personas (persona_id)
      const { data: usuariosData } = await supabase
        .from("usuarios")
        .select("id, persona_id");

      const userToPersonaMap = new Map<string, string>();
      for (const u of usuariosData ?? []) {
        if (u.id && u.persona_id) {
          userToPersonaMap.set(u.id, u.persona_id);
        }
      }

      // Grupos de cada líder
      let gruposQuery = supabase
        .from("grupos")
        .select("id, lider_id, sublider_id, nombre")
        .eq("estado", true);
      if (!hasFullAccess) {
        if (myGroupIds.length > 0) {
          gruposQuery = gruposQuery.in("id", myGroupIds);
        } else {
          gruposQuery = gruposQuery.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      }
      const { data: gruposData } = await gruposQuery;

      const idsLideresGrupo = new Set<string>();
      const grupoByLider = new Map<string, string>();
      const gruposLiderMap = new Map<string, Set<string>>();

      for (const g of gruposData ?? []) {
        if (g.lider_id) {
          idsLideresGrupo.add(g.lider_id);
          if (!grupoByLider.has(g.lider_id))
            grupoByLider.set(g.lider_id, g.nombre);
          if (!gruposLiderMap.has(g.lider_id))
            gruposLiderMap.set(g.lider_id, new Set());
          gruposLiderMap.get(g.lider_id)!.add(g.id);
        }
        if (g.sublider_id) {
          idsLideresGrupo.add(g.sublider_id);
          if (!grupoByLider.has(g.sublider_id))
            grupoByLider.set(g.sublider_id, g.nombre);
          if (!gruposLiderMap.has(g.sublider_id))
            gruposLiderMap.set(g.sublider_id, new Set());
          gruposLiderMap.get(g.sublider_id)!.add(g.id);
        }
      }

      // Líderes y sublíderes en personas o asignados a grupos
      let personasQuery = supabase
        .from("personas")
        .select("id, nombres, apellidos, tipo_persona")
        .is("deleted_at", null);
      if (!hasFullAccess) {
        personasQuery = personasQuery.or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`);
      }
      const { data: personasData } = await personasQuery;

      const listaLideres = (personasData ?? []).filter(
        (p) =>
          p.tipo_persona === "lider" ||
          p.tipo_persona === "sublider" ||
          idsLideresGrupo.has(p.id),
      );

      // Eventos del último mes
      let eventosQuery = supabase
        .from("eventos")
        .select("id, grupo_id")
        .gte("fecha", hace1m.toISOString().split("T")[0])
        .neq("estado", "cancelado");
      if (!hasFullAccess) {
        if (myGroupIds.length > 0) {
          eventosQuery = eventosQuery.or(`grupo_id.is.null,grupo_id.in.(${myGroupIds.join(",")})`);
        } else {
          eventosQuery = eventosQuery.is("grupo_id", null);
        }
      }
      const { data: eventosData } = await eventosQuery;

      const totalEventosGenerales = (eventosData ?? []).length;

      // Asistencias registradas por líder (campo registrado_por contiene auth.users id)
      const { data: asistenciasData } = await supabase
        .from("asistencias")
        .select("registrado_por, evento_id, created_at")
        .gte("created_at", hace1m.toISOString());

      const eventosRegistradosPorLider = new Map<string, Set<string>>();
      const ultimaActividad = new Map<string, string>();

      for (const a of asistenciasData ?? []) {
        if (!a.registrado_por) continue;
        const personaId =
          userToPersonaMap.get(a.registrado_por) || a.registrado_por;

        if (!eventosRegistradosPorLider.has(personaId)) {
          eventosRegistradosPorLider.set(personaId, new Set());
        }
        eventosRegistradosPorLider.get(personaId)!.add(a.evento_id);

        const prev = ultimaActividad.get(personaId);
        if (!prev || a.created_at > prev)
          ultimaActividad.set(personaId, a.created_at);
      }

      const result = listaLideres
        .map((p) => {
          const misGrupos = gruposLiderMap.get(p.id);
          let eventosEsperados = 0;

          if (misGrupos && misGrupos.size > 0) {
            eventosEsperados = (eventosData ?? []).filter(
              (e) => e.grupo_id && misGrupos.has(e.grupo_id),
            ).length;
          }

          if (eventosEsperados === 0) {
            eventosEsperados = totalEventosGenerales;
          }

          const registrados = eventosRegistradosPorLider.get(p.id)?.size ?? 0;
          const pct =
            eventosEsperados > 0
              ? Math.min(
                  100,
                  Math.round((registrados / eventosEsperados) * 100),
                )
              : 0;
          const ultima = ultimaActividad.get(p.id);
          const activo = ultima
            ? isAfter(parseISO(ultima), hace2sem)
            : registrados > 0;
          return {
            id: p.id,
            nombre: getNombreCompleto(p.nombres, p.apellidos),
            grupo: grupoByLider.get(p.id) ?? "—",
            eventosRegistrados: registrados,
            pctRegistrado: pct,
            activo,
          };
        })
        .sort((a, b) => b.eventosRegistrados - a.eventosRegistrados);

      setLideres(result);
      setLoading(false);
    };
    load();
  }, [supabase, loadingScope, hasFullAccess, myGroupIds, scopedPersonaIds]);

  const top10 = lideres.slice(0, 10);

  return {
    loading,
    lideres,
    top10,
  };
}
