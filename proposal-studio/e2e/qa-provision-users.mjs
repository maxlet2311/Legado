// Script temporal de la Etapa 6 (QA integral admin). Provisiona/limpia usuarios
// de prueba con prefijo h0-qa- (patrón ya usado por provision-users.mjs).
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

const REGULAR = { email: "h0-qa-regular@proposalstudio.test", password: "H0-qa-TestPass-Reg1!" };
const INACTIVE = { email: "h0-qa-inactive@proposalstudio.test", password: "H0-qa-TestPass-Ina1!" };

async function main(mode) {
  if (mode === "create") {
    const { data: regData, error: regErr } = await admin.auth.admin.createUser({
      email: REGULAR.email,
      password: REGULAR.password,
      email_confirm: true,
      user_metadata: { full_name: "QA Regular" },
    });
    if (regErr) throw new Error(`create regular: ${regErr.message}`);

    const { data: inactData, error: inactErr } = await admin.auth.admin.createUser({
      email: INACTIVE.email,
      password: INACTIVE.password,
      email_confirm: true,
      user_metadata: { full_name: "QA Inactive" },
    });
    if (inactErr) throw new Error(`create inactive: ${inactErr.message}`);

    const { error: updErr } = await admin.from("profiles").update({ is_active: false }).eq("id", inactData.user.id);
    if (updErr) throw new Error(`deactivate: ${updErr.message}`);

    console.log(JSON.stringify({ regular: regData.user.id, inactive: inactData.user.id }));
  } else if (mode === "delete") {
    const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of list.users) {
      if (u.email && u.email.startsWith("h0-qa-")) {
        await admin.auth.admin.deleteUser(u.id);
        console.log("deleted", u.email);
      }
    }
  } else {
    throw new Error("usage: node qa-provision-users.mjs create|delete");
  }
}

main(process.argv[2]).catch((err) => {
  console.error(err);
  process.exit(1);
});
