"use client";

import { useState, useEffect } from "react";
import type { Rol, Usuario, Persona } from "@/types";

interface UsuarioRow extends Usuario {
  auth_email?: string;
  persona?: Persona;
  rol?: Rol;
}

interface UseEditarRolModalProps {
  usuario: UsuarioRow | null;
  roles: Rol[];
  isSuperAdminUser: boolean;
  onSaved: () => void;
  onClose: () => void;
}

export function useEditarRolModal({
  usuario,
  roles,
  isSuperAdminUser,
  onSaved,
  onClose,
}: UseEditarRolModalProps) {
  const [rolId, setRolId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (usuario) setRolId(usuario.rol_id ?? "");
  }, [usuario]);

  const availableRoles = isSuperAdminUser
    ? roles
    : roles.filter(
        (r) =>
          !r.nombre
            .toLowerCase()
            .replace(/[\s_-]/g, "")
            .includes("superadmin"),
      );

  const handleSave = async () => {
    if (!usuario) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/usuarios/${usuario.id}/rol`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol_id: rolId || null }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Error al actualizar el rol");
      return;
    }

    onSaved();
    onClose();
  };

  return {
    rolId,
    setRolId,
    saving,
    error,
    availableRoles,
    handleSave,
  };
}
