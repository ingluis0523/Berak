"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getNombreCompleto, formatDate } from "@/lib/utils";
import {
  subMonths,
  format,
  parseISO,
  isAfter,
} from "date-fns";
import { es } from "date-fns/locale";

interface UseReportePersonasProps {
  pageInactivos: number;
  pageNuevos: number;
  itemsPerPage?: number;
}

export function useReportePersonas({
  pageInactivos,
  pageNuevos,
  itemsPerPage = 10,
}: UseReportePersonasProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [loadingInactivos, setLoadingInactivos] = useState(false);
  const [loadingNuevos, setLoadingNuevos] = useState(false);

  const [nuevosPorMes, setNuevosPorMes] = useState<
    { mes: string; count: number }[]
  >([]);
  const [inactivos, setInactivos] = useState<
    { id: string; nombre: string; ultimoEvento: string; dias: number }[]
  >([]);
  const [nuevosDelMes, setNuevosDelMes] = useState<
    { id: string; nombre: string; fecha: string; grupo: string }[]
  >([]);
  const [kpis, setKpis] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    nuevos: 0,
    visitantes: 0,
  });

  const hoy = new Date();
  const hace6m = subMonths(hoy, 6);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  // 1. Cargar KPIs y datos del gráfico (se ejecuta una sola vez)
  useEffect(() => {
    const loadKPIsAndChart = async () => {
      setLoading(true);

      // Peticiones de conteo ultra-rápidas (head: true)
      const [
        { count: totalCount },
        { count: visitantesCount },
        { count: inactivosCount },
        { count: nuevosCount },
        { data: personasFechas },
      ] = await Promise.all([
        supabase.from("personas").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("personas").select("id", { count: "exact", head: true }).eq("tipo_persona", "visitante").is("deleted_at", null),
        supabase.from("reporte_personas_inactivas").select("id", { count: "exact", head: true }),
        supabase.from("reporte_personas_nuevas").select("id", { count: "exact", head: true }).gte("fecha_registro", inicioMes.toISOString()),
        supabase.from("personas").select("fecha_registro").is("deleted_at", null).gte("fecha_registro", hace6m.toISOString()),
      ]);

      const total = totalCount ?? 0;
      const visitantes = visitantesCount ?? 0;
      const totalInactivos = inactivosCount ?? 0;
      const nuevos = nuevosCount ?? 0;
      const activos = Math.max(0, total - visitantes - totalInactivos);

      setKpis({
        total,
        activos,
        inactivos: totalInactivos,
        nuevos,
        visitantes,
      });

      // Nuevos por mes (últimos 6 meses)
      const mesMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(hoy, i);
        mesMap.set(format(d, "MMM yy", { locale: es }), 0);
      }
      for (const p of personasFechas ?? []) {
        const d = parseISO(p.fecha_registro);
        if (isAfter(d, hace6m)) {
          const k = format(d, "MMM yy", { locale: es });
          if (mesMap.has(k)) mesMap.set(k, (mesMap.get(k) ?? 0) + 1);
        }
      }
      setNuevosPorMes(
        Array.from(mesMap.entries()).map(([mes, count]) => ({ mes, count })),
      );

      setLoading(false);
    };

    loadKPIsAndChart();
  }, [supabase]);

  // 2. Cargar página de personas inactivas desde el Servidor
  useEffect(() => {
    const loadInactivosPage = async () => {
      setLoadingInactivos(true);
      const from = (pageInactivos - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data } = await supabase
        .from("reporte_personas_inactivas")
        .select("id, nombres, apellidos, ultimo_evento_nombre, ultimo_evento_fecha, dias_sin_asistir")
        .order("dias_sin_asistir", { ascending: false })
        .range(from, to);

      const mapped = (data ?? []).map((p) => ({
        id: p.id,
        nombre: getNombreCompleto(p.nombres, p.apellidos),
        ultimoEvento: p.ultimo_evento_nombre
          ? `${p.ultimo_evento_nombre} (${formatDate(p.ultimo_evento_fecha)})`
          : "Sin registros",
        dias: p.dias_sin_asistir,
      }));

      setInactivos(mapped);
      setLoadingInactivos(false);
    };

    loadInactivosPage();
  }, [supabase, pageInactivos, itemsPerPage]);

  // 3. Cargar página de personas nuevas desde el Servidor
  useEffect(() => {
    const loadNuevosPage = async () => {
      setLoadingNuevos(true);
      const from = (pageNuevos - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data } = await supabase
        .from("reporte_personas_nuevas")
        .select("id, nombres, apellidos, fecha_registro, grupo_nombre")
        .gte("fecha_registro", inicioMes.toISOString())
        .order("fecha_registro", { ascending: false })
        .range(from, to);

      const mapped = (data ?? []).map((p) => ({
        id: p.id,
        nombre: getNombreCompleto(p.nombres, p.apellidos),
        fecha: formatDate(p.fecha_registro),
        grupo: p.grupo_nombre ?? "—",
      }));

      setNuevosDelMes(mapped);
      setLoadingNuevos(false);
    };

    loadNuevosPage();
  }, [supabase, pageNuevos, itemsPerPage]);

  return {
    loading,
    loadingInactivos,
    loadingNuevos,
    nuevosPorMes,
    inactivos,
    nuevosDelMes,
    kpis,
  };
}
