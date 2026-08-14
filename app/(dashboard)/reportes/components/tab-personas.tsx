"use client";

import { useState } from "react";
import { useReportePersonas } from '../hooks/use-reporte-personas'
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [pageInactivos, setPageInactivos] = useState(1);
  const [pageNuevos, setPageNuevos] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const {
    loading,
    loadingInactivos,
    loadingNuevos,
    nuevosPorMes,
    inactivos,
    nuevosDelMes,
    kpis,
  } = useReportePersonas({ pageInactivos, pageNuevos, itemsPerPage: ITEMS_PER_PAGE });

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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <CardTitle>Personas inactivas (30+ días sin asistir)</CardTitle>
          <Badge variant="secondary" className="font-semibold">
            {kpis.inactivos} en total
          </Badge>
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
                {loadingInactivos ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-gray-400 animate-pulse"
                    >
                      Cargando página...
                    </TableCell>
                  </TableRow>
                ) : inactivos.length === 0 ? (
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
          {kpis.inactivos > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-gray-500">
                Página {pageInactivos} de {Math.ceil(kpis.inactivos / ITEMS_PER_PAGE)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageInactivos === 1 || loadingInactivos}
                  onClick={() => setPageInactivos(p => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageInactivos >= Math.ceil(kpis.inactivos / ITEMS_PER_PAGE) || loadingInactivos}
                  onClick={() => setPageInactivos(p => Math.min(Math.ceil(kpis.inactivos / ITEMS_PER_PAGE), p + 1))}
                  className="h-8 text-xs"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nuevos del mes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <CardTitle>Nuevos del mes</CardTitle>
          <Badge variant="secondary" className="font-semibold">
            {kpis.nuevos} en total
          </Badge>
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
                {loadingNuevos ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-gray-400 animate-pulse"
                    >
                      Cargando página...
                    </TableCell>
                  </TableRow>
                ) : nuevosDelMes.length === 0 ? (
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
          {kpis.nuevos > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-gray-500">
                Página {pageNuevos} de {Math.ceil(kpis.nuevos / ITEMS_PER_PAGE)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageNuevos === 1 || loadingNuevos}
                  onClick={() => setPageNuevos(p => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageNuevos >= Math.ceil(kpis.nuevos / ITEMS_PER_PAGE) || loadingNuevos}
                  onClick={() => setPageNuevos(p => Math.min(Math.ceil(kpis.nuevos / ITEMS_PER_PAGE), p + 1))}
                  className="h-8 text-xs"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
