"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UseCancelarEventoProps {
  eventoId: string;
}

export function useCancelarEvento({ eventoId }: UseCancelarEventoProps) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancelar() {
    setLoading(true);
    await supabase
      .from("eventos")
      .update({ estado: "cancelado" })
      .eq("id", eventoId);
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return {
    open,
    setOpen,
    loading,
    handleCancelar,
  };
}
