"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  MessageCircle,
  Phone,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatDate, getNombreCompleto } from "@/lib/utils";
import type { EventoReporteInfo } from "./helpers";
import styles from "@/app/styles/no-reportado-event-row.module.css";

interface Props {
  ev: EventoReporteInfo;
  wl: string;
  isEvOpen: boolean;
  onToggleEvent: () => void;
  copiadoId: string | null;
  handleCopyList: (ev: EventoReporteInfo, weekLabel: string) => void;
  verSoloSinReporte: boolean;
}

export function NoReportadoEventRow({
  ev,
  wl,
  isEvOpen,
  onToggleEvent,
  copiadoId,
  handleCopyList,
  verSoloSinReporte,
}: Props) {
  const totalEvGrupos = ev.gruposSinReporte.length + ev.gruposConReporte.length;
  const pctEv =
    totalEvGrupos > 0
      ? Math.round((ev.gruposConReporte.length / totalEvGrupos) * 100)
      : 0;

  return (
    <div className="divide-y divide-gray-100">
      {/* Cabecera de Evento */}
      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
        <button
          type="button"
          onClick={onToggleEvent}
          className="flex items-center gap-3 text-left min-w-0 flex-1"
        >
          <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-700 shrink-0 font-bold">
            <span className="text-xs leading-none">
              {parseInt(ev.fecha.slice(8, 10), 10)}
            </span>
            <span className="text-[10px] uppercase mt-0.5">
              {format(parseISO(ev.fecha), "MMM", { locale: es })}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 truncate">
                {ev.eventoNombre}
              </p>
              {ev.esGlobal && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  Global
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {ev.gruposSinReporte.length > 0 ? (
                <span className="text-red-600 font-medium">
                  {ev.gruposSinReporte.length} de {totalEvGrupos} casas de paz sin reporte
                </span>
              ) : (
                <span className="text-green-600 font-medium">
                  Todas las casas de paz reportaron
                </span>
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {ev.gruposSinReporte.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyList(ev, wl)}
              className="h-8 text-xs gap-1 border-gray-300 hover:bg-gray-100"
              title="Copiar lista de faltantes para WhatsApp"
            >
              {copiadoId === ev.eventoId ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-600 font-medium">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                  <span className="hidden sm:inline">Copiar lista</span>
                </>
              )}
            </Button>
          )}

          <button
            type="button"
            onClick={onToggleEvent}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            {isEvOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Barra de progreso de cumplimiento del evento */}
      <div className="w-full bg-gray-100 h-1">
        <div
          className={`bg-green-600 h-1 transition-all duration-300 ${styles.progressBarFill}`}
          style={{ "--progress-width": `${pctEv}%` } as React.CSSProperties}
        />
      </div>

      {/* Lista de Líderes y Casas de Paz */}
      {isEvOpen && (
        <div className="bg-gray-50/60 divide-y divide-gray-100">
          {/* Grupos Sin Reporte */}
          {ev.gruposSinReporte.map((g) => {
            const liderNombre = g.lider
              ? getNombreCompleto(g.lider.nombres, g.lider.apellidos)
              : "Sin líder asignado";
            const subliderNombre = g.sublider
              ? getNombreCompleto(g.sublider.nombres, g.sublider.apellidos)
              : null;
            const waPhone = g.lider?.telefono
              ? g.lider.telefono.replace(/[^0-9]/g, "")
              : null;
            const waMessage = encodeURIComponent(
              `Hola ${g.lider ? g.lider.nombres : ""}, te saludamos de la iglesia para recordarte registrar la asistencia de tu grupo "${g.nombre}" para el evento "${ev.eventoNombre}" del ${formatDate(ev.fecha)}. ¡Muchas gracias!`,
            );

            return (
              <div
                key={g.id}
                className="flex flex-col md:flex-row md:items-center justify-between px-6 py-3.5 bg-red-50/30 hover:bg-red-50/50 transition-colors gap-3"
              >
                {/* Info del Líder y Grupo */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold text-xs shrink-0 mt-0.5">
                    {g.lider
                      ? `${g.lider.nombres[0]}${g.lider.apellidos[0]}`
                      : "—"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {liderNombre}
                      </span>
                      <Badge variant="danger" className="text-[10px] py-0">
                        Sin reporte
                      </Badge>
                      {g.red && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {g.red.nombre}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      Casa de Paz: <span className="text-gray-900">{g.nombre}</span>
                      {g.dia_reunion && (
                        <span className="text-gray-400 ml-1.5 capitalize">
                          · {g.dia_reunion}{" "}
                          {g.hora_reunion ? `(${g.hora_reunion.slice(0, 5)})` : ""}
                        </span>
                      )}
                    </p>

                    {subliderNombre && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Sublíder: {subliderNombre}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones de Contacto */}
                {(waPhone || g.lider?.telefono) && (
                  <div className="flex items-center gap-2 pl-12 md:pl-0 shrink-0">
                    {/* WhatsApp */}
                    {waPhone && (
                      <a
                        href={`https://wa.me/${waPhone}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                        title={`Enviar WhatsApp a ${liderNombre}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}

                    {/* Llamar */}
                    {g.lider?.telefono && (
                      <a
                        href={`tel:${g.lider.telefono}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors"
                        title={`Llamar a ${g.lider.telefono}`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{g.lider.telefono}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Grupos Con Reporte */}
          {!verSoloSinReporte &&
            ev.gruposConReporte.map((g) => {
              const liderNombre = g.lider
                ? getNombreCompleto(g.lider.nombres, g.lider.apellidos)
                : "Sin líder asignado";
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between px-6 py-2.5 bg-green-50/20 hover:bg-green-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">
                      ✓
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-800">
                        {liderNombre}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">({g.nombre})</span>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px] py-0">
                    Reportado ✓
                  </Badge>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
