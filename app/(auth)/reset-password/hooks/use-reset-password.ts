"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof schema>;

export function useResetPassword() {
  const router = useRouter();
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({
      password: data.password,
    });
    setLoading(false);
    if (authError) {
      setError("No se pudo actualizar la contraseña. Intenta de nuevo.");
      return;
    }
    router.push("/login");
  };

  return {
    show1,
    setShow1,
    show2,
    setShow2,
    error,
    loading,
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
  };
}
