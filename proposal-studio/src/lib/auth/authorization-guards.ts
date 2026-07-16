import "server-only";

import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import type { Profile } from "@/lib/auth/session";
import { createClient } from "@/lib/database/server";
import { isAdmin, isPlatformOwner, ForbiddenError } from "@/lib/auth/authorization";

/**
 * Guard central: exige sesión válida (usuario + profile) con `is_active ===
 * true`. Reutiliza `requireSession` (memoizada con `React.cache` por
 * request), así que no dispara llamadas duplicadas a Supabase Auth/`profiles`
 * aunque se invoque varias veces en el mismo request. Un `profile` inexistente
 * cuenta como inactivo (fila borrada o no provisionada).
 *
 * Es la base de `requireAdmin`/`requirePlatformOwner`, pero también debe
 * llamarse directamente en cualquier Server Action o Route Handler que lea o
 * mute datos privados: el middleware ya revalida `is_active` para navegación
 * de página, pero no cubre Route Handlers fuera de los prefijos protegidos
 * (p. ej. `/api/**`) ni reemplaza el chequeo dentro de la propia mutación
 * (defensa en profundidad).
 */
async function requireActiveUser(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof requireSession>>["user"]>; profile: Profile }> {
  const { user, profile } = await requireSession();

  if (!profile || !profile.is_active) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  return { user, profile };
}

/**
 * Guard server-side para funciones administrativas operativas (dashboard de
 * producto, gestión de las propias propuestas/clientes/branding). Nunca
 * confía en el cliente: vuelve a resolver la sesión contra el servidor de
 * Supabase Auth (`requireActiveUser`) y exige `role === 'admin'` además de
 * usuario activo. Ocultar botones en la UI no reemplaza este chequeo — se
 * debe llamar antes de cualquier operación administrativa en Server
 * Actions/Route Handlers.
 */
async function requireAdmin(): Promise<Profile> {
  const { profile } = await requireActiveUser();

  if (!isAdmin(profile)) {
    throw new ForbiddenError("Requiere permisos de administrador.");
  }

  return profile;
}

/**
 * Guard server-side exclusivo del dueño de la plataforma: gestión global de
 * usuarios, asignación de roles, configuración técnica/global, feature flags,
 * mantenimiento. El platform owner NO obtiene automáticamente acceso a datos
 * privados de otros usuarios (propuestas/clientes ajenos) — eso sigue
 * dependiendo de RLS y del ownership existente salvo que se implemente
 * explícitamente una función de soporte/auditoría separada.
 */
async function requirePlatformOwner(): Promise<Profile> {
  const { profile } = await requireActiveUser();

  if (!isPlatformOwner(profile)) {
    throw new ForbiddenError("Requiere ser el propietario de la plataforma.");
  }

  return profile;
}

export { requireActiveUser, requireAdmin, requirePlatformOwner };
