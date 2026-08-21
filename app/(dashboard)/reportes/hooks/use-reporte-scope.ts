"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useReporteScope() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [hasFullAccess, setHasFullAccess] = useState(true);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [scopedPersonaIds, setScopedPersonaIds] = useState<string[]>([]);

  useEffect(() => {
    async function resolveScope() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: usuario } = await supabase
          .from('usuarios')
          .select('id, persona_id, rol_id, rol:roles(id, nombre)')
          .eq('id', user.id)
          .maybeSingle();

        let rol: { id: string; nombre: string } | null = null;
        if (usuario) {
          rol = (Array.isArray(usuario.rol) ? usuario.rol[0] : usuario.rol) as { id: string; nombre: string } | null;
        }

        const ADMIN_ROLES = ['superadmin', 'super admin', 'super_admin', 'super-admin', 'administrador', 'admin', 'pastor', 'pastora', 'secretaria', 'secretario'];
        const cleanRol = rol?.nombre?.toLowerCase().trim().replace(/[\s_-]/g, '') ?? '';
        const is_admin = ADMIN_ROLES.some(r => r.replace(/[\s_-]/g, '') === cleanRol) || cleanRol.includes('admin') || cleanRol.includes('pastor') || cleanRol.includes('secretar');

        let permisos: string[] = [];
        if (usuario?.rol_id) {
          const { data: rolPerms } = await supabase
            .from('rol_permisos')
            .select('permiso_id')
            .eq('rol_id', usuario.rol_id);

          const permisoIds = (rolPerms ?? []).map((rp) => rp.permiso_id).filter(Boolean);
          if (permisoIds.length > 0) {
            const { data: permsData } = await supabase
              .from('permisos')
              .select('nombre')
              .in('id', permisoIds);
            permisos = (permsData ?? []).map((p) => (p as { nombre: string }).nombre);
          }
        }

        const fullAccess = is_admin || permisos.includes('acceso_todas_redes');
        setHasFullAccess(fullAccess);

        if (!fullAccess && usuario?.persona_id) {
          let is_encargado_red = false;
          let red_id: string | null = null;

          const { data: rl } = await supabase
            .from('redes')
            .select('id')
            .eq('lider_id', usuario.persona_id)
            .is('deleted_at', null)
            .eq('estado', true)
            .limit(1)
            .maybeSingle();

          if (rl?.id) {
            is_encargado_red = true;
            red_id = rl.id;
          }

          let groups: string[] = [];
          if (is_encargado_red && red_id) {
            const { data: networkGroups } = await supabase
              .from('grupos')
              .select('id')
              .eq('red_id', red_id)
              .is('deleted_at', null);
            groups = (networkGroups ?? []).map((g) => g.id);
          } else {
            const { data: gms } = await supabase
              .from('grupo_miembros')
              .select('grupo_id')
              .eq('persona_id', usuario.persona_id)
              .eq('activo', true);
            const miembro_grupo_ids = (gms ?? []).map((gm) => gm.grupo_id).filter(Boolean) as string[];

            const { data: gruposLider } = await supabase
              .from('grupos')
              .select('id')
              .eq('lider_id', usuario.persona_id)
              .is('deleted_at', null);
            const lider_grupo_ids = (gruposLider ?? []).map((g) => g.id);

            groups = Array.from(new Set([...lider_grupo_ids, ...miembro_grupo_ids]));
          }
          setMyGroupIds(groups);

          if (groups.length > 0) {
            const { data: groupRoles } = await supabase
              .from('grupos')
              .select('lider_id, sublider_id, anfitrion_id')
              .in('id', groups)
              .is('deleted_at', null);

            const roleIds = (groupRoles ?? [])
              .flatMap((g) => [g.lider_id, g.sublider_id, g.anfitrion_id])
              .filter(Boolean) as string[];

            const { data: members } = await supabase
              .from('grupo_miembros')
              .select('persona_id')
              .in('grupo_id', groups)
              .eq('activo', true);
            const memberIds = (members ?? []).map((m) => m.persona_id).filter(Boolean) as string[];

            const startingLiders = Array.from(new Set([usuario.persona_id, ...roleIds, ...memberIds].filter(Boolean) as string[]));
            let resolvedPersonaIds = [...startingLiders];

            setScopedPersonaIds(resolvedPersonaIds.length > 0 ? resolvedPersonaIds : ['00000000-0000-0000-0000-000000000000']);
          } else {
            setScopedPersonaIds(['00000000-0000-0000-0000-000000000000']);
          }
        }
      } catch (err) {
        console.error("Error resolving report scope:", err);
      } finally {
        setLoading(false);
      }
    }

    resolveScope();
  }, [supabase]);

  return { loading, hasFullAccess, myGroupIds, scopedPersonaIds };
}
