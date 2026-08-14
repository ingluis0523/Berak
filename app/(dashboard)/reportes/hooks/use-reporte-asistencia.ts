"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfWeek, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getRangoDates, type RangoType } from "../components/helpers";

export function useReporteAsistencia() {
  const supabase = createClient();
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
    setLoading(true);
    const { from, to } = getRangoDates(rango, desde, hasta);

    // Fetch active group members count for group events context
    const { data: miembrosData } = await supabase
      .from("grupo_miembros")
      .select("grupo_id")
      .eq("activo", true);

    const groupCounts: Record<string, number> = {};
    (miembrosData ?? []).forEach((gm) => {
      if (gm.grupo_id) {
        groupCounts[gm.grupo_id] = (groupCounts[gm.grupo_id] ?? 0) + 1;
      }
    });

    // Fetch total active personas registered in the platform (deleted_at is null)
    const { count: totalPersonas } = await supabase
      .from("personas")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    const totalRegistrados = totalPersonas ?? 0;

    const { data: eventosData } = await supabase
      .from("eventos")
      .select("id, nombre, fecha, grupo_id, asistencias(estado, es_visitante)")
      .gte("fecha", from.toISOString().split("T")[0])
      .lte("fecha", to.toISOString().split("T")[0])
      .neq("estado", "cancelado")
      .order("fecha", { ascending: false });

    const processed = (eventosData ?? []).map((ev) => {
      const asistencias = (ev.asistencias ?? []) as {
        estado: string;
        es_visitante: boolean;
      }[];
      const total = asistencias.filter((a) => a.estado === "asistio").length;
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
  }, [rango, desde, hasta, supabase]);

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
    loading,
    eventos,
    chartData,
    loadData,
    totalAsistentes,
    promedio,
  };
}
