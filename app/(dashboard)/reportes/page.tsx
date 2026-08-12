"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, getNombreCompleto } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  Users,
  CalendarDays,
  TrendingUp,
  UserMinus,
  ChevronDown,
  ChevronRight,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Search,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import {
  subWeeks,
  subMonths,
  startOfWeek,
  format,
  parseISO,
  differenceInDays,
  isAfter,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportCSV(data: Record<string, unknown>[], filename: string) {
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

type RangoType = "semana" | "mes" | "tres_meses" | "personalizado";

function getRangoDates(
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  color = "blue",
  helper,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  helper?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    gray: "bg-gray-50 text-gray-600",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
        <div
          className={`rounded-xl p-2 sm:p-2.5 shrink-0 ${colors[color] ?? colors.blue}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
          {helper && (
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {helper}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab: Asistencia ──────────────────────────────────────────────────────────

function TabAsistencia() {
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

    const { data: eventosData } = await supabase
      .from("eventos")
      .select("id, nombre, fecha, asistencias(estado, es_visitante)")
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
      const ausentes = asistencias.filter(
        (a) => a.estado === "no_asistio",
      ).length;
      const visitantes = asistencias.filter(
        (a) => a.estado === "visitante" || a.estado === "primera_vez",
      ).length;
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
  }, [rango, desde, hasta]);

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

  return (
    <div className="space-y-5">
      {/* Rango */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={rango} onValueChange={(v) => setRango(v as RangoType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="tres_meses">Últimos 3 meses</SelectItem>
            <SelectItem value="personalizado">Rango personalizado</SelectItem>
          </SelectContent>
        </Select>
        {rango === "personalizado" && (
          <>
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-40"
            />
          </>
        )}
        <Button variant="outline" size="sm" onClick={loadData}>
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando datos...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              label="Promedio asistencia"
              value={`${promedio}%`}
              icon={TrendingUp}
              color="blue"
            />
            <KpiCard
              label="Total eventos"
              value={eventos.length}
              icon={CalendarDays}
              color="green"
            />
            <KpiCard
              label="Total asistentes"
              value={totalAsistentes}
              icon={Users}
              color="orange"
            />
          </div>

          {/* Gráfico */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Asistencia semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="asistentes"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabla */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-100 overflow-y-auto">
                <Table containerClassName="overflow-visible">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 z-10 bg-gray-50">
                        Evento
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-gray-50">
                        Fecha
                      </TableHead>
                      <TableHead className="text-center sticky top-0 z-10 bg-gray-50">
                        Asistentes
                      </TableHead>
                      <TableHead className="text-center sticky top-0 z-10 bg-gray-50">
                        Ausentes
                      </TableHead>
                      <TableHead className="text-center sticky top-0 z-10 bg-gray-50">
                        % Asistencia
                      </TableHead>
                      <TableHead className="text-center sticky top-0 z-10 bg-gray-50">
                        Visitantes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-400"
                        >
                          Sin datos en el período seleccionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      eventos.map((ev) => {
                        const pct =
                          ev.total + ev.ausentes > 0
                            ? Math.round(
                                (ev.total / (ev.total + ev.ausentes)) * 100,
                              )
                            : 0;
                        return (
                          <TableRow key={ev.id}>
                            <TableCell className="font-medium">
                              {ev.nombre}
                            </TableCell>
                            <TableCell className="text-gray-500 text-xs">
                              {formatDate(ev.fecha)}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-green-700">
                              {ev.total}
                            </TableCell>
                            <TableCell className="text-center text-red-500">
                              {ev.ausentes}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  pct >= 70
                                    ? "success"
                                    : pct >= 40
                                      ? "warning"
                                      : "danger"
                                }
                              >
                                {pct}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-purple-600">
                              {ev.visitantes}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Tab: Personas ────────────────────────────────────────────────────────────

function TabPersonas() {
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
      const hace30 = subDays(hoy, 30);
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
  }, []);

  if (loading)
    return <div className="text-center py-24 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total registradas"
          value={kpis.total}
          icon={Users}
          color="gray"
        />
        <KpiCard
          label="Activos (<30 días)"
          value={kpis.activos}
          icon={Users}
          color="green"
        />
        <KpiCard
          label="Inactivos (+30 días)"
          value={kpis.inactivos}
          icon={UserMinus}
          color="orange"
        />
        <KpiCard
          label="Nuevos este mes"
          value={kpis.nuevos}
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          label="Visitantes"
          value={kpis.visitantes}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Gráfico nuevos por mes */}
      <Card>
        <CardHeader>
          <CardTitle>Nuevos por mes (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={nuevosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inactivos */}
      <Card>
        <CardHeader>
          <CardTitle>Personas inactivas (30+ días sin asistir)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-100 overflow-y-auto">
            <Table containerClassName="overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-gray-50">
                    Nombre
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50">
                    Último evento
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50 text-center">
                    Días sin asistir
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactivos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-gray-400"
                    >
                      Sin personas inactivas.
                    </TableCell>
                  </TableRow>
                ) : (
                  inactivos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {p.ultimoEvento}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.dias >= 90 ? "danger" : "warning"}>
                          {p.dias} días
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Nuevos del mes */}
      <Card>
        <CardHeader>
          <CardTitle>Nuevos del mes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-100 overflow-y-auto">
            <Table containerClassName="overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-gray-50">
                    Nombre
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50">
                    Fecha registro
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50">
                    Grupo actual
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nuevosDelMes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-gray-400"
                    >
                      Sin personas nuevas este mes.
                    </TableCell>
                  </TableRow>
                ) : (
                  nuevosDelMes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {p.fecha}
                      </TableCell>
                      <TableCell className="text-gray-600">{p.grupo}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Líderes ─────────────────────────────────────────────────────────────

function TabLideres() {
  const supabase = createClient();
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
      const { data: gruposData } = await supabase
        .from("grupos")
        .select("id, lider_id, sublider_id, nombre")
        .eq("estado", true);

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
      const { data: personasData } = await supabase
        .from("personas")
        .select("id, nombres, apellidos, tipo_persona")
        .is("deleted_at", null);

      const listaLideres = (personasData ?? []).filter(
        (p) =>
          p.tipo_persona === "lider" ||
          p.tipo_persona === "sublider" ||
          idsLideresGrupo.has(p.id),
      );

      // Eventos del último mes
      const { data: eventosData } = await supabase
        .from("eventos")
        .select("id, grupo_id")
        .gte("fecha", hace1m.toISOString().split("T")[0])
        .neq("estado", "cancelado");

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
  }, []);

  const top10 = lideres.slice(0, 10);

  if (loading)
    return <div className="text-center py-24 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-5">
      {/* Gráfico top 10 */}
      {top10.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 líderes por asistencia registrada</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={Math.max(280, top10.length * 32)}
            >
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  interval={0}
                  tick={{ fontSize: 11 }}
                  width={140}
                />
                <Tooltip />
                <Bar
                  dataKey="eventosRegistrados"
                  fill="#1d4ed8"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-100 overflow-y-auto">
            <Table containerClassName="overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-gray-50">
                    Líder
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50">
                    Grupo
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50 text-center">
                    Eventos registrados
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50 text-center">
                    % Registrado
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-gray-50 text-center">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lideres.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-400"
                    >
                      Sin líderes registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  lideres.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.nombre}</TableCell>
                      <TableCell className="text-gray-500">{l.grupo}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {l.eventosRegistrados}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            l.pctRegistrado >= 70
                              ? "success"
                              : l.pctRegistrado >= 40
                                ? "warning"
                                : "danger"
                          }
                        >
                          {l.pctRegistrado}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={l.activo ? "success" : "secondary"}>
                          {l.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Sin Reporte ─────────────────────────────────────────────────────────

type PersonaCompacta = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  correo: string | null;
  foto_url?: string | null;
};

type GrupoLiderInfo = {
  id: string;
  nombre: string;
  dia_reunion: string | null;
  hora_reunion: string | null;
  red: { id: string; nombre: string } | null;
  lider: PersonaCompacta | null;
  sublider: PersonaCompacta | null;
};

type EventoReporteInfo = {
  eventoId: string;
  eventoNombre: string;
  fecha: string;
  horaInicio: string | null;
  esGlobal: boolean;
  totalGrupos: number;
  gruposSinReporte: GrupoLiderInfo[];
  gruposConReporte: GrupoLiderInfo[];
};

function nrWeekInfo(dateStr: string): { label: string; range: string } {
  const day = parseInt(dateStr.slice(8, 10), 10);
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  if (day <= 7) return { label: "Semana 1", range: "1 – 7" };
  if (day <= 14) return { label: "Semana 2", range: "8 – 14" };
  if (day <= 21) return { label: "Semana 3", range: "15 – 21" };
  if (day <= 28) return { label: "Semana 4", range: "22 – 28" };
  return { label: "Semana 5", range: `29 – ${lastDay}` };
}

function TabNoReportado() {
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
  }, []);

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

  // Estadísticas globales del período actual
  const kpisActuales = useMemo(() => {
    const curMonth = format(new Date(), "yyyy-MM");
    const currentMonthEvents = filteredData.filter((e) =>
      e.fecha.startsWith(curMonth),
    );

    // Contar líderes únicos sin reporte en el mes actual
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
                  <SelectItem value="todas">Todas las redes</SelectItem>
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
                                  <div
                                    key={ev.eventoId}
                                    className="divide-y divide-gray-100"
                                  >
                                    {/* Cabecera de Evento */}
                                    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                                      <button
                                        type="button"
                                        onClick={() => toggleEvent(ev.eventoId)}
                                        className="flex items-center gap-3 text-left min-w-0 flex-1"
                                      >
                                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-700 shrink-0 font-bold">
                                          <span className="text-xs leading-none">
                                            {parseInt(
                                              ev.fecha.slice(8, 10),
                                              10,
                                            )}
                                          </span>
                                          <span className="text-[10px] uppercase mt-0.5">
                                            {format(parseISO(ev.fecha), "MMM", {
                                              locale: es,
                                            })}
                                          </span>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                              {ev.eventoNombre}
                                            </p>
                                            {ev.esGlobal && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] py-0"
                                              >
                                                Global
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            {ev.gruposSinReporte.length > 0 ? (
                                              <span className="text-red-600 font-medium">
                                                {ev.gruposSinReporte.length} de{" "}
                                                {totalEvGrupos} casas de paz sin
                                                reporte
                                              </span>
                                            ) : (
                                              <span className="text-green-600 font-medium">
                                                Todas las casas de paz
                                                reportaron
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
                                            onClick={() =>
                                              handleCopyList(ev, wl)
                                            }
                                            className="h-8 text-xs gap-1 border-gray-300 hover:bg-gray-100"
                                            title="Copiar lista de faltantes para WhatsApp"
                                          >
                                            {copiadoId === ev.eventoId ? (
                                              <>
                                                <Check className="h-3.5 w-3.5 text-green-600" />
                                                <span className="text-green-600 font-medium">
                                                  ¡Copiado!
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="h-3.5 w-3.5 text-gray-500" />
                                                <span className="hidden sm:inline">
                                                  Copiar lista
                                                </span>
                                              </>
                                            )}
                                          </Button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleEvent(ev.eventoId)
                                          }
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
                                        className="bg-green-600 h-1 transition-all duration-300"
                                        style={{ width: `${pctEv}%` }}
                                      />
                                    </div>

                                    {/* Lista de Líderes y Casas de Paz */}
                                    {isEvOpen && (
                                      <div className="bg-gray-50/60 divide-y divide-gray-100">
                                        {/* Grupos Sin Reporte */}
                                        {ev.gruposSinReporte.map((g) => {
                                          const liderNombre = g.lider
                                            ? getNombreCompleto(
                                                g.lider.nombres,
                                                g.lider.apellidos,
                                              )
                                            : "Sin líder asignado";
                                          const subliderNombre = g.sublider
                                            ? getNombreCompleto(
                                                g.sublider.nombres,
                                                g.sublider.apellidos,
                                              )
                                            : null;
                                          const waPhone = g.lider?.telefono
                                            ? g.lider.telefono.replace(
                                                /[^0-9]/g,
                                                "",
                                              )
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
                                                    <Badge
                                                      variant="danger"
                                                      className="text-[10px] py-0"
                                                    >
                                                      Sin reporte
                                                    </Badge>
                                                    {g.red && (
                                                      <Badge
                                                        variant="secondary"
                                                        className="text-[10px] py-0"
                                                      >
                                                        {g.red.nombre}
                                                      </Badge>
                                                    )}
                                                  </div>

                                                  <p className="text-xs text-gray-600 font-medium mt-0.5">
                                                    Casa de Paz:{" "}
                                                    <span className="text-gray-900">
                                                      {g.nombre}
                                                    </span>
                                                    {g.dia_reunion && (
                                                      <span className="text-gray-400 ml-1.5 capitalize">
                                                        · {g.dia_reunion}{" "}
                                                        {g.hora_reunion
                                                          ? `(${g.hora_reunion.slice(0, 5)})`
                                                          : ""}
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
                                              {waPhone || g.lider?.telefono ? (
                                                <div className="flex items-center gap-2 pl-12 md:pl-0 shrink-0">
                                                  {/* WhatsApp */}
                                                  {waPhone ? (
                                                    <a
                                                      href={`https://wa.me/${waPhone}?text=${waMessage}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                                                      title={`Enviar WhatsApp a ${liderNombre}`}
                                                    >
                                                      <MessageCircle className="h-3.5 w-3.5" />
                                                      <span className="hidden sm:inline">
                                                        WhatsApp
                                                      </span>
                                                    </a>
                                                  ) : null}

                                                  {/* Llamar */}
                                                  {g.lider?.telefono ? (
                                                    <a
                                                      href={`tel:${g.lider.telefono}`}
                                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors"
                                                      title={`Llamar a ${g.lider.telefono}`}
                                                    >
                                                      <Phone className="h-3.5 w-3.5" />
                                                      <span className="hidden sm:inline">
                                                        {g.lider.telefono}
                                                      </span>
                                                    </a>
                                                  ) : null}
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })}

                                        {/* Grupos Con Reporte (visibles si no está activado verSoloSinReporte) */}
                                        {!verSoloSinReporte &&
                                          ev.gruposConReporte.map((g) => {
                                            const liderNombre = g.lider
                                              ? getNombreCompleto(
                                                  g.lider.nombres,
                                                  g.lider.apellidos,
                                                )
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
                                                    <span className="text-xs text-gray-500 ml-2">
                                                      ({g.nombre})
                                                    </span>
                                                  </div>
                                                </div>
                                                <Badge
                                                  variant="success"
                                                  className="text-[10px] py-0"
                                                >
                                                  Reportado ✓
                                                </Badge>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
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

// ─── Tab: Exportar ────────────────────────────────────────────────────────────

function TabExportar() {
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const handleExportPersonas = async () => {
    setLoading("personas");
    const { data } = await supabase
      .from("personas")
      .select(
        "nombres, apellidos, correo, tipo_persona, telefono, fecha_registro",
      )
      .is("deleted_at", null)
      .order("nombres");
    if (data?.length) {
      exportCSV(
        data as Record<string, unknown>[],
        `personas_${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
    }
    setLoading(null);
  };

  const handleExportAsistencias = async () => {
    if (!desde || !hasta) {
      alert("Selecciona el rango de fechas");
      return;
    }
    setLoading("asistencias");
    const { data } = await supabase
      .from("asistencias")
      .select(
        `
        estado, created_at,
        persona:persona_id(nombres, apellidos),
        evento:evento_id(nombre, fecha)
      `,
      )
      .gte("created_at", desde)
      .lte("created_at", hasta + "T23:59:59");
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
    setLoading("inactivos");
    const hoy = new Date();
    const hace30 = subDays(hoy, 30);
    const { data: asistencias } = await supabase
      .from("asistencias")
      .select("persona_id, created_at")
      .eq("estado", "asistio")
      .gte("created_at", hace30.toISOString());
    const activos = new Set((asistencias ?? []).map((a) => a.persona_id));

    const { data: personas } = await supabase
      .from("personas")
      .select("id, nombres, apellidos, correo, tipo_persona, telefono")
      .is("deleted_at", null)
      .not("tipo_persona", "eq", "visitante");

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
    setLoading("nuevos");
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const { data } = await supabase
      .from("personas")
      .select("nombres, apellidos, correo, tipo_persona, fecha_registro")
      .is("deleted_at", null)
      .gte("fecha_registro", inicioMes.toISOString().split("T")[0])
      .order("fecha_registro", { ascending: false });
    if (data?.length)
      exportCSV(
        data as Record<string, unknown>[],
        `nuevos_${format(hoy, "yyyy-MM")}.csv`,
      );
    setLoading(null);
  };

  const handleExportSinReporte = async () => {
    setLoading("sin_reporte");
    const hoy = format(new Date(), "yyyy-MM-dd");
    const [
      { data: eventosData },
      { data: gruposData },
      { data: miembrosData },
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
          id, nombre, dia_reunion,
          red:red_id(nombre),
          lider:personas!lider_id(nombres, apellidos, telefono, correo),
          sublider:personas!sublider_id(nombres, apellidos, telefono)
        `,
        )
        .eq("estado", true)
        .is("deleted_at", null),
      supabase
        .from("grupo_miembros")
        .select("persona_id, grupo_id")
        .eq("activo", true),
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

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Exportar datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">
                Líderes sin reporte de asistencia
              </p>
              <p className="text-xs text-gray-500">
                Histórico de eventos, líderes pendientes, teléfonos y grupos
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSinReporte}
              loading={loading === "sin_reporte"}
            >
              <Download size={14} />
              CSV
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">
                Lista de personas
              </p>
              <p className="text-xs text-gray-500">
                Nombres, correo, tipo, teléfono, fecha registro
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPersonas}
              loading={loading === "personas"}
            >
              <Download size={14} />
              CSV
            </Button>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
            <div>
              <p className="font-medium text-sm text-gray-900">
                Asistencias por rango
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Selecciona el rango de fechas
              </p>
              <div className="flex gap-1 items-center">
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-36"
                />
                <span className="text-gray-400 text-sm">-</span>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-36"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAsistencias}
              loading={loading === "asistencias"}
            >
              <Download size={14} />
              Exportar CSV
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">
                Personas inactivas
              </p>
              <p className="text-xs text-gray-500">
                Sin asistencia en los últimos 30 días
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportInactivos}
              loading={loading === "inactivos"}
            >
              <Download size={14} />
              CSV
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">
                Nuevos del mes
              </p>
              <p className="text-xs text-gray-500">
                Personas registradas en el mes actual
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportNuevos}
              loading={loading === "nuevos"}
            >
              <Download size={14} />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        description="Análisis y estadísticas de la iglesia"
        breadcrumbs={[{ label: "Reportes" }]}
      />

      <Tabs defaultValue="asistencia">
        <TabsList>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="lideres">Líderes</TabsTrigger>
          <TabsTrigger value="no_reportado">Sin reporte</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="asistencia">
          <TabAsistencia />
        </TabsContent>

        <TabsContent value="personas">
          <TabPersonas />
        </TabsContent>

        <TabsContent value="lideres">
          <TabLideres />
        </TabsContent>

        <TabsContent value="no_reportado">
          <TabNoReportado />
        </TabsContent>

        <TabsContent value="exportar">
          <TabExportar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
