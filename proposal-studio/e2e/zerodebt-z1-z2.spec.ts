import { test, expect, type Page } from "@playwright/test";

// LEGADO — cierre sin deuda funcional (Z1 + Z2). Corrida aislada, un solo
// worker, un solo browser: nada de esto debe correr en paralelo con otra
// suite contra el mismo dev server (contención invalida los tiempos de
// debounce que estos tests dependen para ser deterministas).

const USER_A = { email: "h0-e2e-user-a@proposalstudio.test", password: "H0-e2e-TestPass-A1!" };
const RUN_ID = Date.now();

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo Electrónico").fill(USER_A.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(USER_A.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");
}

async function createDraft(page: Page, clientName: string) {
  await page.goto("/proposals/new");
  await page.getByRole("button", { name: "Crear cliente nuevo" }).click();
  await page.getByLabel("Nombre").fill(clientName);
  await page.getByLabel("Email", { exact: true }).fill(`${clientName.toLowerCase().replace(/\s+/g, ".")}@cliente.test`);
  await page.getByRole("button", { name: "Crear y seleccionar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/proposal\/.+\/edit/);
  const proposalId = page.url().match(/\/proposal\/([^/]+)\/edit/)?.[1];
  if (!proposalId) throw new Error("No se pudo extraer proposalId de la URL");
  return proposalId;
}

test.describe("Z1 — protección de cambios sin guardar", () => {
  test("el indicador muestra 'Cambios sin guardar' inmediatamente al tipear, antes del debounce", async ({ page }) => {
    await login(page);
    await createDraft(page, `Cliente ZeroDebt Z1a ${RUN_ID}`);
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Información

    await page.getByLabel("Título", { exact: false }).first().fill(`Z1 pending ${RUN_ID}`);
    await page.getByLabel("Producto", { exact: false }).first().fill("Vida Integral Plus");
    // Sin esperar nada: el debounce es de 2s, así que el status debe pasar a
    // "pending" (no "saving", no "idle") en el instante posterior al tipeo.
    await expect(page.getByText("Cambios sin guardar")).toBeVisible({ timeout: 500 });

    // Y una vez guardado, el indicador debe volver a "Guardado" (no queda
    // pegado en "pending").
    await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 10_000 });
  });

  test("sin cambios pendientes, no aparece ningún indicador (Caso D)", async ({ page }) => {
    await login(page);
    await createDraft(page, `Cliente ZeroDebt Z1d ${RUN_ID}`);
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Información
    // No se edita nada. El indicador de autosave no debe mostrar texto.
    await expect(page.getByText("Cambios sin guardar")).not.toBeVisible();
    await expect(page.getByText("Guardando")).not.toBeVisible();
  });

  test("editar Diagnóstico y navegar rápido por el outline sin esperar no pierde la edición (Caso C)", async ({ page }) => {
    await login(page);
    const proposalId = await createDraft(page, `Cliente ZeroDebt Z1c ${RUN_ID}`);
    const editUrl = page.url();

    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Información
    await page.getByLabel("Título", { exact: false }).first().fill(`Z1c título ${RUN_ID}`);
    await page.getByLabel("Producto", { exact: false }).first().fill("Vida Integral Plus");
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Diagnóstico

    const uniqueText = `Z1c situación única ${RUN_ID}`;
    await page.getByLabel("Situación actual", { exact: false }).fill(uniqueText);

    // Navegación en ráfaga, SIN esperar el debounce (~2s) en ningún punto:
    // exactamente el patrón que perdía la edición en la corrida adversarial.
    // Acotado a la navegación del outline (no al botón "Siguiente" genérico):
    // sin este scope, la regex matchea también texto de la vista previa en
    // vivo que se muestra al lado del formulario.
    // Por posición (0=Cliente...7=Resumen), no por texto: los clicks en ráfaga
    // sin espera entre ellos hacían que el matching por regex resolviera
    // contra snapshots inconsistentes del outline mientras React re-renderiza
    // entre click y click (confirmado con navegación fuera de orden en los
    // logs del server -- step=6 antes que step=5). La posición es estable.
    const outline = page.getByRole("navigation", { name: "Bloques de la propuesta" });
    const outlineButtons = outline.getByRole("button");
    await outlineButtons.nth(3).click(); // Alternativas
    await outlineButtons.nth(4).click(); // Beneficios
    await outlineButtons.nth(5).click(); // Comparativa
    await outlineButtons.nth(6).click(); // Recomendación
    await outlineButtons.nth(7).click(); // Resumen

    // El flush de saveNow es fire-and-forget (POST real, no esperado por el
    // click) -- un reload inmediato ABORTA cualquier request todavía en vuelo
    // del documento anterior, igual que documenta full-flow.spec.ts para el
    // mismo patrón con alternativas/beneficios. Ese margen es de la mecánica
    // de red del test, no algo que Z1 deba (ni pueda) garantizar: Z1 exige
    // que el flush se DISPARE con el valor correcto al navegar, no que una
    // recarga forzada en el mismo instante espere una respuesta en vuelo.
    await page.waitForTimeout(5_000);

    // Reload desde el servidor: si la edición no persistió de verdad, se
    // pierde acá (la vuelta al store en memoria del cliente no cuenta).
    await page.goto(editUrl);
    await page.getByRole("navigation", { name: "Bloques de la propuesta" }).getByRole("button", { name: /Diagnóstico/ }).click();
    await expect(page.getByLabel("Situación actual", { exact: false })).toHaveValue(uniqueText, { timeout: 15_000 });

    console.log(`Z1C_PROPOSAL_ID=${proposalId}`);
  });
});

test.describe("Z2 — persistencia de title/product aislada (sin contención)", () => {
  for (const run of [1, 2, 3]) {
    test(`corrida aislada ${run}/3: título y producto persisten en DB`, async ({ page }) => {
      await login(page);
      const proposalId = await createDraft(page, `Cliente ZeroDebt Z2-${run} ${RUN_ID}`);
      const editUrl = page.url();

      await page.getByRole("button", { name: "Siguiente" }).click(); // -> Información
      const expectedTitle = `Z2 corrida ${run} título ${RUN_ID}`;
      const expectedProduct = `Z2 corrida ${run} producto ${RUN_ID}`;
      await page.getByLabel("Título", { exact: false }).first().fill(expectedTitle);
      await page.getByLabel("Producto", { exact: false }).first().fill(expectedProduct);

      await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 15_000 });

      await page.goto(editUrl);
      await page.getByRole("navigation", { name: "Bloques de la propuesta" }).getByRole("button", { name: /Información/ }).click();
      await expect(page.getByLabel("Título", { exact: false }).first()).toHaveValue(expectedTitle, { timeout: 15_000 });
      await expect(page.getByLabel("Producto", { exact: false }).first()).toHaveValue(expectedProduct, {
        timeout: 15_000,
      });

      console.log(
        `Z2_RUN_${run}_PROPOSAL_ID=${proposalId} EXPECTED_TITLE="${expectedTitle}" EXPECTED_PRODUCT="${expectedProduct}"`,
      );
    });
  }
});
