"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Usuario, Rol, Persona } from "@/types";

export interface UsuarioRow extends Usuario {
  auth_email?: string;
  persona?: Persona;
  rol?: Rol;
}

const PER_PAGE = 10;

export function useUsuarios() {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    usuario: UsuarioRow | null;
  }>({
    open: false,
    usuario: null,
  });
  const [toggling, setToggling] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<{
    open: boolean;
    usuario: UsuarioRow | null;
  }>({
    open: false,
    usuario: null,
  });

  // Load modal dependencies once
  useEffect(() => {
    async function loadAux() {
      const [{ data: rolesData }, { data: personasData }] = await Promise.all([
        supabase.from("roles").select("*").eq("activo", true).order("nombre"),
        supabase
          .from("personas")
          .select("id, nombres, apellidos, correo, tipo_persona")
          .is("deleted_at", null)
          .order("nombres"),
      ]);
      setRoles(rolesData ?? []);
      setPersonas((personasData ?? []) as Persona[]);
    }
    loadAux();
  }, [supabase]);

  // Load usuarios with backend pagination and auth_email fallback via API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/usuarios?page=${page}&limit=${PER_PAGE}&search=${encodeURIComponent(search.trim())}`,
      );
      const data = await res.json();
      if (res.ok) {
        setUsuarios(data.usuarios ?? []);
        setTotalCount(data.totalCount ?? 0);
        setIsSuperAdminUser(!!data.is_superadmin);
      } else {
        setUsuarios([]);
        setTotalCount(0);
      }
    } catch {
      setUsuarios([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleToggleEstado = async (usuario: UsuarioRow) => {
    setToggling(usuario.id);
    await supabase
      .from("usuarios")
      .update({ estado: !usuario.estado })
      .eq("id", usuario.id);
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuario.id ? { ...u, estado: !u.estado } : u,
      ),
    );
    setToggling(null);
  };

  const handleOpenResetPassword = (u: UsuarioRow) => {
    setResetModal({ open: true, usuario: u });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const fromIndex = totalCount === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const toIndex = Math.min(page * PER_PAGE, totalCount);

  return {
    usuarios,
    roles,
    personas,
    loading,
    search,
    page,
    setPage,
    totalCount,
    isSuperAdminUser,
    modalOpen,
    setModalOpen,
    editModal,
    setEditModal,
    toggling,
    resetModal,
    setResetModal,
    loadData,
    handleSearchChange,
    handleToggleEstado,
    handleOpenResetPassword,
    totalPages,
    fromIndex,
    toIndex,
  };
}
