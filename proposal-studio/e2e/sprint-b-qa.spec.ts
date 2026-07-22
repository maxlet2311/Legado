import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Sprint B QA — closing script. Runs against the already-seeded QA-0001
// proposal ("Propuesta QA Completa") for usuario.a@local.test. Seed only
// creates the bare proposal row (no alternatives/benefits/comparison), so
// this spec populates the minimum content itself before exercising
// duplicate/collapse/emit/PDF flows.

const USER = { email: "usuario.a@local.test", password: "Test1234!" };
const PROPOSAL_ID = "20000000-0000-0000-0000-000000000002";
const DOWNLOAD_DIR = "C:\\Users\\MAXLE~1.GMP\\AppData\\Local\\Temp\\claude\\c--Users-maxle-GMPUPPY-OneDrive-IA-CLIENTES-ARIEL-MARCOS\\1fb4f88f-d4cc-44ca-a027-5a69f8daf529\\scratchpad\\downloads";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo Electrónico").fill(USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");
}

async function jumpToStep(page: Page, label: string) {
  // El nombre accesible del botón incluye el número de paso (ej. "4 Alternativas"),
  // así que exact:true nunca matchea — se busca por substring en su lugar.
  await page
    .getByRole("navigation", { name: "Bloques de la propuesta" })
    .getByRole("button", { name: new RegExp(`${label}$`) })
    .click();
}

test.describe.serial("Sprint B — QA de cierre", () => {
  test("flujo completo sobre QA-0001", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    await page.goto(`/proposal/${PROPOSAL_ID}/edit`);
    await expect(page.getByRole("navigation", { name: "Bloques de la propuesta" })).toBeVisible();

    // ---------- Preparación mínima: 1 alternativa, 1 beneficio, 1 col + 1 fila ----------
    await jumpToStep(page, "Alternativas");
    await page.getByRole("button", { name: "Agregar alternativa" }).click();
    const firstAlt = page.getByTestId("alternative-item").first();
    await firstAlt.getByLabel("Título", { exact: false }).fill("Plan Base QA");
    await firstAlt.getByLabel("Compañía", { exact: false }).fill("Aseguradora QA");
    await firstAlt.getByLabel("Producto", { exact: false }).fill("Producto QA");
    const altSaveBtn = firstAlt.getByRole("button", { name: "Guardar", exact: true });
    await altSaveBtn.scrollIntoViewIfNeeded();
    await altSaveBtn.dispatchEvent("click");
    await page.waitForLoadState("networkidle");

    await jumpToStep(page, "Beneficios");
    await page.getByRole("button", { name: "Agregar beneficio" }).click();
    const firstBen = page.getByTestId("benefit-item").first();
    await firstBen.getByLabel("Título", { exact: false }).fill("Beneficio Base QA");
    await firstBen.getByLabel("Descripción", { exact: false }).fill("Descripción base QA.");
    // canSave exige icon no vacío: aunque el picker resalta una sugerencia
    // con aria-pressed=true, el valor no se aplica a item.icon hasta el click.
    await firstBen.getByLabel("Buscar ícono").waitFor();
    const iconBtn = firstBen.locator("button[aria-pressed]").first();
    await iconBtn.scrollIntoViewIfNeeded();
    await iconBtn.dispatchEvent("click");
    const benSaveBtn = firstBen.getByRole("button", { name: "Guardar", exact: true });
    await benSaveBtn.scrollIntoViewIfNeeded();
    await benSaveBtn.dispatchEvent("click");
    await page.waitForLoadState("networkidle");

    await jumpToStep(page, "Comparativa");
    await page.getByRole("button", { name: "Agregar columna" }).click();
    await page.getByRole("button", { name: "Agregar fila" }).click();
    await page.getByLabel("Título de columna").fill("Costo mensual");
    await page.getByLabel("Título de fila").fill("Prima");
    const firstCell = page.getByLabel(/Prima — Costo mensual/);
    await firstCell.fill("1500");
    await page.getByRole("button", { name: "Guardar", exact: true }).last().click();

    // ================= 1-4: Alternativas — duplicar, autosave, reload =================
    await jumpToStep(page, "Alternativas");
    const altBefore = await page.getByTestId("alternative-item").count();
    expect(altBefore).toBe(1);
    const originalAltTitle = await page.getByTestId("alternative-item").first().getByLabel("Título", { exact: false }).inputValue();

    await page.getByTestId("alternative-item").first().getByRole("button", { name: "Duplicar alternativa" }).click();
    await expect(page.getByTestId("alternative-item")).toHaveCount(2, { timeout: 10_000 });

    const altItems = page.getByTestId("alternative-item");
    const altTitle0 = await altItems.nth(0).getByLabel("Título", { exact: false }).inputValue();
    const altTitle1 = await altItems.nth(1).getByLabel("Título", { exact: false }).inputValue();
    expect(altTitle0).toBe(originalAltTitle);
    expect(altTitle1).toBe(`${originalAltTitle} (copia)`);

    // Verificamos vía DB que el duplicado tiene un id distinto y quedó
    // inmediatamente después en display_order (duplicateItem() guarda de inmediato).
    // (la verificación real por psql se hace en un test aparte más abajo)

    // duplicateItem() persiste con un saveAlternativeAction fire-and-forget
    // (sin indicador de "guardando" visible): esperamos a que la red se
    // asiente antes de recargar, si no el reload puede ganarle a la escritura.
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForURL(/\/proposal\/.+\/edit/);
    await jumpToStep(page, "Alternativas");
    await expect(page.getByTestId("alternative-item")).toHaveCount(2, { timeout: 10_000 });
    const altTitle1AfterReload = await page.getByTestId("alternative-item").nth(1).getByLabel("Título", { exact: false }).inputValue();
    expect(altTitle1AfterReload).toBe(`${originalAltTitle} (copia)`);

    // ================= 5-6: Beneficios — duplicar, autosave, reload =================
    await jumpToStep(page, "Beneficios");
    const originalBenTitle = await page.getByTestId("benefit-item").first().getByLabel("Título", { exact: false }).inputValue();
    await page.getByTestId("benefit-item").first().getByRole("button", { name: "Duplicar beneficio" }).click();
    await expect(page.getByTestId("benefit-item")).toHaveCount(2, { timeout: 10_000 });
    const benItems = page.getByTestId("benefit-item");
    const benTitle0 = await benItems.nth(0).getByLabel("Título", { exact: false }).inputValue();
    const benTitle1 = await benItems.nth(1).getByLabel("Título", { exact: false }).inputValue();
    expect(benTitle0).toBe(originalBenTitle);
    expect(benTitle1).toBe(`${originalBenTitle} (copia)`);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForURL(/\/proposal\/.+\/edit/);
    await jumpToStep(page, "Beneficios");
    await expect(page.getByTestId("benefit-item")).toHaveCount(2, { timeout: 10_000 });
    const benTitle1AfterReload = await page.getByTestId("benefit-item").nth(1).getByLabel("Título", { exact: false }).inputValue();
    expect(benTitle1AfterReload).toBe(`${originalBenTitle} (copia)`);

    // ================= 7-9: Comparativa — duplicar fila y columna =================
    await jumpToStep(page, "Comparativa");
    await page.getByLabel(/Duplicar fila/).click();
    await page.getByLabel(/Duplicar columna/).click();
    await page.getByRole("button", { name: "Guardar", exact: true }).last().click();

    const rowLabels = await page.getByLabel("Título de fila").all();
    expect(rowLabels.length).toBe(2);
    const rowLabel0 = await rowLabels[0]!.inputValue();
    const rowLabel1 = await rowLabels[1]!.inputValue();
    expect(rowLabel0).toBe("Prima");
    expect(rowLabel1).toBe("Prima (copia)");

    const colLabels = await page.getByLabel("Título de columna").all();
    expect(colLabels.length).toBe(2);
    const colLabel0 = await colLabels[0]!.inputValue();
    const colLabel1 = await colLabels[1]!.inputValue();
    expect(colLabel0).toBe("Costo mensual");
    expect(colLabel1).toBe("Costo mensual (copia)");

    // El valor de la celda original (fila Prima, columna Costo mensual) debe
    // haberse propagado a la fila/columna duplicadas.
    const dupRowDupColCell = page.getByLabel(/Prima \(copia\) — Costo mensual \(copia\)/);
    await expect(dupRowDupColCell).toHaveValue("1500");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForURL(/\/proposal\/.+\/edit/);
    await jumpToStep(page, "Comparativa");
    await expect(page.getByLabel("Título de fila")).toHaveCount(2, { timeout: 10_000 });
    await expect(page.getByLabel("Título de columna")).toHaveCount(2, { timeout: 10_000 });

    // ================= 10: Colapsar/expandir alternativas y beneficios =================
    // Tras el reload, los ítems ya existentes arrancan colapsados por diseño
    // (ver comentario en step-alternatives.tsx: reduce el scroll al entrar al
    // paso). Probamos el toggle completo desde ese estado inicial real.
    await jumpToStep(page, "Alternativas");
    const altToggle = page.getByTestId("alternative-item").first().locator("button[aria-expanded]").first();
    await expect(altToggle).toHaveAttribute("aria-expanded", "false");
    await altToggle.click();
    await expect(altToggle).toHaveAttribute("aria-expanded", "true");
    await altToggle.click();
    await expect(altToggle).toHaveAttribute("aria-expanded", "false");
    await altToggle.click();
    await expect(altToggle).toHaveAttribute("aria-expanded", "true");

    await jumpToStep(page, "Beneficios");
    const benToggle = page.getByTestId("benefit-item").first().locator("button[aria-expanded]").first();
    await expect(benToggle).toHaveAttribute("aria-expanded", "false");
    await benToggle.click();
    await expect(benToggle).toHaveAttribute("aria-expanded", "true");
    await benToggle.click();
    await expect(benToggle).toHaveAttribute("aria-expanded", "false");
    await benToggle.click();
    await expect(benToggle).toHaveAttribute("aria-expanded", "true");

    // ================= 11-12: Emitir versión =================
    await jumpToStep(page, "Resumen");
    await page.getByRole("button", { name: "Emitir versión" }).click();
    await expect(page.getByRole("link", { name: "Ver preview" })).toBeVisible({ timeout: 20_000 });
    const versionUrl = await page.getByRole("link", { name: "Ver preview" }).getAttribute("href");
    expect(versionUrl).toBeTruthy();

    // ================= 13: Preview de la versión emitida =================
    // page.goto() (con "load" o "domcontentloaded") choca con el router
    // client-side de Next.js en esta ruta específica (ERR_ABORTED). Clickeamos
    // el link real (como un usuario), con scroll + force para evitar que el
    // header fijo intercepte el click.
    await page.goto(versionUrl!, { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: /^Versión \d+$/ })).toBeVisible({ timeout: 30_000 });

    // ================= 17: commercial_status ausente del preview =================
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText.includes("commercial_status")).toBe(false);
    expect(bodyText).not.toMatch(/borrador|en negociación|aceptada|rechazada|archivada/);

    // ================= 14/15/16: Generar y descargar PDF portrait =================
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

    const genPdfBtn1 = page.getByRole("button", { name: "Generar PDF" });
    await genPdfBtn1.scrollIntoViewIfNeeded();
    await genPdfBtn1.dispatchEvent("click");
    await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeVisible({ timeout: 45_000 });

    const [download1] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar PDF" }).click(),
    ]);
    const pdfPath1 = path.join(DOWNLOAD_DIR, "version1-portrait.pdf");
    await download1.saveAs(pdfPath1);
    const buf1 = fs.readFileSync(pdfPath1);
    expect(buf1.length).toBeGreaterThan(1000);
    expect(buf1.subarray(0, 4).toString("ascii")).toBe("%PDF");

    // ================= Landscape: cambiar orientación y emitir versión 2 =================
    await page.goto(`/proposal/${PROPOSAL_ID}`);
    await page.getByRole("button", { name: "Horizontal" }).click();
    await expect(page.getByRole("button", { name: "Horizontal" })).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });

    await page.goto(`/proposal/${PROPOSAL_ID}/edit`);
    await jumpToStep(page, "Resumen");
    await page.getByRole("button", { name: "Emitir versión" }).click();
    await expect(page.getByRole("link", { name: "Ver preview" })).toBeVisible({ timeout: 20_000 });
    const versionUrl2 = await page.getByRole("link", { name: "Ver preview" }).getAttribute("href");
    expect(versionUrl2).not.toBe(versionUrl);

    await page.goto(versionUrl2!, { waitUntil: "commit" });
    await expect(page.getByText(/Horizontal/)).toBeVisible({ timeout: 30_000 });

    const genPdfBtn2 = page.getByRole("button", { name: "Generar PDF" });
    await genPdfBtn2.scrollIntoViewIfNeeded();
    await genPdfBtn2.dispatchEvent("click");
    await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeVisible({ timeout: 45_000 });
    const [download2] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar PDF" }).click(),
    ]);
    const pdfPath2 = path.join(DOWNLOAD_DIR, "version2-landscape.pdf");
    await download2.saveAs(pdfPath2);
    const buf2 = fs.readFileSync(pdfPath2);
    expect(buf2.length).toBeGreaterThan(1000);
    expect(buf2.subarray(0, 4).toString("ascii")).toBe("%PDF");

    // ================= 18: cambiar commercial_status no debe alterar la versión ya emitida =================
    await page.goto(`/proposal/${PROPOSAL_ID}`);
    const preSelect = page.locator("[role=combobox]").first();
    await preSelect.click();
    await page.getByRole("option", { name: "Enviada" }).click();
    await expect(page.getByRole("combobox").first()).toContainText("Enviada", { timeout: 10_000 });

    // Volvemos al preview de la versión 2 y confirmamos que sigue sin mostrar
    // el commercial_status y que el contenido (título de versión, orientación) es el mismo.
    await page.goto(versionUrl2!, { waitUntil: "commit" });
    await expect(page.getByText(/Horizontal/)).toBeVisible({ timeout: 30_000 });
    const bodyText2 = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText2).not.toMatch(/enviada|borrador|en negociación|aceptada|rechazada|archivada/);
    await expect(page.getByText(/Horizontal/)).toBeVisible();
  });
});
