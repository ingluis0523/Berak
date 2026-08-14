import { subWeeks, subMonths, parseISO } from "date-fns";

export type RangoType = "semana" | "mes" | "tres_meses" | "personalizado";

export type PersonaCompacta = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  correo: string | null;
  foto_url?: string | null;
};

export type GrupoLiderInfo = {
  id: string;
  nombre: string;
  dia_reunion: string | null;
  hora_reunion: string | null;
  red: { id: string; nombre: string } | null;
  lider: PersonaCompacta | null;
  sublider: PersonaCompacta | null;
};

export type EventoReporteInfo = {
  eventoId: string;
  eventoNombre: string;
  fecha: string;
  horaInicio: string | null;
  esGlobal: boolean;
  totalGrupos: number;
  gruposSinReporte: GrupoLiderInfo[];
  gruposConReporte: GrupoLiderInfo[];
};

export function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) =>
    Object.values(row)
      .map((v) => {
        const s = String(v ?? "");
        return s.includes(",") ? `"${s}"` : s;
      })
      .join(","),
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getRangoDates(
  rango: RangoType,
  desde: string,
  hasta: string,
): { from: Date; to: Date } {
  const now = new Date();
  switch (rango) {
    case "semana":
      return { from: subWeeks(now, 1), to: now };
    case "mes":
      return { from: subMonths(now, 1), to: now };
    case "tres_meses":
      return { from: subMonths(now, 3), to: now };
    case "personalizado":
      return {
        from: desde ? parseISO(desde) : subMonths(now, 1),
        to: hasta ? parseISO(hasta) : now,
      };
  }
}

export function nrWeekInfo(dateStr: string): { label: string; range: string } {
  const day = parseInt(dateStr.slice(8, 10), 10);
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  if (day <= 7) return { label: "Semana 1", range: "1 – 7" };
  if (day <= 14) return { label: "Semana 2", range: "8 – 14" };
  if (day <= 21) return { label: "Semana 3", range: "15 – 21" };
  if (day <= 28) return { label: "Semana 4", range: "22 – 28" };
  return { label: "Semana 5", range: `29 – ${lastDay}` };
}
