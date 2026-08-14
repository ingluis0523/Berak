"use client";

import { useNuevoUsuarioModal } from '../hooks/use-nuevo-usuario-modal'
import type { Rol, Persona } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Search, AlertCircle } from "lucide-react";

export function NuevoUsuarioModal({
  open,
  onClose,
  onCreated,
  roles,
  personas,
  isSuperAdminUser,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  roles: Rol[];
  personas: Persona[];
  isSuperAdminUser: boolean;
}) {
  const {
    form,
    setForm,
    search,
    setSearch,
    saving,
    error,
    success,
    availableRoles,
    filteredPersonas,
    handleCreate,
    handleClose,
  } = useNuevoUsuarioModal({
    onCreated,
    onClose,
    roles,
    personas,
    isSuperAdminUser,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea una cuenta de acceso al sistema
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <Input
            label="Email *"
            type="email"
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            autoComplete="off"
          />
          <Input
            label="Contraseña temporal *"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            hint="Mínimo 8 caracteres"
            autoComplete="new-password"
          />

          {/* Persona asociada - buscable */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">
              Persona asociada
            </p>
            <Input
              placeholder="Buscar persona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={14} />}
            />
            <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, personaId: "" }))}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  form.personaId === ""
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-500"
                }`}
              >
                Sin persona asociada
              </button>
              {filteredPersonas.slice(0, 20).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      personaId: p.id,
                      email: p.correo ? p.correo : f.email,
                    }));
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    form.personaId === p.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {p.nombres} {p.apellidos}
                  {p.correo && (
                    <span className="text-gray-400 ml-1 text-xs">
                      ({p.correo})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Rol</p>
            <Select
              value={form.rolId}
              onValueChange={(v) => setForm((f) => ({ ...f, rolId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin rol" />
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
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} loading={saving}>
            <UserPlus size={15} />
            Crear usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
