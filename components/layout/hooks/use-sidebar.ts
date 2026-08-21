"use client";

import { useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NavItem } from "../sidebar";

interface UseSidebarProps {
  isAdmin: boolean;
  hasRole: boolean;
  permisos: string[];
  navItems: NavItem[];
}

export function useSidebar({
  isAdmin,
  hasRole,
  permisos,
  navItems,
}: UseSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const canSeeModule = useCallback((module: string): boolean => {
    if (isAdmin) return true;
    if (!hasRole) return true; // no role assigned → unrestricted
    if (permisos.length === 0) return true;
    const moduleKeywords: Record<string, string[]> = {
      personas: ["personas"],
      redes: ["redes"],
      grupos: ["grupos", "miembros"],
      ministerios: ["ministerios"],
      eventos: ["eventos"],
      asistencias: ["asistencias"],
      evangelismo: ["evangelismo"],
      reportes: ["reportes"],
      usuarios: ["usuarios"],
      roles: ["roles"],
    };
    const keywords = moduleKeywords[module] ?? [module];
    return permisos.some((p) => keywords.some((kw) => p.includes(kw)));
  }, [isAdmin, hasRole, permisos]);

  const visibleItems = useMemo(() => {
    return navItems.filter((i) => {
      if (i.adminOnly)
        return (
          isAdmin || !hasRole || permisos.some((p) => p.includes("configuracion"))
        );

      const isRestrictedLeader = !isAdmin && hasRole && !permisos.includes('acceso_todas_redes');
      if (isRestrictedLeader && (i.module === 'asistencias' || i.module === 'eventos')) {
        return false;
      }

      if (i.module) return canSeeModule(i.module);
      return true;
    });
  }, [navItems, isAdmin, hasRole, permisos, canSeeModule]);

  const isActive = useCallback((href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const sections = useMemo(() => {
    return [...new Set(visibleItems.map((i) => i.section!))];
  }, [visibleItems]);

  return {
    collapsed,
    setCollapsed,
    visibleItems,
    isActive,
    handleLogout,
    sections,
  };
}
