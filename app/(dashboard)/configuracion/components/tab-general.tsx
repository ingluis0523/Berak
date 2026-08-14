"use client";

import { useConfiguracionGeneral } from '../hooks/use-configuracion-general'
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TabGeneral() {
  const {
    nombreIglesia,
    setNombreIglesia,
    saving,
    msg,
    userEmail,
    userCreatedAt,
    handleSave,
  } = useConfiguracionGeneral();

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Información de la iglesia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nombre de la iglesia"
            value={nombreIglesia}
            onChange={(e) => setNombreIglesia(e.target.value)}
            placeholder="Nombre de la iglesia"
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">
              Nombre de la plataforma
            </p>
            <Input value="Berak" disabled className="bg-gray-50" />
            <p className="text-xs text-gray-400">
              El nombre de la plataforma no puede modificarse.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Logo</p>
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">
                Para cambiar el logo, contacta al administrador técnico o
                reemplaza el archivo{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  public/logo.png
                </code>
              </p>
            </div>
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <Button onClick={handleSave} loading={saving}>
            Guardar configuración
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">
              {userEmail}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Cuenta creada</span>
            <span className="text-sm text-gray-900">
              {formatDate(userCreatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
