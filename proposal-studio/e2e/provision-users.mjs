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

const USERS = [
  { email: "h0-e2e-user-a@proposalstudio.test", password: "H0-e2e-TestPass-A1!" },
  { email: "h0-e2e-user-b@proposalstudio.test", password: "H0-e2e-TestPass-B1!" },
];

async function main(mode) {
  if (mode === "create") {
    const ids = {};
    for (const u of USERS) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw new Error(`create ${u.email}: ${error.message}`);
      ids[u.email] = data.user.id;
    }
    console.log(JSON.stringify(ids));
  } else if (mode === "delete") {
    const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of list.users) {
      if (u.email && u.email.startsWith("h0-e2e-")) {
        await admin.auth.admin.deleteUser(u.id);
        console.log("deleted", u.email);
      }
    }
  } else {
    throw new Error("usage: node provision-users.mjs create|delete");
  }
}

main(process.argv[2]).catch((err) => {
  console.error(err);
  process.exit(1);
});
