import { PageHeader } from "@/components/shared/page-header";
import { ConfiguracionClient } from "./components/configuracion-client";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        description="Ajustes del sistema y tu cuenta"
        breadcrumbs={[{ label: "Sistema" }, { label: "Configuración" }]}
      />
      <ConfiguracionClient />
    </div>
  );
}
