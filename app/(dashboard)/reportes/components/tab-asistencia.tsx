"use client";

import { useReporteAsistencia } from '../hooks/use-reporte-asistencia'
import { RangoType } from './helpers'
import { KpiCard } from "./kpi-card";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarDays,
  TrendingUp,
  Users,
} from "lucide-react";

export function TabAsistencia() {
  const {
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
  } = useReporteAsistencia();

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
