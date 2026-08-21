"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfWeek, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getRangoDates, type RangoType } from "../components/helpers";
import { useReporteScope } from "./use-reporte-scope";

export function useReporteAsistencia() {
  const supabase = createClient();
  const { loading: loadingScope, hasFullAccess, myGroupIds, scopedPersonaIds } = useReporteScope();
  const [rango, setRango] = useState<RangoType>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<
    {
      id: string;
      nombre: string;
      fecha: string;
      total: number;
      ausentes: number;
      visitantes: number;
    }[]
  >([]);
  const [chartData, setChartData] = useState<
    { semana: string; asistentes: number }[]
  >([]);

  const loadData = useCallback(async () => {
    if (loadingScope) return;
    setLoading(true);
    const { from, to } = getRangoDates(rango, desde, hasta);

    // Fetch active group members count for group events context
    let gmQuery = supabase
      .from("grupo_miembros")
      .select("grupo_id")
      .eq("activo", true);
    if (!hasFullAccess) {
      if (myGroupIds.length > 0) {
        gmQuery = gmQuery.in("grupo_id", myGroupIds);
      } else {
        gmQuery = gmQuery.eq("grupo_id", "00000000-0000-0000-0000-000000000000");
      }
    }
    const { data: miembrosData } = await gmQuery;

    const groupCounts: Record<string, number> = {};
    (miembrosData ?? []).forEach((gm) => {
      if (gm.grupo_id) {
        groupCounts[gm.grupo_id] = (groupCounts[gm.grupo_id] ?? 0) + 1;
      }
    });

    // Fetch total active personas registered in the platform (deleted_at is null)
    let totalPersonasQuery = supabase
      .from("personas")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    if (!hasFullAccess) {
      totalPersonasQuery = totalPersonasQuery.or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`);
    }
    const { count: totalPersonas } = await totalPersonasQuery;

    const totalRegistrados = totalPersonas ?? 0;

    let eventosQuery = supabase
      .from("eventos")
      .select("id, nombre, fecha, grupo_id, asistencias(estado, es_visitante, persona_id, persona:persona_id(lider_id))")
      .gte("fecha", from.toISOString().split("T")[0])
      .lte("fecha", to.toISOString().split("T")[0])
      .neq("estado", "cancelado")
      .order("fecha", { ascending: false });

    if (!hasFullAccess) {
      if (myGroupIds.length > 0) {
        eventosQuery = eventosQuery.or(`grupo_id.is.null,grupo_id.in.(${myGroupIds.join(",")})`);
      } else {
        eventosQuery = eventosQuery.is("grupo_id", null);
      }
    }

    const { data: eventosData } = await eventosQuery;

    const processed = (eventosData ?? []).map((ev) => {
      const asistencias = (ev.asistencias ?? []) as {
        estado: string;
        es_visitante: boolean;
        persona_id: string | null;
        persona?: { lider_id: string | null } | null;
      }[];
      const total = asistencias.filter(
        (a) => {
          const persona = a.persona as any;
          const isScoped = hasFullAccess || a.es_visitante || (a.persona_id && (
            scopedPersonaIds.includes(a.persona_id) || 
            (persona?.lider_id && scopedPersonaIds.includes(persona.lider_id))
          ));
          return a.estado === "asistio" && isScoped;
        }
      ).length;
      const visitantes = asistencias.filter(
        (a) => a.estado === "visitante" || a.estado === "primera_vez",
      ).length;

      const totalEsperados = ev.grupo_id
        ? (groupCounts[ev.grupo_id] ?? 0)
        : totalRegistrados;

      const ausentes = Math.max(totalEsperados - total, 0);

      return {
        id: ev.id,
        nombre: ev.nombre,
        fecha: ev.fecha,
        total,
        ausentes,
        visitantes,
      };
    });
    setEventos(processed);

    // Agrupar por semana para el gráfico
    const weekMap = new Map<string, number>();
    for (const ev of processed) {
      const wk = format(
        startOfWeek(parseISO(ev.fecha), { locale: es }),
        "dd/MM",
        { locale: es },
      );
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + ev.total);
    }
    setChartData(
      Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([semana, asistentes]) => ({ semana, asistentes })),
    );

    setLoading(false);
  }, [rango, desde, hasta, supabase, loadingScope, hasFullAccess, myGroupIds, scopedPersonaIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalAsistentes = eventos.reduce((s, e) => s + e.total, 0);
  const promedio = eventos.length
    ? Math.round(
        eventos.reduce(
          (s, e) => s + (e.total / Math.max(e.total + e.ausentes, 1)) * 100,
          0,
        ) / eventos.length,
      )
    : 0;

  return {
    rango,
    setRango,
    desde,
    setDesde,
    hasta,
    setHasta,
    loading: loading || loadingScope,
    eventos,
    chartData,
    loadData,
    totalAsistentes,
    promedio,
  };
}
