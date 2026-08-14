"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useConfiguracionGeneral() {
  const supabase = createClient();
  const [nombreIglesia, setNombreIglesia] = useState("IglesiaJCReina");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userCreatedAt, setUserCreatedAt] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "");
        setUserCreatedAt(user.created_at);
      }
    };
    load();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    // Simular guardado
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setMsg("Configuración guardada.");
    setTimeout(() => setMsg(""), 3000);
  };

  return {
    nombreIglesia,
    setNombreIglesia,
    saving,
    msg,
    userEmail,
    userCreatedAt,
    handleSave,
  };
}
