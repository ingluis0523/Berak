"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Settings, Zap } from "lucide-react";
import { TabMiCuenta } from "./tab-mi-cuenta";
import { TabEstados } from "./tab-estados";
import { TabAutomatizaciones } from "./tab-automatizaciones";
import { TabGeneral } from "./tab-general";

export function ConfiguracionClient() {
  return (
    <Tabs defaultValue="cuenta">
      <TabsList>
        <TabsTrigger value="cuenta">
          <User size={14} />
          Mi cuenta
        </TabsTrigger>
        <TabsTrigger value="estados">
          <Settings size={14} />
          Estados de persona
        </TabsTrigger>
        <TabsTrigger value="automatizaciones">
          <Zap size={14} />
          Automatizaciones
        </TabsTrigger>
        <TabsTrigger value="general">
          <Settings size={14} />
          General
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cuenta">
        <TabMiCuenta />
      </TabsContent>

      <TabsContent value="estados">
        <TabEstados />
      </TabsContent>

      <TabsContent value="automatizaciones">
        <TabAutomatizaciones />
      </TabsContent>

      <TabsContent value="general">
        <TabGeneral />
      </TabsContent>
    </Tabs>
  );
}
