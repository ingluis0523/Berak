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
      // 1. Fetch authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 2. Fetch roles
      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .eq("activo", true)
        .order("nombre")
      setRoles(rolesData ?? [])

      // 3. Fetch caller usuario and determine scoping
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, persona_id, rol_id, rol:roles(id, nombre)')
        .eq('id', user.id)
        .maybeSingle()

      let rol: { id: string; nombre: string } | null = null
      if (usuario) {
        rol = (Array.isArray(usuario.rol) ? usuario.rol[0] : usuario.rol) as { id: string; nombre: string } | null
      }

      const ADMIN_ROLES = ['superadmin', 'super admin', 'super_admin', 'super-admin', 'administrador', 'admin', 'pastor', 'pastora', 'secretaria', 'secretario']
      const cleanRol = rol?.nombre?.toLowerCase().trim().replace(/[\s_-]/g, '') ?? ''
      const is_admin = ADMIN_ROLES.some(r => r.replace(/[\s_-]/g, '') === cleanRol) || cleanRol.includes('admin') || cleanRol.includes('pastor') || cleanRol.includes('secretar')

      let permisos: string[] = []
      if (usuario?.rol_id) {
        const { data: rolPerms } = await supabase
          .from('rol_permisos')
          .select('permiso_id')
          .eq('rol_id', usuario.rol_id)

        const permisoIds = (rolPerms ?? []).map((rp) => rp.permiso_id).filter(Boolean)
        if (permisoIds.length > 0) {
          const { data: permsData } = await supabase
            .from('permisos')
            .select('nombre')
            .in('id', permisoIds)
          permisos = (permsData ?? []).map((p) => p.nombre)
        }
      }

      const hasFullAccess = is_admin || permisos.includes('acceso_todas_redes')

      let scopedPersonaIds: string[] = []
      if (!hasFullAccess && usuario?.persona_id) {
        let is_encargado_red = false
        let red_id: string | null = null

        const { data: rl } = await supabase
          .from('redes')
          .select('id')
          .eq('lider_id', usuario.persona_id)
          .is('deleted_at', null)
          .eq('estado', true)
          .limit(1)
          .maybeSingle()

        if (rl?.id) {
          is_encargado_red = true
          red_id = rl.id
        }

        let myGroupIds: string[] = []
        if (is_encargado_red && red_id) {
          const { data: networkGroups } = await supabase
            .from('grupos')
            .select('id')
            .eq('red_id', red_id)
            .is('deleted_at', null)
          myGroupIds = (networkGroups ?? []).map((g) => g.id)
        } else {
          const { data: gms } = await supabase
            .from('grupo_miembros')
            .select('grupo_id')
            .eq('persona_id', usuario.persona_id)
            .eq('activo', true)
          const miembro_grupo_ids = (gms ?? []).map((gm) => gm.grupo_id).filter(Boolean) as string[]

          const { data: gruposLider } = await supabase
            .from('grupos')
            .select('id')
            .eq('lider_id', usuario.persona_id)
            .is('deleted_at', null)
          const lider_grupo_ids = (gruposLider ?? []).map((g) => g.id)

          myGroupIds = Array.from(new Set([...lider_grupo_ids, ...miembro_grupo_ids]))
        }

        if (myGroupIds.length > 0) {
          const { data: groupRoles } = await supabase
            .from('grupos')
            .select('lider_id, sublider_id, anfitrion_id')
            .in('id', myGroupIds)
            .is('deleted_at', null);

          const roleIds = (groupRoles ?? [])
            .flatMap((g) => [g.lider_id, g.sublider_id, g.anfitrion_id])
            .filter(Boolean) as string[];

          const { data: members } = await supabase
            .from('grupo_miembros')
            .select('persona_id')
            .in('grupo_id', myGroupIds)
            .eq('activo', true)
          const memberIds = (members ?? []).map((m) => m.persona_id).filter(Boolean) as string[]

          const startingLiders = Array.from(new Set([usuario.persona_id, ...roleIds, ...memberIds].filter(Boolean) as string[]))
          scopedPersonaIds = [...startingLiders]
        }

        if (scopedPersonaIds.length === 0) {
          scopedPersonaIds = ['00000000-0000-0000-0000-000000000000']
        }
      }

      // Fetch personas
      let personasQuery = supabase
        .from("personas")
        .select("id, nombres, apellidos, correo, tipo_persona")
        .is("deleted_at", null)
        .order("nombres")

      if (!hasFullAccess) {
        personasQuery = personasQuery.or(`id.in.(${scopedPersonaIds.join(',')}),lider_id.in.(${scopedPersonaIds.join(',')})`)
      }

      const { data: personasData } = await personasQuery
      setPersonas((personasData ?? []) as Persona[])
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
