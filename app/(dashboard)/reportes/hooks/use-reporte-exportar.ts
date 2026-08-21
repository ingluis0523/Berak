"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, getNombreCompleto } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { exportCSV, nrWeekInfo } from "../components/helpers";
import { useReporteScope } from "./use-reporte-scope";

export function useReporteExportar() {
  const supabase = createClient();
  const { loading: loadingScope, hasFullAccess, myGroupIds, scopedPersonaIds } = useReporteScope();
  const [loading, setLoading] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const handleExportPersonas = async () => {
    if (loadingScope) return;
    setLoading("personas");
    let query = supabase
      .from("personas")
      .select(
        "nombres, apellidos, correo, tipo_persona, telefono, fecha_registro",
      )
      .is("deleted_at", null)
      .order("nombres");
    if (!hasFullAccess) {
      query = query.or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`);
    }
    const { data } = await query;
    if (data?.length) {
      exportCSV(
        data as Record<string, unknown>[],
        `personas_${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
    }
    setLoading(null);
  };

  const handleExportAsistencias = async () => {
    if (loadingScope) return;
    if (!desde || !hasta) {
      alert("Selecciona el rango de fechas");
      return;
    }
    setLoading("asistencias");
    let query = supabase
      .from("asistencias")
      .select(
        `
        estado, created_at,
        persona:persona_id(nombres, apellidos, lider_id),
        evento:evento_id(nombre, fecha)
      `,
      )
      .gte("created_at", desde)
      .lte("created_at", hasta + "T23:59:59");
    if (!hasFullAccess) {
      query = query.or(`persona_id.in.(${scopedPersonaIds.join(',')}),persona.lider_id.in.(${scopedPersonaIds.join(',')})`);
    }
    const { data } = await query;
    const flat = (data ?? []).map((a) => {
      const personaRaw = a.persona as unknown;
      const persona = (
        Array.isArray(personaRaw) ? personaRaw[0] : personaRaw
      ) as { nombres: string; apellidos: string } | null;
      const eventoRaw = a.evento as unknown;
      const evento = (Array.isArray(eventoRaw) ? eventoRaw[0] : eventoRaw) as {
        nombre: string;
        fecha: string;
      } | null;
      return {
        persona: persona
          ? `${persona.nombres} ${persona.apellidos}`
          : "Visitante",
        evento: evento?.nombre ?? "?",
        fecha_evento: evento?.fecha ?? "?",
        estado: a.estado,
        registrado: formatDate(a.created_at),
      };
    });
    if (flat.length)
      exportCSV(
        flat as Record<string, unknown>[],
        `asistencias_${desde}_${hasta}.csv`,
      );
    setLoading(null);
  };

  const handleExportInactivos = async () => {
    if (loadingScope) return;
    setLoading("inactivos");
    const hoy = new Date();
    const hace30 = subDays(hoy, 30);
    let queryAsist = supabase
      .from("asistencias")
      .select("persona_id, created_at, persona:persona_id(lider_id)")
      .eq("estado", "asistio")
      .gte("created_at", hace30.toISOString());
    if (!hasFullAccess) {
      queryAsist = queryAsist.or(`persona_id.in.(${scopedPersonaIds.join(',')}),persona.lider_id.in.(${scopedPersonaIds.join(',')})`);
    }
    const { data: asistencias } = await queryAsist;
    const activos = new Set((asistencias ?? []).map((a) => a.persona_id));

    let queryPers = supabase
      .from("personas")
      .select("id, nombres, apellidos, correo, tipo_persona, telefono")
      .is("deleted_at", null)
      .not("tipo_persona", "eq", "visitante");
    if (!hasFullAccess) {
      queryPers = queryPers.or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`);
    }
    const { data: personas } = await queryPers;

    const inactivos = (personas ?? [])
      .filter((p) => !activos.has(p.id))
      .map((p) => ({
        nombre: `${p.nombres} ${p.apellidos}`,
        correo: p.correo ?? "",
        telefono: p.telefono ?? "",
        tipo: p.tipo_persona,
      }));
    if (inactivos.length)
      exportCSV(
        inactivos as Record<string, unknown>[],
        `inactivos_${format(hoy, "yyyy-MM-dd")}.csv`,
      );
    setLoading(null);
  };

  const handleExportNuevos = async () => {
    if (loadingScope) return;
    setLoading("nuevos");
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    let query = supabase
      .from("personas")
      .select("nombres, apellidos, correo, tipo_persona, fecha_registro")
      .is("deleted_at", null)
      .gte("fecha_registro", inicioMes.toISOString().split("T")[0])
      .order("fecha_registro", { ascending: false });
    if (!hasFullAccess) {
      query = query.or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`);
    }
    const { data } = await query;
    if (data?.length)
      exportCSV(
        data as Record<string, unknown>[],
        `nuevos_${format(hoy, "yyyy-MM")}.csv`,
      );
    setLoading(null);
  };

  const handleExportSinReporte = async () => {
    if (loadingScope) return;
    setLoading("sin_reporte");
    const hoy = format(new Date(), "yyyy-MM-dd");

    let eventosQuery = supabase
      .from("eventos")
      .select("id, nombre, fecha, hora_inicio, estado, grupo_id")
      .lte("fecha", hoy)
      .neq("estado", "cancelado")
      .order("fecha", { ascending: false });

    let gruposQuery = supabase
      .from("grupos")
      .select(
        `
        id, nombre, dia_reunion,
        red:red_id(nombre),
        lider:personas!lider_id(nombres, apellidos, telefono, correo),
        sublider:personas!sublider_id(nombres, apellidos, telefono)
      `,
      )
      .eq("estado", true)
      .is("deleted_at", null);

    let miembrosQuery = supabase
      .from("grupo_miembros")
      .select("persona_id, grupo_id")
      .eq("activo", true);

    if (!hasFullAccess) {
      if (myGroupIds.length > 0) {
        eventosQuery = eventosQuery.or(`grupo_id.is.null,grupo_id.in.(${myGroupIds.join(",")})`);
        gruposQuery = gruposQuery.in("id", myGroupIds);
        miembrosQuery = miembrosQuery.in("grupo_id", myGroupIds);
      } else {
        eventosQuery = eventosQuery.is("grupo_id", null);
        gruposQuery = gruposQuery.eq("id", "00000000-0000-0000-0000-000000000000");
        miembrosQuery = miembrosQuery.eq("grupo_id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const [
      { data: eventosData },
      { data: gruposData },
      { data: miembrosData },
    ] = await Promise.all([
      eventosQuery,
      gruposQuery,
      miembrosQuery,
    ]);

    const personaToGroup = new Map<string, string>();
    for (const m of miembrosData ?? []) {
      if (m.persona_id && m.grupo_id)
        personaToGroup.set(m.persona_id, m.grupo_id);
    }

    const evIds = (eventosData ?? []).map((e) => e.id);
    let asistenciasList: { evento_id: string; persona_id: string | null }[] =
      [];
    if (evIds.length > 0) {
      const { data: asistenciasData } = await supabase
        .from("asistencias")
        .select("evento_id, persona_id")
        .in("evento_id", evIds);
      asistenciasList = asistenciasData ?? [];
    }

    const eventReportedGroups = new Map<string, Set<string>>();
    for (const a of asistenciasList) {
      if (!eventReportedGroups.has(a.evento_id))
        eventReportedGroups.set(a.evento_id, new Set());
      if (a.persona_id && personaToGroup.has(a.persona_id)) {
        eventReportedGroups
          .get(a.evento_id)!
          .add(personaToGroup.get(a.persona_id)!);
      }
    }

    const filasExport: Record<string, unknown>[] = [];
    for (const ev of eventosData ?? []) {
      const { label: semanaLabel } = nrWeekInfo(ev.fecha);
      const reportedSet = eventReportedGroups.get(ev.id) ?? new Set();

      for (const g of (gruposData ?? []) as any[]) {
        if (!reportedSet.has(g.id)) {
          const liderObj = Array.isArray(g.lider) ? g.lider[0] : g.lider;
          const subliderObj = Array.isArray(g.sublider)
            ? g.sublider[0]
            : g.sublider;
          const redObj = Array.isArray(g.red) ? g.red[0] : g.red;
          filasExport.push({
            "Fecha Evento": ev.fecha,
            Semana: semanaLabel,
            Evento: ev.nombre,
            "Casa de Paz": g.nombre,
            Líder: liderObj
              ? getNombreCompleto(liderObj.nombres, liderObj.apellidos)
              : "Sin asignar",
            Teléfono: liderObj?.telefono ?? "—",
            Correo: liderObj?.correo ?? "—",
            Sublíder: subliderObj
              ? getNombreCompleto(subliderObj.nombres, subliderObj.apellidos)
              : "—",
            Red: redObj?.nombre ?? "Sin red",
            "Día Reunión": g.dia_reunion ?? "—",
            Estado: "Sin reporte",
          });
        }
      }
    }

    if (filasExport.length) {
      exportCSV(
        filasExport,
        `lideres_sin_reporte_${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
    }
    setLoading(null);
  };

  return {
    loading: loading || (loadingScope ? "resolving_scope" : null),
    desde,
    setDesde,
    hasta,
    setHasta,
    handleExportPersonas,
    handleExportAsistencias,
    handleExportInactivos,
    handleExportNuevos,
    handleExportSinReporte,
  };
}
