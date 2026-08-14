"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Correo inválido"),
});

export type ForgotPasswordFormData = z.infer<typeof schema>;

export function useForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      data.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );
    setLoading(false);
    if (authError) {
      setError("No se pudo enviar el correo. Intenta de nuevo.");
      return;
    }
    setSent(true);
  };

  return {
    sent,
    error,
    loading,
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
  };
}
