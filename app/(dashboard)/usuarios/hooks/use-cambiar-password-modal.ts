"use client";

import { useState, useEffect } from "react";
import type { Usuario, Persona, Rol } from "@/types";

interface UsuarioRow extends Usuario {
  auth_email?: string;
  persona?: Persona;
  rol?: Rol;
}

interface UseCambiarPasswordModalProps {
  open: boolean;
  onClose: () => void;
  usuario: UsuarioRow | null;
}

export function useCambiarPasswordModal({
  open,
  onClose,
  usuario,
}: UseCambiarPasswordModalProps) {
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [linkGenerado, setLinkGenerado] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const email =
    usuario?.persona?.correo || usuario?.auth_email || "el usuario";
  const nombre = usuario?.persona
    ? `${usuario.persona.nombres} ${usuario.persona.apellidos}`
    : "Usuario";

  useEffect(() => {
    setNuevaPassword("");
    setError("");
    setSuccess("");
    setLinkGenerado(null);
    setCopied(false);
  }, [open, usuario]);

  const handleUpdatePassword = async () => {
    if (!usuario) return;
    if (!nuevaPassword.trim()) {
      setError("Escribe una nueva contraseña");
      return;
    }
    if (nuevaPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/usuarios/${usuario.id}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: nuevaPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al actualizar la contraseña");
      return;
    }

    setSuccess("Contraseña cambiada exitosamente.");
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleGenerateLink = async () => {
    if (!usuario) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/usuarios/${usuario.id}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.link) {
      setError(data.error ?? "Error generando el enlace de recuperación");
      return;
    }

    setLinkGenerado(data.link);
  };

  const handleCopyLink = async () => {
    if (!linkGenerado) return;
    try {
      await navigator.clipboard.writeText(linkGenerado);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return {
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
  };
}
