"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getNombreCompleto, formatDate } from "@/lib/utils";
import {
  subMonths,
  format,
  parseISO,
  differenceInDays,
  isAfter,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";

export function useReportePersonas() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const hoy = new Date();
      const hace6m = subMonths(hoy, 6);
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      // Personas
      const { data: personas } = await supabase
        .from("personas")
        .select(
          "id, nombres, apellidos, tipo_persona, fecha_registro, estado_persona:estado_persona_id(nombre)",
        )
        .is("deleted_at", null);

      // Asistencias recientes
      const { data: asistencias } = await supabase
        .from("asistencias")
        .select("persona_id, created_at, evento:evento_id(nombre, fecha)")
        .eq("estado", "asistio")
        .gte("created_at", hace6m.toISOString());

      // Grupos de miembros
      const { data: gruposMiembros } = await supabase
        .from("grupo_miembros")
        .select("persona_id, grupo:grupo_id(nombre)")
        .eq("activo", true);

      const lastAsistencia = new Map<
        string,
        { fecha: string; evento: string }
      >();
      for (const a of asistencias ?? []) {
        const prev = lastAsistencia.get(a.persona_id);
        const evRaw = a.evento as unknown;
        const ev = (Array.isArray(evRaw) ? evRaw[0] : evRaw) as {
          nombre: string;
          fecha: string;
        } | null;
        if (!prev || (ev && ev.fecha > prev.fecha)) {
          lastAsistencia.set(a.persona_id, {
            fecha: ev?.fecha ?? a.created_at,
            evento: ev?.nombre ?? "?",
          });
        }
      }

      const grupoByPersona = new Map<string, string>();
      for (const gm of gruposMiembros ?? []) {
        const gRaw = gm.grupo as unknown;
        const g = (Array.isArray(gRaw) ? gRaw[0] : gRaw) as {
          nombre: string;
        } | null;
        if (g) grupoByPersona.set(gm.persona_id, g.nombre);
      }

      // Nuevos por mes (últimos 6 meses)
      const mesMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(hoy, i);
        mesMap.set(format(d, "MMM yy", { locale: es }), 0);
      }
      for (const p of personas ?? []) {
        const d = parseISO(p.fecha_registro);
        if (isAfter(d, hace6m)) {
          const k = format(d, "MMM yy", { locale: es });
          if (mesMap.has(k)) mesMap.set(k, (mesMap.get(k) ?? 0) + 1);
        }
      }
      setNuevosPorMes(
        Array.from(mesMap.entries()).map(([mes, count]) => ({ mes, count })),
      );

      // Inactivos (sin asistencia en 30+ días) y Activos (asistencia en <30 días)
      const inactivosList: typeof inactivos = [];
      let activosCount = 0;
      for (const p of personas ?? []) {
        if (p.tipo_persona === "visitante") continue;
        const last = lastAsistencia.get(p.id);
        const dias = last
          ? differenceInDays(hoy, parseISO(last.fecha))
          : differenceInDays(hoy, parseISO(p.fecha_registro));
        if (dias >= 30) {
          inactivosList.push({
            id: p.id,
            nombre: getNombreCompleto(p.nombres, p.apellidos),
            ultimoEvento: last
              ? `${last.evento} (${formatDate(last.fecha)})`
              : "Sin registros",
            dias,
          });
        } else {
          activosCount++;
        }
      }
      setInactivos(inactivosList.sort((a, b) => b.dias - a.dias).slice(0, 50));

      // Nuevos del mes
      const nuevosMes = (personas ?? [])
        .filter((p) => isAfter(parseISO(p.fecha_registro), inicioMes))
        .map((p) => ({
          id: p.id,
          nombre: getNombreCompleto(p.nombres, p.apellidos),
          fecha: formatDate(p.fecha_registro),
          grupo: grupoByPersona.get(p.id) ?? "—",
        }));
      setNuevosDelMes(nuevosMes);

      // KPIs
      const totalPersonas = (personas ?? []).length;
      const visitantesCount = (personas ?? []).filter(
        (p) => p.tipo_persona === "visitante",
      ).length;

      setKpis({
        total: totalPersonas,
        activos: activosCount,
        inactivos: inactivosList.length,
        nuevos: nuevosMes.length,
        visitantes: visitantesCount,
      });

      setLoading(false);
    };
    load();
  }, [supabase]);

  return {
    loading,
    nuevosPorMes,
    inactivos,
    nuevosDelMes,
    kpis,
  };
}
