// Prueba directa (sin browser) de la lógica de platform owner + RLS.
// Crea usuarios temporales, valida guards y restricciones, y limpia todo al final.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL_, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const OWNER_USER_ID = "98a388bb-5385-42e2-98d5-9db0b716af82";

// Réplica exacta de src/lib/auth/authorization.ts (funciones puras) para
// validar el mismo predicado sin necesitar un bundler con path aliases.
function isAdmin(profile) {
  return profile.role === "admin";
}
function isPlatformOwner(profile) {
  return profile.role === "admin" && profile.is_platform_owner === true;
}
// Réplica de requireActiveUser: sesión válida + profile.is_active === true.
function requireActiveUserPasses(profile) {
  return Boolean(profile) && profile.is_active === true;
}
function requireAdminPasses(profile) {
  return requireActiveUserPasses(profile) && isAdmin(profile);
}
function requirePlatformOwnerPasses(profile) {
  return requireActiveUserPasses(profile) && isPlatformOwner(profile);
}

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`OK   - ${label}`);
  } else {
    console.log(`FAIL - ${label}`);
    failures++;
  }
}

const tempUsers = [];

async function createTempUser(email, password, metadata) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  tempUsers.push({ id: data.user.id, email });
  return data.user.id;
}

async function getProfile(userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, user_id, full_name, role, is_active, is_platform_owner")
    .eq("id", userId)
    .single();
  if (error) throw new Error(`getProfile ${userId}: ${error.message}`);
  return data;
}

async function main() {
  console.log("=== 1. Platform owner (Max) ===");
  const ownerProfile = await getProfile(OWNER_USER_ID);
  check("owner.role === 'admin'", ownerProfile.role === "admin");
  check("owner.is_platform_owner === true", ownerProfile.is_platform_owner === true);
  check("owner.is_active === true", ownerProfile.is_active === true);
  check("requireActiveUser pasa para el owner", requireActiveUserPasses(ownerProfile));
  check("requireAdmin pasa para el owner", requireAdminPasses(ownerProfile));
  check("requirePlatformOwner pasa para el owner", requirePlatformOwnerPasses(ownerProfile));

  console.log("\n=== 2. Admin operativo (no owner) ===");
  const adminUserId = await createTempUser(
    "h0-po-test-admin@proposalstudio.test",
    "H0-po-TestPass-Adm1!",
    { full_name: "Temp Admin" },
  );
  await admin.from("profiles").update({ role: "admin" }).eq("id", adminUserId);
  const adminProfile = await getProfile(adminUserId);
  check("admin.role === 'admin'", adminProfile.role === "admin");
  check("admin.is_platform_owner === false", adminProfile.is_platform_owner === false);
  check("requireActiveUser pasa para admin operativo", requireActiveUserPasses(adminProfile));
  check("requireAdmin pasa para admin operativo", requireAdminPasses(adminProfile));
  check("requirePlatformOwner FALLA para admin operativo", !requirePlatformOwnerPasses(adminProfile));

  console.log("\n=== 3. Advisor ===");
  const advisorUserId = await createTempUser(
    "h0-po-test-advisor@proposalstudio.test",
    "H0-po-TestPass-Adv1!",
    { full_name: "Temp Advisor" },
  );
  const advisorProfile = await getProfile(advisorUserId);
  check("advisor.role === 'advisor' (default)", advisorProfile.role === "advisor");
  check("advisor.is_platform_owner === false", advisorProfile.is_platform_owner === false);
  check("requireActiveUser pasa para advisor", requireActiveUserPasses(advisorProfile));
  check("requireAdmin FALLA para advisor", !requireAdminPasses(advisorProfile));
  check("requirePlatformOwner FALLA para advisor", !requirePlatformOwnerPasses(advisorProfile));

  console.log("\n=== 4. Usuario admin pero inactivo ===");
  const inactiveUserId = await createTempUser(
    "h0-po-test-inactive@proposalstudio.test",
    "H0-po-TestPass-Ina1!",
    { full_name: "Temp Inactive Admin" },
  );
  await admin.from("profiles").update({ role: "admin", is_active: false }).eq("id", inactiveUserId);
  const inactiveProfile = await getProfile(inactiveUserId);
  check("inactive.role === 'admin'", inactiveProfile.role === "admin");
  check("inactive.is_active === false", inactiveProfile.is_active === false);
  check("requireActiveUser FALLA para admin inactivo (bloquea sin importar role/owner)", !requireActiveUserPasses(inactiveProfile));
  check("requireAdmin FALLA para admin inactivo", !requireAdminPasses(inactiveProfile));
  check("requirePlatformOwner FALLA para admin inactivo", !requirePlatformOwnerPasses(inactiveProfile));

  console.log("\n=== 5. Metadata en signup NO puede autoasignar owner/admin ===");
  const escalationUserId = await createTempUser(
    "h0-po-test-escalation@proposalstudio.test",
    "H0-po-TestPass-Esc1!",
    { full_name: "Temp Escalation", is_platform_owner: true, role: "admin" },
  );
  const escalationProfile = await getProfile(escalationUserId);
  check("metadata NO asignó role='admin' (nace 'advisor')", escalationProfile.role === "advisor");
  check("metadata NO asignó is_platform_owner=true (nace false)", escalationProfile.is_platform_owner === false);

  console.log("\n=== 6. Usuario normal no puede escalar sus propios privilegios (RLS) ===");
  const anonClient = createClient(URL_, ANON_KEY);
  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email: "h0-po-test-advisor@proposalstudio.test",
    password: "H0-po-TestPass-Adv1!",
  });
  if (signInError) throw new Error(`signIn advisor: ${signInError.message}`);

  const { data: escalated, error: updateError } = await anonClient
    .from("profiles")
    .update({ role: "admin", is_platform_owner: true })
    .eq("id", advisorUserId)
    .select();
  check(
    "UPDATE directo de role/is_platform_owner por el propio usuario no aplica (RLS sin policy de UPDATE)",
    (updateError !== null || !escalated || escalated.length === 0),
  );
  const advisorAfterAttempt = await getProfile(advisorUserId);
  check("El perfil del advisor sigue intacto tras el intento de escalada", advisorAfterAttempt.role === "advisor" && advisorAfterAttempt.is_platform_owner === false);

  console.log("\n=== 7. update_own_profile RPC solo toca full_name ===");
  const { data: rpcResult, error: rpcError } = await anonClient.rpc("update_own_profile", {
    p_full_name: "Advisor Renombrado",
  });
  check("update_own_profile no tira error", rpcError === null);
  check("update_own_profile actualiza full_name", rpcResult?.full_name === "Advisor Renombrado");
  check("update_own_profile NO cambia role", rpcResult?.role === "advisor");
  check("update_own_profile NO cambia is_platform_owner", rpcResult?.is_platform_owner === false);

  console.log("\n=== 8. No puede existir un segundo platform owner (constraint DB) ===");
  const { error: secondOwnerError } = await admin
    .from("profiles")
    .update({ is_platform_owner: true })
    .eq("id", adminUserId);
  check(
    "Intentar un segundo is_platform_owner=true falla por índice único",
    secondOwnerError !== null && /duplicate key|unique/i.test(secondOwnerError.message ?? ""),
  );

  console.log(`\n${failures === 0 ? "TODAS LAS PRUEBAS PASARON" : `${failures} PRUEBA(S) FALLARON`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

async function cleanup() {
  console.log("\n=== Limpieza ===");
  for (const u of tempUsers) {
    await admin.auth.admin.deleteUser(u.id);
    console.log(`deleted ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(cleanup);
