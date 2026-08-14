"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabAsistencia } from "./components/tab-asistencia";
import { TabPersonas } from "./components/tab-personas";
import { TabLideres } from "./components/tab-lideres";
import { TabNoReportado } from "./components/tab-no-reportado";
import { TabExportar } from "./components/tab-exportar";

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
