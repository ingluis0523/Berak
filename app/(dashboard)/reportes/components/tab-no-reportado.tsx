"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  MessageCircle,
  Phone,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Users,
} from "lucide-react";

import { KpiCard } from "./kpi-card";
import { NoReportadoEventRow } from "./no-reportado-event-row";
import { useNoReportado } from "../hooks/use-no-reportado";

export function TabNoReportado() {
  const {
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
  } = useNoReportado();

  if (loading) {
    return <div className="text-center py-24 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="space-y-5">
      {/* ── KPIs del Mes Actual ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Líderes sin reporte (este mes)"
          value={kpisActuales.sinReporteMes}
          icon={AlertCircle}
          color={kpisActuales.sinReporteMes > 0 ? "red" : "green"}
          helper={
            kpisActuales.sinReporteMes > 0
              ? `${kpisActuales.lideresUnicosSinReporte} líderes diferentes`
              : "Todo al día"
          }
        />
        <KpiCard
          label="Cumplimiento de reportes"
          value={`${kpisActuales.cumplimientoMes}%`}
          icon={TrendingUp}
          color={
            kpisActuales.cumplimientoMes >= 80
              ? "green"
              : kpisActuales.cumplimientoMes >= 50
                ? "orange"
                : "red"
          }
          helper="Mes en curso"
        />
        <KpiCard
          label="Eventos evaluados"
          value={kpisActuales.eventosMes}
          icon={CalendarDays}
          color="blue"
          helper="En este mes"
        />
        <KpiCard
          label="Casas de paz evaluadas"
          value={filteredData[0]?.totalGrupos ?? 0}
          icon={Users}
          color="gray"
          helper="Grupos activos"
        />
      </div>

      {/* ── Barra de Búsqueda y Filtros ── */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar líder o grupo..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {redesList.length > 0 && (
              <Select value={redFilter} onValueChange={setRedFilter}>
                <SelectTrigger className="w-40 text-sm">
                  <SelectValue placeholder="Red" />
                </SelectTrigger>
                <SelectContent>
                  {redesList.length !== 1 && <SelectItem value="todas">Todas las redes</SelectItem>}
                  {redesList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={verSoloSinReporte ? "outline" : "secondary"}
              size="sm"
              onClick={() => setVerSoloSinReporte(!verSoloSinReporte)}
              className="text-xs"
            >
              <Filter className="h-3.5 w-3.5 mr-1" />
              {verSoloSinReporte ? "Ver solo pendientes" : "Ver todos"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSinReporte}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Lista de Eventos y Meses ── */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-1" />
            <p className="font-semibold text-gray-800">¡Todo al día!</p>
            <p className="text-sm text-gray-500 max-w-sm">
              No se encontraron líderes con reporte pendiente para los filtros
              seleccionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((month) => {
            const isMonthOpen = openMonths.has(month.key);

            return (
              <Card
                key={month.key}
                className="overflow-hidden border border-gray-200"
              >
                {/* Cabecera del Mes (Nivel 1) */}
                <button
                  type="button"
                  onClick={() => toggleMonth(month.key)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 capitalize text-base">
                      {month.label}
                    </span>
                    {month.totalSinReporte > 0 ? (
                      <Badge variant="danger" className="text-xs">
                        {month.totalSinReporte} sin reporte
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-xs">
                        100% al día
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      ({month.pctCumplimiento}% cumplimiento)
                    </span>
                  </div>
                  {isMonthOpen ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Semanas (Nivel 2) */}
                {isMonthOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {Object.entries(month.weeks).map(([wl, weekData]) => {
                      const weekKey = `${month.key}-${wl}`;
                      const isWeekOpen = openWeeks.has(weekKey);
                      const weekSinReporte = weekData.events.reduce(
                        (s, e) => s + e.gruposSinReporte.length,
                        0,
                      );
                      const weekConReporte = weekData.events.reduce(
                        (s, e) => s + e.gruposConReporte.length,
                        0,
                      );
                      const weekTotal = weekSinReporte + weekConReporte;
                      const weekPct =
                        weekTotal > 0
                          ? Math.round((weekConReporte / weekTotal) * 100)
                          : 0;

                      return (
                        <div key={wl} className="bg-gray-50/40">
                          {/* Botón Semana */}
                          <button
                            type="button"
                            onClick={() => toggleWeek(weekKey)}
                            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-100/60 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-gray-800">
                                {wl}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({weekData.range})
                              </span>
                              {weekSinReporte > 0 ? (
                                <Badge
                                  variant="danger"
                                  className="text-[11px] py-0"
                                >
                                  {weekSinReporte} pendientes
                                </Badge>
                              ) : (
                                <Badge
                                  variant="success"
                                  className="text-[11px] py-0"
                                >
                                  Al día
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">
                                {weekPct}%
                              </span>
                              {isWeekOpen ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </button>
                          {/* Eventos (Nivel 3) */}
                          {isWeekOpen && (
                            <div className="divide-y divide-gray-200/80 bg-white">
                              {weekData.events.map((ev) => {
                                const isEvOpen = openEvents.has(ev.eventoId);
                                const totalEvGrupos =
                                  ev.gruposSinReporte.length +
                                  ev.gruposConReporte.length;
                                const pctEv =
                                  totalEvGrupos > 0
                                    ? Math.round(
                                        (ev.gruposConReporte.length /
                                          totalEvGrupos) *
                                          100,
                                      )
                                    : 0;

                                return (
                                  <NoReportadoEventRow
                                    key={ev.eventoId}
                                    ev={ev}
                                    wl={wl}
                                    isEvOpen={isEvOpen}
                                    onToggleEvent={() => toggleEvent(ev.eventoId)}
                                    copiadoId={copiadoId}
                                    handleCopyList={handleCopyList}
                                    verSoloSinReporte={verSoloSinReporte}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
