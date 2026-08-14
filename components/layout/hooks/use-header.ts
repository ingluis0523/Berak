"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const email = user?.email ?? "";
  const initials = useMemo(() => {
    return email.slice(0, 2).toUpperCase();
  }, [email]);

  const goConfiguracion = () => {
    router.push("/configuracion");
  };

  return {
    user,
    email,
    initials,
    handleLogout,
    goConfiguracion,
  };
}
