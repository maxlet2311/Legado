import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/database/server";
import { createAdminClient } from "@/lib/database/admin";
import { ACTIVATION_TOKEN_COOKIE } from "@/lib/auth/oauth-constants";
import { consumeActivationInvitationForOAuthUser } from "@/lib/account-activation/service";
import {
  getCurrentMembershipForUser,
  getCurrentMembershipForEmail,
  linkMembershipToUser,
} from "@/lib/memberships/service";
import { ACTIVATION_ELIGIBLE_STATUSES } from "@/lib/memberships/types";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";
import { logServerError } from "@/lib/utils/errors";

export const runtime = "nodejs";

/**
 * Ventana usada para inferir "¿esta cuenta se acaba de crear en este mismo
 * login?" (Supabase no expone un flag explícito): se compara `created_at`
 * contra `last_sign_in_at` del propio `getUser()`. Para un usuario nuevo
 * ambos quedan a milisegundos de distancia; para uno preexistente,
 * `created_at` es muy anterior. Es una heurística, no una garantía — por
 * eso nunca se usa para *conceder* acceso, solo para decidir si hay que
 * limpiar una cuenta recién creada sin autorización (sección 14/16).
 */
const NEW_USER_WINDOW_MS = 10_000;

function isLikelyNewUser(user: { created_at: string; last_sign_in_at?: string | null }): boolean {
  if (!user.last_sign_in_at) return false;
  const createdMs = new Date(user.created_at).getTime();
  const signInMs = new Date(user.last_sign_in_at).getTime();
  return Number.isFinite(createdMs) && Number.isFinite(signInMs) && Math.abs(signInMs - createdMs) < NEW_USER_WINDOW_MS;
}

/**
 * Callback de Google OAuth vía Supabase Auth (Etapa 5, secciones 13–16).
 *
 * Defensa en profundidad contra registro gratuito (sección 14): la barrera
 * principal es el Auth Hook `before_user_created` (ver migración
 * `20260716050000_before_user_created_hook.sql`), que debe registrarse
 * manualmente en el dashboard de Supabase (Auth Hooks) — no es aplicable
 * desde este repositorio. Este callback aplica una segunda barrera
 * compensatoria: si detecta que la cuenta se creó recién en este mismo
 * intento y no corresponde a ninguna invitación/membresía elegible, la
 * elimina inmediatamente vía Admin API. Nunca se deja una cuenta huérfana
 * activa.
 */
async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeRedirectPath(url.searchParams.get("next"));

  const cookieStore = await cookies();
  const activationToken = cookieStore.get(ACTIVATION_TOKEN_COOKIE)?.value ?? null;
  cookieStore.delete(ACTIVATION_TOKEN_COOKIE);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_invalid", request.url));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    logServerError("auth.callback.exchange_failed", exchangeError);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  if (!user.email_confirmed_at) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const authUser = user;
  const email = authUser.email!.toLowerCase();
  const newUser = isLikelyNewUser(authUser);

  /** Nunca elimina una cuenta preexistente — solo una creada en este mismo intento. */
  async function rejectAndCleanUp(redirectPath: string, reason: string): Promise<NextResponse> {
    if (newUser) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(authUser.id);
        console.warn("[auth] oauth_orphan_account_deleted", { reason });
      } catch (error) {
        logServerError("auth.callback.delete_orphan_failed", error);
      }
    }
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!profile) {
    logServerError("auth.callback.profile_missing", { userId: authUser.id });
    return rejectAndCleanUp("/login?error=oauth_failed", "profile_missing");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=inactive", request.url));
  }

  // Activación con Google (sección 15): la invitación manda, no el estado "nuevo/existente".
  if (activationToken) {
    const result = await consumeActivationInvitationForOAuthUser({ token: activationToken, userId: authUser.id, email });
    if (!result.success) {
      // El token preservado en la redirección permite reintentar sin
      // depender de que el usuario haya guardado el enlace original — la
      // invitación no se consumió (el email no coincidió), sigue siendo
      // válida hasta su vencimiento normal.
      return rejectAndCleanUp(
        `/activate-account?token=${encodeURIComponent(activationToken)}&error=email_mismatch`,
        "activation_token_mismatch",
      );
    }
    return NextResponse.redirect(new URL("/login?activated=1", request.url));
  }

  // Login/registro normal con Google (sección 16).
  const existingMembership = await getCurrentMembershipForUser(authUser.id).catch(() => null);
  if (existingMembership) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const membershipByEmail = await getCurrentMembershipForEmail(email).catch(() => null);
  const eligibleByEmail =
    Boolean(membershipByEmail) &&
    !membershipByEmail!.userId &&
    ACTIVATION_ELIGIBLE_STATUSES.includes(membershipByEmail!.status);

  if (eligibleByEmail) {
    try {
      await linkMembershipToUser({
        membershipId: membershipByEmail!.id,
        userId: authUser.id,
        email,
        source: "activation",
        actorUserId: authUser.id,
      });
    } catch (error) {
      logServerError("auth.callback.auto_link_failed", error);
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (newUser) {
    // Cuenta recién creada por Google sin invitación ni membresía elegible:
    // Google OAuth nunca debe convertirse en un registro gratuito.
    return rejectAndCleanUp("/planes?error=membership_required", "new_user_without_membership");
  }

  // Usuario existente sin membresía: se permite el login. El gating de
  // funciones premium ocurre en `requireActiveMembership`, no acá.
  return NextResponse.redirect(new URL(next, request.url));
}

export { GET };
