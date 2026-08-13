// Infraestructura de QA permanente (no descartable): borra clientes,
// propuestas y sus datos dependientes generados por la suite E2E/scripts de
// diagnóstico contra Supabase real. Complementa a provision-users.mjs /
// qa-provision-users.mjs (que crean/borran los USUARIOS de prueba) -- este
// script borra los DATOS que esos usuarios acumulan al correr los tests,
// sin tocar los usuarios en sí.
//
// Identificación de datos de prueba: exclusivamente por pertenecer a un
// user_id cuyo email en auth.users empieza con uno de los prefijos ya
// establecidos en el repo para cuentas de prueba (h0-e2e-, h0-qa-). Nunca
// se identifica por nombre/patrón de texto en clientes o propuestas (poco
// confiable) -- la cuenta dueña es la única señal que no puede confundirse
// con un usuario real, porque esos emails no existen fuera de este flujo.
//
// Orden de borrado (respeta las FK definidas en supabase/migrations/):
//   1. Objetos de Storage bajo `{bucket}/{user_id}/...` en los 4 buckets que
//      usan ese layout (proposal-files, proposal-previews, brand-assets,
//      signatures) -- las FK de Postgres no tocan Storage, así que si no se
//      borran acá quedan huérfanos para siempre.
//   2. Filas de `proposals` por `user_id` -- cascada automática (ON DELETE
//      CASCADE) a narratives/sections/alternatives/benefits/files/versions/
//      version_artifacts/events/comparisons.
//   3. Filas de `clients` por `user_id` -- solo puede pasar DESPUÉS del paso
//      2: `proposals.client_id` es `ON DELETE RESTRICT`, así que un cliente
//      con propuestas vivas rechaza el delete.
//
// Uso:
//   node e2e/qa-cleanup-data.mjs                 -> dry-run (default, no borra nada)
//   node e2e/qa-cleanup-data.mjs --dry-run        -> igual, explícito
//   node e2e/qa-cleanup-data.mjs --confirm        -> borra de verdad
//   node e2e/qa-cleanup-data.mjs --confirm --prefix=h0-e2e-   -> limita a un prefijo
//
// Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// (mismo archivo que usan provision-users.mjs y los tests E2E).

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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_TEST_EMAIL_PREFIXES = ["h0-e2e-", "h0-qa-"];
const STORAGE_BUCKETS_WITH_USER_PREFIX = ["proposal-files", "proposal-previews", "brand-assets", "signatures"];

function parseArgs(argv) {
  const confirm = argv.includes("--confirm");
  const prefixArg = argv.find((a) => a.startsWith("--prefix="));
  const prefixes = prefixArg ? [prefixArg.slice("--prefix=".length)] : DEFAULT_TEST_EMAIL_PREFIXES;
  return { confirm, prefixes };
}

async function findTestUsers(prefixes) {
  const users = [];
  let page = 1;
  // listUsers pagina de a 50 por default; 200 alcanza para el volumen de
  // cuentas de prueba que genera esta suite, pero se pagina igual por si crece.
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) {
      if (u.email && prefixes.some((p) => u.email.startsWith(p))) users.push({ id: u.id, email: u.email });
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return users;
}

async function listAllStorageObjects(bucket, prefix) {
  const paths = [];
  // list() no es recursivo: hay que bajar carpeta por carpeta (proposal-files
  // usa `{user_id}/{proposal_id}/{version_id}/archivo.pdf`).
  async function walk(currentPrefix) {
    const { data, error } = await admin.storage.from(bucket).list(currentPrefix, { limit: 1000 });
    if (error) throw new Error(`storage.list(${bucket}/${currentPrefix}): ${error.message}`);
    for (const entry of data ?? []) {
      const fullPath = currentPrefix ? `${currentPrefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // Entrada sin `id` = "carpeta" virtual en Supabase Storage.
        await walk(fullPath);
      } else {
        paths.push(fullPath);
      }
    }
  }
  await walk(prefix);
  return paths;
}

async function main() {
  const { confirm, prefixes } = parseArgs(process.argv.slice(2));
  console.log(`Modo: ${confirm ? "BORRADO REAL" : "dry-run (nada se borra)"}`);
  console.log(`Prefijos de email considerados datos de prueba: ${prefixes.join(", ")}`);

  const users = await findTestUsers(prefixes);
  if (users.length === 0) {
    console.log("No se encontraron usuarios de prueba con esos prefijos. Nada que hacer.");
    return;
  }
  console.log(`Usuarios de prueba encontrados: ${users.length}`);
  for (const u of users) console.log(`  - ${u.email} (${u.id})`);

  let totalProposals = 0;
  let totalClients = 0;
  let totalStorageObjects = 0;

  for (const user of users) {
    const { count: proposalsCount, error: proposalsCountErr } = await admin
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (proposalsCountErr) throw new Error(`count proposals for ${user.email}: ${proposalsCountErr.message}`);

    const { count: clientsCount, error: clientsCountErr } = await admin
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (clientsCountErr) throw new Error(`count clients for ${user.email}: ${clientsCountErr.message}`);

    const storagePathsByBucket = {};
    let userStorageCount = 0;
    for (const bucket of STORAGE_BUCKETS_WITH_USER_PREFIX) {
      const paths = await listAllStorageObjects(bucket, user.id);
      if (paths.length > 0) storagePathsByBucket[bucket] = paths;
      userStorageCount += paths.length;
    }

    console.log(
      `\n${user.email}: ${proposalsCount ?? 0} propuestas, ${clientsCount ?? 0} clientes, ${userStorageCount} objetos de storage`,
    );

    totalProposals += proposalsCount ?? 0;
    totalClients += clientsCount ?? 0;
    totalStorageObjects += userStorageCount;

    if (!confirm) continue;

    for (const [bucket, paths] of Object.entries(storagePathsByBucket)) {
      const { error: removeErr } = await admin.storage.from(bucket).remove(paths);
      if (removeErr) throw new Error(`storage.remove(${bucket}) for ${user.email}: ${removeErr.message}`);
      console.log(`  borrados ${paths.length} objetos de ${bucket}`);
    }

    // Cascada automática hacia narratives/alternatives/benefits/comparisons/
    // versions/version_artifacts/events/sections/files -- ver comentario de
    // cabecera para las FK exactas.
    const { error: deleteProposalsErr } = await admin.from("proposals").delete().eq("user_id", user.id);
    if (deleteProposalsErr) throw new Error(`delete proposals for ${user.email}: ${deleteProposalsErr.message}`);
    console.log(`  borradas propuestas (y dependientes en cascada)`);

    // Recién ahora es seguro: proposals.client_id es ON DELETE RESTRICT.
    const { error: deleteClientsErr } = await admin.from("clients").delete().eq("user_id", user.id);
    if (deleteClientsErr) throw new Error(`delete clients for ${user.email}: ${deleteClientsErr.message}`);
    console.log(`  borrados clientes`);
  }

  console.log(
    `\nTotal: ${totalProposals} propuestas, ${totalClients} clientes, ${totalStorageObjects} objetos de storage ${
      confirm ? "borrados" : "se borrarían con --confirm"
    }.`,
  );
  if (!confirm) {
    console.log("Nada fue borrado (dry-run). Volvé a correr con --confirm para ejecutar el borrado real.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
