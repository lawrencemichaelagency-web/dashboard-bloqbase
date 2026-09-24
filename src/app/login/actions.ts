"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/core/lib/supabase-server";

export type LoginState = { error: string } | null;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.warn("[login] authentication failed", error);
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/");
}
