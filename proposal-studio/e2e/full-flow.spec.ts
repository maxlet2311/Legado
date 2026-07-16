import { test, expect, type Page } from "@playwright/test";

const USER_A = { email: "h0-e2e-user-a@proposalstudio.test", password: "H0-e2e-TestPass-A1!" };
const USER_B = { email: "h0-e2e-user-b@proposalstudio.test", password: "H0-e2e-TestPass-B1!" };

const RUN_ID = Date.now();

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Correo Electrónico").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");
}

async function createProposalUpToEdit(page: Page, clientName: string, title: string) {
  await page.goto("/proposals/new");
  await page.getByRole("button", { name: "Crear cliente nuevo" }).click();
  await page.getByLabel("Nombre").fill(clientName);
  await page.getByLabel("Email", { exact: true }).fill(`${clientName.toLowerCase().replace(/\s+/g, ".")}@cliente.test`);
  await page.getByRole("button", { name: "Crear y seleccionar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/proposal\/.+\/edit/);

  // Step 1: Cliente (ya seleccionado) -> Siguiente
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 2: Información
  await page.getByLabel("Título", { exact: false }).first().fill(title);
  await page.getByLabel("Producto", { exact: false }).first().fill("Vida Integral Plus");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 3: Diagnóstico
  await page.getByLabel("Situación actual", { exact: false }).fill("Cliente sin cobertura de vida ni ahorro formal.");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 4: Alternativas (paso opcional — isValid siempre true; el CRUD de
  // alternativas/beneficios se prueba aparte en el test dedicado).
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 5: Recomendación
  await page.getByLabel("Recomendación", { exact: false }).fill("Recomendamos el Plan Vida Integral por su cobertura y flexibilidad.");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 6: Beneficios (paso opcional — isValid siempre true).
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 7: Comparativa -> Siguiente (sin datos, es opcional)
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 8: Resumen
  await expect(page.getByText(title)).toBeVisible();
}

test.describe("Flujo completo — Proposal Studio", () => {
  test("login, crear propuesta, wizard completo, emitir versión, PDF, historial, logout", async ({ page }) => {
    await login(page, USER_A);

    await createProposalUpToEdit(page, `Cliente E2E Flujo ${RUN_ID}`, `Propuesta E2E Flujo Completo ${RUN_ID}`);

    await page.getByRole("button", { name: "Finalizar propuesta" }).click();
    await expect(page.getByText("Propuesta finalizada.")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Emitir versión" }).click();
    await expect(page.getByRole("link", { name: "Ver preview" })).toBeVisible({ timeout: 20_000 });

    await page.goto(page.url().replace("/edit", ""));
    await expect(page.getByText("Versión 1")).toBeVisible();

    const [generateResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/pdf") && res.request().method() === "POST"),
      page.getByRole("button", { name: "Generar" }).first().click(),
    ]);
    expect(generateResponse.ok()).toBeTruthy();

    const [downloadResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/download") && res.request().method() === "GET"),
      page.getByRole("button", { name: "Descargar" }).first().click(),
    ]);
    expect(downloadResponse.ok()).toBeTruthy();

    await page.getByRole("button", { name: /Cerrar Sesión/i }).first().click();
    await page.waitForURL("**/login");
  });

  test("alternativas y beneficios: agregar, guardar (autosave) y eliminar", async ({ page }) => {
    await login(page, USER_A);
    await createProposalUpToEdit(page, `Cliente E2E Items ${RUN_ID}`, `Propuesta E2E Items ${RUN_ID}`);

    const editUrl = page.url();

    // Volvemos al paso 4 (Alternativas): 8 → Anterior x4 → 4.
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Anterior" }).click();
    }
    await expect(page.getByRole("button", { name: "Agregar alternativa" })).toBeVisible();

    await page.getByRole("button", { name: "Agregar alternativa" }).click();
    const altItem = page.getByTestId("alternative-item").first();
    await altItem.getByLabel("Título", { exact: false }).fill("Plan Vida Integral");
    await altItem.getByLabel("Compañía", { exact: false }).fill("Aseguradora Test");
    await altItem.getByLabel("Producto", { exact: false }).fill("Vida Integral Plus");

    // Autosave con debounce de 2s.
    await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 10_000 });

    await altItem.getByRole("button", { name: "Eliminar alternativa" }).click();
    await expect(page.getByTestId("alternative-item")).toHaveCount(0);

    // Paso 6: Beneficios (Anterior x2 desde Alternativas: Recomendación, Beneficios).
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Recomendación
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Beneficios
    await expect(page.getByRole("button", { name: "Agregar beneficio" })).toBeVisible();

    await page.getByRole("button", { name: "Agregar beneficio" }).click();
    const benefitItem = page.getByTestId("benefit-item").first();
    await benefitItem.getByLabel("Título", { exact: false }).fill("Cobertura inmediata");
    await benefitItem.getByLabel("Descripción", { exact: false }).fill("Vigencia desde la primera cuota.");
    await benefitItem.getByLabel("Ícono", { exact: false }).fill("shield-check");

    await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 10_000 });

    await benefitItem.getByRole("button", { name: "Eliminar beneficio" }).click();
    await expect(page.getByTestId("benefit-item")).toHaveCount(0);

    // Recargar la página: lo persistido en DB debe reflejar la eliminación (no quedaron huérfanos).
    await page.goto(editUrl);
    await expect(page.getByTestId("alternative-item")).toHaveCount(0);
  });

  test("dos usuarios ven datos aislados (RLS end-to-end)", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const clientName = `Cliente E2E RLS ${RUN_ID}`;

    await login(pageA, USER_A);
    await login(pageB, USER_B);

    await pageA.goto("/proposals/new");
    await pageA.getByRole("button", { name: "Crear cliente nuevo" }).click();
    await pageA.getByLabel("Nombre").fill(clientName);
    await pageA.getByLabel("Email", { exact: true }).fill("cliente.e2e.rls@cliente.test");
    await pageA.getByRole("button", { name: "Crear y seleccionar" }).click();

    await pageA.goto("/clients");
    await pageB.goto("/clients");

    await expect(pageA.getByText(clientName).first()).toBeVisible();
    await expect(pageB.getByText(clientName)).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("conflicto de concurrencia optimista: dos pestañas editando el mismo paso", async ({ browser }) => {
    const context = await browser.newContext();
    const pageA1 = await context.newPage();
    await login(pageA1, USER_A);

    await createProposalUpToEdit(pageA1, `Cliente E2E Concurrencia ${RUN_ID}`, `Propuesta E2E Concurrencia ${RUN_ID}`);
    const editUrl = pageA1.url();

    // Segunda pestaña sobre la MISMA propuesta.
    const pageA2 = await context.newPage();
    await pageA2.goto(editUrl);

    // Ambas pestañas retroceden hasta "Información" (paso 2, único Anterior click desde Resumen->...
    // en realidad Resumen es paso 8, retrocedemos 6 veces hasta Información).
    for (const p of [pageA1, pageA2]) {
      for (let i = 0; i < 6; i++) {
        await p.getByRole("button", { name: "Anterior" }).click();
      }
    }
    await expect(pageA1.getByLabel("Título", { exact: false }).first()).toBeVisible();
    await expect(pageA2.getByLabel("Título", { exact: false }).first()).toBeVisible();

    await pageA1.getByLabel("Título", { exact: false }).first().fill("Editado desde pestaña 1");
    await pageA1.waitForTimeout(2500); // debounce de autosave

    await pageA2.getByLabel("Título", { exact: false }).first().fill("Editado desde pestaña 2");
    await pageA2.waitForTimeout(2500);

    // Alguna de las dos pestañas debe mostrar el estado de conflicto (revision desactualizada):
    // el guardado optimista nunca debe pisar en silencio la edición de la otra pestaña.
    const hasConflictA1 = await pageA1.getByText(/otra sesión|cambios recientes/i).isVisible().catch(() => false);
    const hasConflictA2 = await pageA2.getByText(/otra sesión|cambios recientes/i).isVisible().catch(() => false);
    expect(hasConflictA1 || hasConflictA2).toBeTruthy();

    await context.close();
  });
});
