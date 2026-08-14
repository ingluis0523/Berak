"use client";

import { useCambiarPasswordModal } from '../hooks/use-cambiar-password-modal'
import type { Usuario, Persona, Rol } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, KeyRound, Copy, Check } from "lucide-react";

interface UsuarioRow extends Usuario {
  auth_email?: string;
  persona?: Persona;
  rol?: Rol;
}

export function CambiarPasswordModal({
  open,
  onClose,
  usuario,
}: {
  open: boolean;
  onClose: () => void;
  usuario: UsuarioRow | null;
}) {
  const {
    nuevaPassword,
    setNuevaPassword,
    loading,
    error,
    success,
    linkGenerado,
    copied,
    email,
    nombre,
    handleUpdatePassword,
    handleGenerateLink,
    handleCopyLink,
  } = useCambiarPasswordModal({
    open,
    onClose,
    usuario,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Actualizar contraseña de <strong>{nombre}</strong> ({email})
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Opción 1: Asignar contraseña directamente */}
          <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Opción 1: Establecer nueva contraseña directamente
            </p>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Escribe la nueva contraseña (mín. 6 caracteres)"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                hint="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <Button
                onClick={handleUpdatePassword}
                loading={loading}
                className="w-full"
                size="sm"
              >
                <KeyRound size={14} />
                Guardar nueva contraseña
              </Button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-3 text-xs text-gray-400 font-medium">
              O TAMBIÉN
            </span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Opción 2: Generar enlace de recuperación */}
          <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 border border-blue-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              Opción 2: Generar enlace de recuperación
            </p>
            <p className="text-xs text-gray-600">
              Genera un enlace de un solo uso válido por 24 horas para
              enviárselo al usuario.
            </p>

            {linkGenerado ? (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={linkGenerado}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 bg-white font-mono truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="shrink-0 bg-white"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-[11px] text-green-700 font-medium">
                  ✓ Enlace generado listo para enviar por WhatsApp o correo.
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateLink}
                loading={loading}
                className="w-full bg-white"
              >
                Generar enlace de restablecimiento
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium">
              ✓ {success}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
