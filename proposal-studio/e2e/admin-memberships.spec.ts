import { test, expect, type Page } from "@playwright/test";

// Fixtures requeridas (no se crean automáticamente — ver docs/MEMBERSHIP_OPERATIONS.md):
// - PLATFORM_OWNER: usuario real con profiles.is_platform_owner = true.
// - REGULAR_USER: usuario activo sin is_platform_owner, con membresía "active" vigente
//   (para poder loguear y llegar a /dashboard antes de intentar /admin).
// Reemplazar por credenciales de un entorno de prueba dedicado — NUNCA productivas.
const PLATFORM_OWNER = {
  email: process.env.E2E_PLATFORM_OWNER_EMAIL ?? "",
  password: process.env.E2E_PLATFORM_OWNER_PASSWORD ?? "",
};
const REGULAR_USER = {
  email: process.env.E2E_REGULAR_USER_EMAIL ?? "",
  password: process.env.E2E_REGULAR_USER_PASSWORD ?? "",
};

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Correo Electrónico").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("Admin — autorización de /admin/**", () => {
  test.skip(!PLATFORM_OWNER.email || !REGULAR_USER.email, "Requiere E2E_PLATFORM_OWNER_* y E2E_REGULAR_USER_* en el entorno.");

  test("usuario común no puede acceder a /admin/memberships", async ({ page }) => {
    await login(page, REGULAR_USER);
    await page.goto("/admin/memberships");
    // requirePlatformOwner() lanza ForbiddenError -> la app debe mostrar un
    // error de autorización, nunca el panel administrativo.
    await expect(page.getByText(/no ten[eé]s permiso|forbidden|no autorizado/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Platform Owner accede al listado de membresías", async ({ page }) => {
    await login(page, PLATFORM_OWNER);
    await page.goto("/admin/memberships");
    await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
  });

  test("Platform Owner accede a planes, salud y configuración", async ({ page }) => {
    await login(page, PLATFORM_OWNER);

    await page.goto("/admin/membership-plans");
    await expect(page.getByRole("heading", { name: "Planes de membresía" })).toBeVisible();

    await page.goto("/admin/memberships/health");
    await expect(page.getByRole("heading", { name: "Centro de salud" })).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
    await expect(page.getByText("RESEND_API_KEY")).toBeVisible();
  });
});

test.describe("Enforcement — MEMBERSHIP_ENFORCEMENT_MODE", () => {
  test.skip(
    process.env.MEMBERSHIP_ENFORCEMENT_MODE !== "enforce",
    "Solo aplica cuando el servidor de pruebas corre con MEMBERSHIP_ENFORCEMENT_MODE=enforce.",
  );
  test.skip(!REGULAR_USER.email, "Requiere E2E_REGULAR_USER_* en el entorno.");

  test("usuario sin membresía vigente es redirigido desde área premium", async ({ page }) => {
    await login(page, REGULAR_USER);
    await page.goto("/proposals/new");
    await page.waitForURL(/\/planes|\/account\/membership/);
  });
});
