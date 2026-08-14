"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  nrWeekInfo,
  exportCSV,
  type EventoReporteInfo,
  type GrupoLiderInfo,
} from "../components/helpers";
import { getNombreCompleto, formatDate } from "@/lib/utils";

export function useNoReportado() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoReporteInfo[]>([]);
  const [redesList, setRedesList] = useState<{ id: string; nombre: string }[]>(
    [],
  );

  const [searchFilter, setSearchFilter] = useState("");
  const [redFilter, setRedFilter] = useState("todas");
  const [verSoloSinReporte, setVerSoloSinReporte] = useState(true);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set());
  const [openEvents, setOpenEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const hoy = format(new Date(), "yyyy-MM-dd");

      const [
        { data: eventosData },
        { data: gruposData },
        { data: miembrosData },
        { data: redesData },
      ] = await Promise.all([
        supabase
          .from("eventos")
          .select("id, nombre, fecha, hora_inicio, estado, grupo_id")
          .lte("fecha", hoy)
          .neq("estado", "cancelado")
          .order("fecha", { ascending: false }),
        supabase
          .from("grupos")
          .select(
            `
            id,
            nombre,
            dia_reunion,
            hora_reunion,
            red_id,
            red:red_id(id, nombre),
            lider_id,
            lider:personas!lider_id(id, nombres, apellidos, telefono, correo, foto_url),
            sublider_id,
            sublider:personas!sublider_id(id, nombres, apellidos, telefono, correo, foto_url)
          `,
          )
          .eq("estado", true)
          .is("deleted_at", null)
          .order("nombre"),
        supabase
          .from("grupo_miembros")
          .select("persona_id, grupo_id")
          .eq("activo", true),
        supabase
          .from("redes")
          .select("id, nombre")
          .eq("estado", true)
          .is("deleted_at", null)
          .order("nombre"),
      ]);

      if (!active) return;

      setRedesList((redesData ?? []) as { id: string; nombre: string }[]);

      const activeGroups: GrupoLiderInfo[] = (gruposData ?? []).map(
        (g: any) => {
          const redObj = Array.isArray(g.red) ? g.red[0] : g.red;
          const liderObj = Array.isArray(g.lider) ? g.lider[0] : g.lider;
          const subliderObj = Array.isArray(g.sublider)
            ? g.sublider[0]
            : g.sublider;
          return {
            id: g.id,
            nombre: g.nombre,
            dia_reunion: g.dia_reunion ?? null,
            hora_reunion: g.hora_reunion ?? null,
            red: redObj ?? null,
            lider: liderObj ?? null,
            sublider: subliderObj ?? null,
          };
        },
      );

      const groupsById = new Map<string, GrupoLiderInfo>();
      activeGroups.forEach((g) => groupsById.set(g.id, g));

      const personaToGroup = new Map<string, string>();
      for (const m of miembrosData ?? []) {
        if (m.persona_id && m.grupo_id) {
          personaToGroup.set(m.persona_id, m.grupo_id);
        }
      }
      for (const g of activeGroups) {
        if (g.lider?.id) personaToGroup.set(g.lider.id, g.id);
        if (g.sublider?.id) personaToGroup.set(g.sublider.id, g.id);
      }

      const evIds = (eventosData ?? []).map((e) => e.id);
      let asistenciasList: {
        evento_id: string;
        persona_id: string | null;
        es_visitante: boolean;
      }[] = [];

      if (evIds.length > 0) {
        const PAGE_SIZE = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data: page } = await supabase
            .from("asistencias")
            .select("evento_id, persona_id, es_visitante")
            .in("evento_id", evIds)
            .range(from, from + PAGE_SIZE - 1);

          if (!page || page.length === 0) break;

          asistenciasList = asistenciasList.concat(page);
          hasMore = page.length === PAGE_SIZE;
          from += PAGE_SIZE;
        }
      }

      const eventReportedGroups = new Map<string, Set<string>>();
      const eventTotalAttendances = new Map<string, number>();

      for (const a of asistenciasList) {
        if (!eventReportedGroups.has(a.evento_id)) {
          eventReportedGroups.set(a.evento_id, new Set());
          eventTotalAttendances.set(a.evento_id, 0);
        }
        eventTotalAttendances.set(
          a.evento_id,
          (eventTotalAttendances.get(a.evento_id) ?? 0) + 1,
        );

        if (
          a.persona_id &&
          !a.es_visitante &&
          personaToGroup.has(a.persona_id)
        ) {
          const gId = personaToGroup.get(a.persona_id)!;
          eventReportedGroups.get(a.evento_id)!.add(gId);
        }
      }

      const processed: EventoReporteInfo[] = [];

      for (const ev of eventosData ?? []) {
        const reportedSet = eventReportedGroups.get(ev.id) ?? new Set();

        if (ev.grupo_id) {
          const target = groupsById.get(ev.grupo_id);
          if (target) {
            const hasReported = reportedSet.has(ev.grupo_id);
            processed.push({
              eventoId: ev.id,
              eventoNombre: ev.nombre,
              fecha: ev.fecha,
              horaInicio: ev.hora_inicio ?? null,
              esGlobal: false,
              totalGrupos: 1,
              gruposSinReporte: hasReported ? [] : [target],
              gruposConReporte: hasReported ? [target] : [],
            });
          }
        } else {
          const sinReporte: GrupoLiderInfo[] = [];
          const conReporte: GrupoLiderInfo[] = [];

          for (const g of activeGroups) {
            if (reportedSet.has(g.id)) {
              conReporte.push(g);
            } else {
              sinReporte.push(g);
            }
          }

          processed.push({
            eventoId: ev.id,
            eventoNombre: ev.nombre,
            fecha: ev.fecha,
            horaInicio: ev.hora_inicio ?? null,
            esGlobal: true,
            totalGrupos: activeGroups.length,
            gruposSinReporte: sinReporte,
            gruposConReporte: conReporte,
          });
        }
      }

      setEventos(processed);

      const curMonth = format(new Date(), "yyyy-MM");
      setOpenMonths(new Set([curMonth]));
      const curEvs = processed.filter((e) => e.fecha.startsWith(curMonth));
      setOpenWeeks(
        new Set(curEvs.map((e) => `${curMonth}-${nrWeekInfo(e.fecha).label}`)),
      );
      setOpenEvents(new Set(curEvs.slice(0, 3).map((e) => e.eventoId)));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const filteredData = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();

    return eventos
      .map((ev) => {
        const matchGroup = (g: GrupoLiderInfo) => {
          if (redFilter !== "todas" && g.red?.id !== redFilter) return false;
          if (!q) return true;
          const liderNombre = g.lider
            ? getNombreCompleto(
                g.lider.nombres,
                g.lider.apellidos,
              ).toLowerCase()
            : "";
          const subliderNombre = g.sublider
            ? getNombreCompleto(
                g.sublider.nombres,
                g.sublider.apellidos,
              ).toLowerCase()
            : "";
          const grupoNombre = g.nombre.toLowerCase();
          const redNombre = g.red?.nombre.toLowerCase() ?? "";
          const tel = g.lider?.telefono ?? "";
          return (
            liderNombre.includes(q) ||
            subliderNombre.includes(q) ||
            grupoNombre.includes(q) ||
            redNombre.includes(q) ||
            tel.includes(q)
          );
        };

        const sinReporte = ev.gruposSinReporte.filter(matchGroup);
        const conReporte = ev.gruposConReporte.filter(matchGroup);

        return {
          ...ev,
          gruposSinReporte: sinReporte,
          gruposConReporte: conReporte,
        };
      })
      .filter((ev) =>
        verSoloSinReporte
          ? ev.gruposSinReporte.length > 0
          : ev.gruposSinReporte.length > 0 || ev.gruposConReporte.length > 0,
      );
  }, [eventos, searchFilter, redFilter, verSoloSinReporte]);

  const grouped = useMemo(() => {
    const byMonth: Record<
      string,
      {
        label: string;
        weeks: Record<string, { range: string; events: EventoReporteInfo[] }>;
      }
    > = {};

    for (const ev of filteredData) {
      const mk = ev.fecha.slice(0, 7);
      if (!byMonth[mk]) {
        byMonth[mk] = {
          label: format(parseISO(mk + "-01"), "MMMM yyyy", { locale: es }),
          weeks: {},
        };
      }

      const { label: wl, range: wr } = nrWeekInfo(ev.fecha);
      if (!byMonth[mk].weeks[wl]) {
        byMonth[mk].weeks[wl] = { range: wr, events: [] };
      }
      byMonth[mk].weeks[wl].events.push(ev);
    }

    const curMonth = format(new Date(), "yyyy-MM");
    return Object.keys(byMonth)
      .sort((a, b) =>
        a === curMonth ? -1 : b === curMonth ? 1 : b.localeCompare(a),
      )
      .map((key) => {
        const monthData = byMonth[key];
        let totalSinReporte = 0;
        let totalConReporte = 0;

        Object.values(monthData.weeks).forEach((w) => {
          w.events.forEach((e) => {
            totalSinReporte += e.gruposSinReporte.length;
            totalConReporte += e.gruposConReporte.length;
          });
        });

        const totalEvs = totalSinReporte + totalConReporte;
        const pctCumplimiento =
          totalEvs > 0 ? Math.round((totalConReporte / totalEvs) * 100) : 0;

        return {
          key,
          label: monthData.label,
          weeks: monthData.weeks,
          totalSinReporte,
          totalConReporte,
          pctCumplimiento,
        };
      });
  }, [filteredData]);

  const kpisActuales = useMemo(() => {
    const curMonth = format(new Date(), "yyyy-MM");
    const currentMonthEvents = filteredData.filter((e) =>
      e.fecha.startsWith(curMonth),
    );

    const lideresSinReporteSet = new Set<string>();
    const lideresConReporteSet = new Set<string>();
    let totalGruposSinReporte = 0;
    let totalGruposConReporte = 0;
    currentMonthEvents.forEach((e) => {
      e.gruposSinReporte.forEach((g) => {
        totalGruposSinReporte++;
        if (g.lider?.id) lideresSinReporteSet.add(g.lider.id);
        else lideresSinReporteSet.add(g.id);
      });
      e.gruposConReporte.forEach((g) => {
        totalGruposConReporte++;
        if (g.lider?.id) lideresConReporteSet.add(g.lider.id);
      });
    });

    const totalReportes = totalGruposSinReporte + totalGruposConReporte;
    const cumplimiento =
      totalReportes > 0
        ? Math.round((totalGruposConReporte / totalReportes) * 100)
        : 0;

    return {
      sinReporteMes: totalGruposSinReporte,
      lideresUnicosSinReporte: lideresSinReporteSet.size,
      cumplimientoMes: cumplimiento,
      eventosMes: currentMonthEvents.length,
    };
  }, [filteredData]);

  function toggleMonth(key: string) {
    setOpenMonths((p) => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }
  function toggleWeek(key: string) {
    setOpenWeeks((p) => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }
  function toggleEvent(key: string) {
    setOpenEvents((p) => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  function handleCopyList(ev: EventoReporteInfo, weekLabel: string) {
    if (ev.gruposSinReporte.length === 0) return;

    const lineas = [
      `📋 *Líderes sin reporte de asistencia*`,
      `📅 Evento: *${ev.eventoNombre}* (${formatDate(ev.fecha)}) - ${weekLabel}`,
      `⚠️ *${ev.gruposSinReporte.length} líderes pendientes:*`,
      "",
      ...ev.gruposSinReporte.map((g, i) => {
        const liderNombre = g.lider
          ? getNombreCompleto(g.lider.nombres, g.lider.apellidos)
          : "Sin líder";
        const tel = g.lider?.telefono ? ` - 📞 ${g.lider.telefono}` : "";
        const red = g.red ? ` [${g.red.nombre}]` : "";
        return `${i + 1}. *${liderNombre}* — ${g.nombre}${red}${tel}`;
      }),
      "",
      `Por favor registrar su asistencia en el sistema Berak.`,
    ];

    navigator.clipboard.writeText(lineas.join("\n"));
    setCopiadoId(ev.eventoId);
    setTimeout(() => setCopiadoId(null), 2500);
  }

  function handleExportSinReporte() {
    const filasExport: Record<string, unknown>[] = [];

    filteredData.forEach((ev) => {
      const { label: semanaLabel } = nrWeekInfo(ev.fecha);
      ev.gruposSinReporte.forEach((g) => {
        filasExport.push({
          "Fecha Evento": ev.fecha,
          Semana: semanaLabel,
          Evento: ev.eventoNombre,
          "Casa de Paz": g.nombre,
          Líder: g.lider
            ? getNombreCompleto(g.lider.nombres, g.lider.apellidos)
            : "Sin asignar",
          "Teléfono Líder": g.lider?.telefono ?? "—",
          "Correo Líder": g.lider?.correo ?? "—",
          Sublíder: g.sublider
            ? getNombreCompleto(g.sublider.nombres, g.sublider.apellidos)
            : "—",
          Red: g.red?.nombre ?? "Sin red",
          "Día Reunión": g.dia_reunion ?? "—",
          Estado: "Sin reporte",
        });
      });
    });

    if (filasExport.length === 0) {
      alert("No hay datos sin reporte para exportar con los filtros actuales.");
      return;
    }

    exportCSV(
      filasExport,
      `lideres_sin_reporte_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
  }

  return {
    loading,
    redesList,
    searchFilter,
    setSearchFilter,
    redFilter,
    setRedFilter,
    verSoloSinReporte,
    setVerSoloSinReporte,
    copiadoId,
    openMonths,
    openWeeks,
    openEvents,
    grouped,
    kpisActuales,
    filteredData,
    toggleMonth,
    toggleWeek,
    toggleEvent,
    handleCopyList,
    handleExportSinReporte,
  };
}
