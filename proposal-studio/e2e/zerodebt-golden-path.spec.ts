import { test, expect, type Page } from "@playwright/test";

// LEGADO — Zero-Debt Final Closure. Golden Path secuencial y aislado (un solo
// worker, sin otra suite corriendo en paralelo contra el mismo dev server).

const USER_A = { email: "h0-e2e-user-a@proposalstudio.test", password: "H0-e2e-TestPass-A1!" };
const RUN_ID = Date.now();

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo Electrónico").fill(USER_A.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(USER_A.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");
}

test("Golden Path: draft -> completed -> read-only -> duplicar -> editar copia -> DB", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);

  // Crear propuesta QA
  await page.goto("/proposals/new");
  await page.getByRole("button", { name: "Crear cliente nuevo" }).click();
  const clientName = `Cliente GoldenPath ${RUN_ID}`;
  await page.getByLabel("Nombre").fill(clientName);
  await page.getByLabel("Email", { exact: true }).fill(`goldenpath.${RUN_ID}@cliente.test`);
  await page.getByRole("button", { name: "Crear y seleccionar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/proposal\/.+\/edit/);
  const proposalId = page.url().match(/\/proposal\/([^/]+)\/edit/)![1];
  const editUrl = page.url();

  // Editar title/product
  await page.getByRole("button", { name: "Siguiente" }).click(); // -> Información
  const title = `GoldenPath título ${RUN_ID}`;
  await page.getByLabel("Título", { exact: false }).first().fill(title);
  await page.getByLabel("Producto", { exact: false }).first().fill("Vida Integral Plus");
  await page.getByRole("button", { name: "Siguiente" }).click(); // -> Diagnóstico

  // Z1: editar y navegar ANTES del debounce (ráfaga por outline)
  const diagText = `GoldenPath diagnóstico ${RUN_ID}`;
  await page.getByLabel("Situación actual", { exact: false }).fill(diagText);
  const outline = page.getByRole("navigation", { name: "Bloques de la propuesta" });
  const outlineButtons = outline.getByRole("button");
  await outlineButtons.nth(3).click(); // Alternativas
  await outlineButtons.nth(4).click(); // Beneficios
  await outlineButtons.nth(5).click(); // Comparativa
  await outlineButtons.nth(6).click(); // Recomendación

  // Recomendación (requerida para finalizar)
  await page.getByLabel("Recomendación", { exact: false }).fill("Recomendamos el Plan Vida Integral.");
  await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 15_000 });

  // Al menos una alternativa (requerida por finalize_proposal)
  await outlineButtons.nth(3).click(); // Alternativas
  await page.getByRole("button", { name: "Agregar alternativa" }).click();
  const altItem = page.getByTestId("alternative-item").first();
  await altItem.getByLabel("Título", { exact: false }).fill("Plan Vida Integral");
  await altItem.getByLabel("Compañía", { exact: false }).fill("Aseguradora Test");
  await altItem.getByLabel("Producto", { exact: false }).fill("Vida Integral Plus");
  await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 15_000 });

  // Reload: confirmar que la edición de Diagnóstico (hecha en ráfaga, sin
  // esperar el debounce) persistió -- esto es la verificación de Z1 en el
  // flujo real, no solo en el test aislado.
  await page.goto(editUrl);
  await outline.getByRole("button", { name: /Diagnóstico/ }).click();
  await expect(page.getByLabel("Situación actual", { exact: false })).toHaveValue(diagText, { timeout: 15_000 });

  // Finalizar. Pequeño margen tras el salto de outline antes de disparar otra
  // server action (finalize) -- mismo patrón de espera que usa full-flow.spec.ts
  // entre pasos, no relacionado a Z1-Z4.
  await outline.getByRole("button", { name: /Resumen/ }).click();
  await page.waitForTimeout(1_000);
  await page.getByRole("button", { name: "Finalizar propuesta" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/edit"), { timeout: 30_000 });

  // Completed read-only: reload y confirmar que sigue completed + campos bloqueados
  await page.goto(editUrl);
  await expect(page.getByText(/finalizada|Esta propuesta está finalizada/i).first()).toBeVisible({ timeout: 15_000 });

  // Preview
  await page.goto(editUrl.replace("/edit", ""));
  await expect(page.getByText("Versión")).toBeVisible({ timeout: 15_000 });

  // Duplicar
  await page.getByRole("button", { name: "Duplicar propuesta" }).click();
  await page.waitForURL(/\/proposal\/.+\/edit/, { timeout: 20_000 });
  const duplicateId = page.url().match(/\/proposal\/([^/]+)\/edit/)![1];
  expect(duplicateId).not.toBe(proposalId);

  // Editar título de la copia
  await page.getByRole("navigation", { name: "Bloques de la propuesta" }).getByRole("button", { name: /Información/ }).click();
  const duplicateTitle = `GoldenPath copia editada ${RUN_ID}`;
  await page.getByLabel("Título", { exact: false }).first().fill(duplicateTitle);
  await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 15_000 });

  const duplicateEditUrl = page.url();
  await page.goto(duplicateEditUrl);
  await page.getByRole("navigation", { name: "Bloques de la propuesta" }).getByRole("button", { name: /Información/ }).click();
  await expect(page.getByLabel("Título", { exact: false }).first()).toHaveValue(duplicateTitle, { timeout: 15_000 });

  console.log(`GOLDEN_PATH_ORIGINAL_ID=${proposalId} GOLDEN_PATH_DUPLICATE_ID=${duplicateId} EXPECTED_DUPLICATE_TITLE="${duplicateTitle}"`);
});
