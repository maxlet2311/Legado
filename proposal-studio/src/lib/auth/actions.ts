"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { mapSupabaseError, logServerError } from "@/lib/utils/errors";
import { getSiteUrl } from "@/lib/utils/env";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";

interface ActionResult {
  error?: string;
}

/** Mensaje neutral: nunca debe permitir distinguir "no existe" de "contraseña incorrecta". */
const INVALID_CREDENTIALS_MESSAGE = "El correo o la contraseña no son correctos.";
const INACTIVE_ACCOUNT_MESSAGE = "Tu acceso se encuentra deshabilitado. Contactá al administrador.";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un correo electrónico válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

async function signInAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const redirectPath = sanitizeRedirectPath(formData.get("redirectTo"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Solo el rate limit es un mensaje legítimamente distinto: cualquier otro
    // código de Supabase (incluidos los que podrían indicar "usuario
    // inexistente") se colapsa al mismo mensaje neutral para no permitir
    // enumeración de emails vía login.
    if (error.code === "over_request_rate_limit") {
      return { error: mapSupabaseError(error) };
    }
    logServerError("signInAction", error);
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut();
    return { error: INACTIVE_ACCOUNT_MESSAGE };
  }

  redirect(redirectPath);
}

async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un correo electrónico válido."),
});

async function requestPasswordResetAction(
  _prevState: ActionResult & { success?: boolean },
  formData: FormData,
): Promise<ActionResult & { success?: boolean }> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    // Error de formato (input inválido), no de existencia de cuenta: se puede mostrar tal cual.
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/update-password`,
  });

  // Deliberadamente NO se propaga `error` al cliente: cuenta inexistente,
  // cuenta inactiva y error interno del proveedor deben verse exactamente
  // igual desde afuera. El detalle técnico queda solo en el log del server.
  if (error) {
    logServerError("requestPasswordResetAction", error);
  }

  return { success: true };
}

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

const INVALID_RECOVERY_LINK_MESSAGE = "El enlace de recuperación no es válido o expiró. Solicitá uno nuevo.";

async function updatePasswordAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();

  // `getUser()` revalida contra el servidor de Supabase Auth que la sesión de
  // recuperación (creada por el link del email) sigue siendo válida. Si el
  // link ya expiró o fue usado, no hay sesión y no debe llegarse a
  // `updateUser`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: INVALID_RECOVERY_LINK_MESSAGE };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    logServerError("updatePasswordAction", error);
    return { error: mapSupabaseError(error) };
  }

  // La sesión de recuperación se cierra explícitamente: el cambio de
  // contraseña no debe dejar al usuario logueado "de arrastre" sin pasar de
  // nuevo por signInAction, que es donde se revalida `is_active`.
  await supabase.auth.signOut();
  redirect("/login?updated=1");
}

export { signInAction, signOutAction, requestPasswordResetAction, updatePasswordAction };
