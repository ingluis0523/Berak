"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useConfiguracion() {
  const supabase = createClient();
  const [perfil, setPerfil] = useState({
    nombres: "",
    apellidos: "",
    telefono: "",
  });
  const [contrasena, setContrasena] = useState({ nueva: "", confirmar: "" });
  const [userEmail, setUserEmail] = useState("");
  const [userCreatedAt, setUserCreatedAt] = useState("");
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState("");
  const [msgPass, setMsgPass] = useState("");
  const [errorPass, setErrorPass] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? "");
      setUserCreatedAt(user.created_at);

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("persona_id")
        .eq("id", user.id)
        .single();

      if (usuario?.persona_id) {
        const { data: persona } = await supabase
          .from("personas")
          .select("nombres, apellidos, telefono")
          .eq("id", usuario.persona_id)
          .single();
        if (persona) {
          setPerfil({
            nombres: persona.nombres ?? "",
            apellidos: persona.apellidos ?? "",
            telefono: persona.telefono ?? "",
          });
        }
      }
    };
    load();
  }, [supabase]);

  const handleSavePerfil = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSavingPerfil(true);
    setMsgPerfil("");

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("persona_id")
      .eq("id", user.id)
      .single();

    if (usuario?.persona_id) {
      const { error } = await supabase
        .from("personas")
        .update({
          nombres: perfil.nombres,
          apellidos: perfil.apellidos,
          telefono: perfil.telefono || null,
        })
        .eq("id", usuario.persona_id);
      if (error) {
        setSavingPerfil(false);
        setMsgPerfil("Error: " + error.message);
        return;
      }
    }
    setSavingPerfil(false);
    setMsgPerfil("Perfil actualizado correctamente.");
    setTimeout(() => setMsgPerfil(""), 3000);
  };

  const handleChangePassword = async () => {
    setErrorPass("");
    setMsgPass("");
    if (!contrasena.nueva || !contrasena.confirmar) {
      setErrorPass("Completa todos los campos");
      return;
    }
    if (contrasena.nueva.length < 8) {
      setErrorPass("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (contrasena.nueva !== contrasena.confirmar) {
      setErrorPass("Las contraseñas no coinciden");
      return;
    }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({
      password: contrasena.nueva,
    });
    setSavingPass(false);
    if (error) {
      setErrorPass(error.message);
      return;
    }
    setContrasena({ nueva: "", confirmar: "" });
    setMsgPass("Contraseña actualizada correctamente.");
    setTimeout(() => setMsgPass(""), 3000);
  };

  return {
    perfil,
    setPerfil,
    contrasena,
    setContrasena,
    userEmail,
    userCreatedAt,
    savingPerfil,
    savingPass,
    msgPerfil,
    msgPass,
    errorPass,
    handleSavePerfil,
    handleChangePassword,
  };
}
