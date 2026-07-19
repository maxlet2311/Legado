import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getMembershipEnforcementMode } from "@/lib/memberships/config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/proposals",
  "/proposal",
  "/clients",
  "/library",
  "/branding",
  "/preview",
  "/account",
  "/admin",
];

/**
 * Subconjunto de `PROTECTED_PREFIXES` que además requiere membresía con
 * acceso vigente (área `(premium)`, ver `src/app/(app)/(premium)/layout.tsx`).
 * Deliberadamente NO incluye `/account`: `/account/membership` debe seguir
 * accesible para un usuario autenticado sin membresía (sección 12).
 */
const PREMIUM_PREFIXES = ["/dashboard", "/proposals", "/proposal", "/clients", "/library", "/branding", "/preview"];

const CURRENT_STATUSES = ["pending", "authorized", "active", "past_due", "grace_period", "paused"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPremiumPath(pathname: string) {
  return PREMIUM_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Réplica deliberadamente simplificada de `evaluateMembershipAccess` (ver
 * `src/lib/memberships/access.ts`), solo para decidir un redirect rápido de
 * navegación ANTES de renderizar. Nunca es la fuente de verdad — el layout
 * `(premium)` vuelve a validar todo con `requireActiveMembership` de forma
 * independiente (sección 11: el middleware nunca es la única barrera). Se
 * evita reimportar la capa completa de servicios acá para no arrastrar
 * dependencias no aptas para el runtime de Edge Middleware.
 */
function isAccessBlocked(membership: {
  status: string;
  current_period_end: string | null;
  grace_period_end: string | null;
} | null): string | null {
  if (!membership) return "/planes";

  const now = Date.now();

  if (membership.status === "pending") return "/suscripcion/resultado";
  if (membership.status === "paused") return "/account/membership?status=paused";
  if (membership.status === "canceled" || membership.status === "expired") return "/planes";
  if (membership.status === "suspended") return "/account/membership?status=suspended";

  if (membership.status === "active" || membership.status === "authorized") {
    if (membership.current_period_end && new Date(membership.current_period_end).getTime() <= now) {
      return "/account/membership?status=required";
    }
    return null;
  }

  if (membership.status === "past_due" || membership.status === "grace_period") {
    if (!membership.grace_period_end || new Date(membership.grace_period_end).getTime() <= now) {
      return "/account/membership?payment=required";
    }
    return null;
  }

  return "/account/membership?status=inconsistent";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname)) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single();

    if (!profile || profile.is_active === false) {
      await supabase.auth.signOut();
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "inactive");
      return NextResponse.redirect(redirectUrl);
    }

    // Fase 1 Go-Live: barrera temporal de acceso mientras se prepara el
    // entorno para pruebas controladas. Off por defecto (sin variable, no
    // cambia el comportamiento actual). Solo aplica a rutas ya protegidas
    // (nunca a /auth/callback ni /api/webhooks, que no están en
    // PROTECTED_PREFIXES). Reversible: quitar TEMP_ACCESS_MODE del entorno.
    if (process.env.TEMP_ACCESS_MODE === "allowlist") {
      const allowlist = (process.env.TEMP_ACCESS_ALLOWLIST ?? "")
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
      const userEmail = user.email?.toLowerCase();

      if (!userEmail || !allowlist.includes(userEmail)) {
        const redirectUrl = new URL("/login", request.url);
        redirectUrl.searchParams.set("error", "restricted_access");
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Sección 6/11: solo se consulta membresía en `enforce` — en `off`/`audit`
    // esto sería una consulta desperdiciada, ya que ninguno de los dos modos
    // bloquea navegación (el propio guard tampoco lo haría). Evita el costo
    // de una consulta extra en cada navegación mientras la migración de
    // membresías no esté completa.
    if (getMembershipEnforcementMode() === "enforce" && isPremiumPath(pathname)) {
      const { data: membership } = await supabase
        .from("memberships")
        .select("status, current_period_end, grace_period_end")
        .eq("user_id", user.id)
        .in("status", CURRENT_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const blockedRedirect = isAccessBlocked(membership);
      if (blockedRedirect) {
        return NextResponse.redirect(new URL(blockedRedirect, request.url));
      }
    }
  }

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
