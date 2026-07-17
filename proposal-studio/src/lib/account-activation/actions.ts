"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { activateAccount } from "@/lib/account-activation/service";
import { checkRateLimit } from "@/lib/utils/rate-limit";

interface ActionResult {
  error?: string;
}

/**
 * Mensaje neutral: nunca debe permitir distinguir token inválido, vencido,
 * revocado o ya usado — cualquier detalle real queda solo en el log server.
 */
const INVALID_TOKEN_MESSAGE = "El enlace de activación no es válido o ya venció. Solicitá uno nuevo al administrador.";
const RATE_LIMITED_MESSAGE = "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";

const activateAccountSchema = z
  .object({
    token: z.string().min(1),
    fullName: z.string().trim().min(1, "Ingresá tu nombre completo."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

async function requestIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function activateAccountAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = activateAccountSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const ip = await requestIp();
  if (!checkRateLimit(`activate-account:${ip}`, 10, 15 * 60_000)) {
    return { error: RATE_LIMITED_MESSAGE };
  }

  const result = await activateAccount({
    token: parsed.data.token,
    fullName: parsed.data.fullName,
    password: parsed.data.password,
  });

  if (!result.success) {
    if (result.reason === "email_exists") {
      // Mismo mensaje neutral: no confirma existencia de cuenta a un tercero
      // que solo tiene un token (potencialmente interceptado/reenviado).
      return { error: INVALID_TOKEN_MESSAGE };
    }
    return { error: INVALID_TOKEN_MESSAGE };
  }

  redirect("/login?activated=1");
}

export { activateAccountAction };
