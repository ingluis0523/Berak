"use client";

import { useConfiguracion } from "../hooks/use-configuracion";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function TabMiCuenta() {
  const {
    perfil,
    setPerfil,
    contrasena,
    setContrasena,
    userEmail,
    userCreatedAt,
    savingPerfil,
    savingPass,
    msgPerfil,
    msgPass,
    errorPass,
    handleSavePerfil,
    handleChangePassword,
  } = useConfiguracion();

  return (
    <div className="space-y-5 max-w-xl">
      {/* Info de cuenta */}
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
            <span className="text-sm text-gray-500">Miembro desde</span>
            <span className="text-sm text-gray-900">
              {formatDate(userCreatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Editar perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Editar perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombres"
              value={perfil.nombres}
              onChange={(e) =>
                setPerfil((p) => ({ ...p, nombres: e.target.value }))
              }
            />
            <Input
              label="Apellidos"
              value={perfil.apellidos}
              onChange={(e) =>
                setPerfil((p) => ({ ...p, apellidos: e.target.value }))
              }
            />
          </div>
          <Input
            label="Teléfono"
            value={perfil.telefono}
            onChange={(e) =>
              setPerfil((p) => ({ ...p, telefono: e.target.value }))
            }
          />
          {msgPerfil && <p className="text-sm text-green-600">{msgPerfil}</p>}
          <Button onClick={handleSavePerfil} loading={savingPerfil}>
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={contrasena.nueva}
            onChange={(e) =>
              setContrasena((c) => ({ ...c, nueva: e.target.value }))
            }
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite la contraseña"
            value={contrasena.confirmar}
            onChange={(e) =>
              setContrasena((c) => ({ ...c, confirmar: e.target.value }))
            }
          />
          {errorPass && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{errorPass}</AlertDescription>
            </Alert>
          )}
          {msgPass && <p className="text-sm text-green-600">{msgPass}</p>}
          <Button onClick={handleChangePassword} loading={savingPass}>
            Actualizar contraseña
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
