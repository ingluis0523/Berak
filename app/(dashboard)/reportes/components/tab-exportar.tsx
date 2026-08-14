"use client";

import { useReporteExportar } from '../hooks/use-reporte-exportar'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export function TabExportar() {
  const {
    loading,
    desde,
    setDesde,
    hasta,
    setHasta,
    handleExportPersonas,
    handleExportAsistencias,
    handleExportInactivos,
    handleExportNuevos,
    handleExportSinReporte,
  } = useReporteExportar();

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
