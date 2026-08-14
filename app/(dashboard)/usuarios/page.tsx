import { PageHeader } from "@/components/shared/page-header";
import { UsuariosClient } from "./components/usuarios-client";

export default function UsuariosPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        description="Gestión de cuentas de acceso al sistema"
        breadcrumbs={[{ label: "Sistema" }, { label: "Usuarios" }]}
      />
      <UsuariosClient />
    </div>
  );
}
