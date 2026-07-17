"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/database/server";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";
import { getSiteUrl } from "@/lib/utils/env";
import { logServerError } from "@/lib/utils/errors";
import { ACTIVATION_TOKEN_COOKIE, ACTIVATION_TOKEN_TTL_SECONDS } from "@/lib/auth/oauth-constants";

/**
 * Inicia el flujo de "Continuar con Google" (Etapa 5, sección 13) tanto
 * desde `/login` (sin token) como desde `/activate-account` (con token de
 * invitación). El token de activación nunca viaja como query param del
 * proveedor OAuth ni se guarda en `localStorage`: se guarda en una cookie
 * `HttpOnly`/`Secure` (en producción)/`SameSite=Lax` de vida muy corta, que
 * `/auth/callback` lee y borra en el mismo request — nunca sobrevive más
 * allá de ese único intercambio.
 */
async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = sanitizeRedirectPath(formData.get("next"));
  const activationToken = formData.get("activationToken");

  if (typeof activationToken === "string" && activationToken.length > 0) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVATION_TOKEN_COOKIE, activationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACTIVATION_TOKEN_TTL_SECONDS,
      path: "/",
    });
  }

  const supabase = await createClient();
  const callbackUrl = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data?.url) {
    logServerError("signInWithGoogleAction", error);
    redirect("/login?error=oauth_failed");
  }

  redirect(data.url);
}

export { signInWithGoogleAction };
