"use client";

import { useReportePersonas } from '../hooks/use-reporte-personas'
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  UserMinus,
} from "lucide-react";
import { KpiCard } from "./kpi-card";

export function TabPersonas() {
  const {
    loading,
    nuevosPorMes,
    inactivos,
    nuevosDelMes,
    kpis,
  } = useReportePersonas();

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
