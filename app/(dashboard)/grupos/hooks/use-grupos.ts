"use client";

import { useState, useMemo } from "react";
import type { Grupo } from "@/types";

interface GrupoRow extends Grupo {
  miembros_count: number;
}

interface UseGruposProps {
  grupos: GrupoRow[];
  perPage?: number;
  redes?: { id: string; nombre: string }[];
}

export function useGrupos({ grupos, perPage = 10, redes = [] }: UseGruposProps) {
  const [search, setSearch] = useState("");
  const defaultRedFilter = redes.length === 1 ? redes[0].id : "all";
  const [redFilter, setRedFilter] = useState(defaultRedFilter);
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return grupos.filter((g) => {
      const matchSearch =
        !search ||
        g.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (g.lider &&
          `${g.lider.nombres} ${g.lider.apellidos}`
            .toLowerCase()
            .includes(search.toLowerCase()));
      const matchRed = redFilter === "all" || g.red_id === redFilter;
      const matchEstado =
        estadoFilter === "all" ||
        (estadoFilter === "activo" && g.estado) ||
        (estadoFilter === "inactivo" && !g.estado);
      return matchSearch && matchRed && matchEstado;
    });
  }, [grupos, search, redFilter, estadoFilter]);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleRed = (v: string) => {
    setRedFilter(v);
    setPage(1);
  };
  const handleEstado = (v: string) => {
    setEstadoFilter(v);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * perPage,
    safePage * perPage,
  );
  const fromIndex = filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const toIndex = Math.min(safePage * perPage, filtered.length);

  return {
    search,
    redFilter,
    estadoFilter,
    page,
    setPage,
    filtered,
    handleSearch,
    handleRed,
    handleEstado,
    totalPages,
    safePage,
    paginated,
    fromIndex,
    toIndex,
  };
}
