import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/current-user";
import { ConfiguracionClient } from "./components/configuracion-client";

export default async function ConfiguracionPage() {
  const currentUser = await getCurrentUser();
  const canSeeSystemSettings = !!(
    currentUser?.is_admin ||
    (currentUser?.permisos ?? []).includes("ver_configuracion") ||
    (currentUser?.permisos ?? []).includes("gestionar_configuracion")
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        description="Ajustes del sistema y tu cuenta"
        breadcrumbs={[{ label: "Sistema" }, { label: "Configuración" }]}
      />
      <ConfiguracionClient canSeeSystemSettings={canSeeSystemSettings} />
    </div>
  );
}
