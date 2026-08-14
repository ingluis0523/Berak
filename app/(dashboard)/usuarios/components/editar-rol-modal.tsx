"use client";

import { useEditarRolModal } from '../hooks/use-editar-rol-modal'
import type { Rol, Usuario, Persona } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface UsuarioRow extends Usuario {
  auth_email?: string;
  persona?: Persona;
  rol?: Rol;
}

export function EditarRolModal({
  usuario,
  roles,
  isSuperAdminUser,
  open,
  onClose,
  onSaved,
}: {
  usuario: UsuarioRow | null;
  roles: Rol[];
  isSuperAdminUser: boolean;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    rolId,
    setRolId,
    saving,
    error,
    availableRoles,
    handleSave,
  } = useEditarRolModal({
    usuario,
    roles,
    isSuperAdminUser,
    onSaved,
    onClose,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Editar rol</DialogTitle>
          <DialogDescription>
            Cambiar el rol asignado al usuario
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Rol</p>
            <Select value={rolId} onValueChange={setRolId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin rol asignado" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
