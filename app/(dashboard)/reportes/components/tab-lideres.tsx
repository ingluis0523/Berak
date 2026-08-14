"use client";

import { useReporteLideres } from '../hooks/use-reporte-lideres'
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

export function TabLideres() {
  const {
    loading,
    lideres,
    top10,
  } = useReporteLideres();

  if (loading)
    return <div className="text-center py-24 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-5">
      {/* Gráfico top 10 */}
      {top10.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 líderes por eventos registrados</CardTitle>
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
