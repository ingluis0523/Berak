"use client";

import { useState } from "react";
import type { Rol, Persona } from "@/types";

interface UseNuevoUsuarioModalProps {
  onCreated: () => void;
  onClose: () => void;
  roles: Rol[];
  personas: Persona[];
  isSuperAdminUser: boolean;
}

export function useNuevoUsuarioModal({
  onCreated,
  onClose,
  roles,
  personas,
  isSuperAdminUser,
}: UseNuevoUsuarioModalProps) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    personaId: "",
    rolId: "",
  });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const availableRoles = isSuperAdminUser
    ? roles
    : roles.filter(
        (r) =>
          !r.nombre
            .toLowerCase()
            .replace(/[\s_-]/g, "")
            .includes("superadmin"),
      );

  const filteredPersonas = personas.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nombres.toLowerCase().includes(q) ||
      p.apellidos.toLowerCase().includes(q) ||
      (p.correo ?? "").toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      setError("Email y contraseña son requeridos");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        persona_id: form.personaId || null,
        rol_id: form.rolId || null,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setSaving(false);
      setError(result.error ?? "Error al crear usuario");
      return;
    }

    setSaving(false);
    setSuccess("Usuario creado exitosamente.");
    setTimeout(() => {
      onCreated();
      onClose();
      setForm({ email: "", password: "", personaId: "", rolId: "" });
      setSuccess("");
    }, 1000);
  };

  const handleClose = () => {
    setForm({ email: "", password: "", personaId: "", rolId: "" });
    setError("");
    setSuccess("");
    setSearch("");
    onClose();
  };

  return {
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
  };
}
