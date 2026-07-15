import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/database/server";
import type { Tables } from "@/lib/database/types";

type Profile = Pick<Tables<"profiles">, "id" | "full_name" | "role" | "is_active">;

interface Session {
  user: Awaited<ReturnType<typeof resolveSession>>["user"];
  profile: Profile | null;
}

/**
 * Resuelve usuario + perfil una única vez por request. `getUser()` valida la
 * sesión contra el servidor de Supabase Auth (nunca confía en cookies sin
 * verificar); `cache()` memoiza el resultado dentro del mismo render de
 * Server Components para evitar llamadas duplicadas a auth.getUser() y a
 * `profiles` cuando varios componentes de la misma request necesitan sesión.
 */
const resolveSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  return { user, profile };
});

async function getSession(): Promise<Session> {
  return resolveSession();
}

async function getCurrentUser() {
  const { user } = await resolveSession();
  return user;
}

async function getCurrentProfile(): Promise<Profile | null> {
  const { profile } = await resolveSession();
  return profile;
}

async function requireUser() {
  const { user } = await resolveSession();

  if (!user) {
    redirect("/login");
  }

  return user;
}

async function requireSession(): Promise<{ user: NonNullable<Session["user"]>; profile: Profile | null }> {
  const { user, profile } = await resolveSession();

  if (!user) {
    redirect("/login");
  }

  return { user, profile };
}

export { getSession, getCurrentUser, getCurrentProfile, requireUser, requireSession };
