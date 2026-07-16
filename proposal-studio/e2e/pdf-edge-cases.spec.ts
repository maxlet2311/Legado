import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const USER_A = { email: "h0-e2e-user-a@proposalstudio.test", password: "H0-e2e-TestPass-A1!" };

const CASES = [
  { title: "Propuesta PDF Edge — Texto largo", filename: "edge-texto-largo-portrait.pdf" },
  { title: "Propuesta PDF Edge — 100 beneficios 50 alternativas", filename: "edge-100-beneficios-landscape.pdf" },
];

test("generar PDFs de casos límite para inspección visual", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/login");
  await page.getByLabel("Correo Electrónico").fill(USER_A.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(USER_A.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");

  const outDir = path.join(process.cwd(), "e2e", "pdf-output");
  fs.mkdirSync(outDir, { recursive: true });

  for (const { title, filename } of CASES) {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: title }).click();
    await page.waitForURL(/\/proposal\/.+/);

    // Si no estamos en el wizard (ya finalizada), entramos a /edit explícitamente.
    if (!page.url().includes("/edit")) {
      await page.goto(page.url() + "/edit");
    }

    // Avanzar hasta Resumen (paso 8) sin importar en qué paso estemos.
    for (let i = 0; i < 8; i++) {
      const next = page.getByRole("button", { name: /Siguiente|Ir a la propuesta/ });
      if (await next.isVisible().catch(() => false)) {
        if (!(await next.isEnabled())) break;
        await next.click();
      } else {
        break;
      }
    }

    const emitButton = page.getByRole("button", { name: "Emitir versión" });
    if (await emitButton.isVisible().catch(() => false)) {
      await emitButton.click();
      await expect(page.getByRole("link", { name: "Ver preview" })).toBeVisible({ timeout: 30_000 });
    }

    await page.goto(page.url().replace("/edit", ""));
    await expect(page.getByText("Versión 1")).toBeVisible();

    const generateBtn = page.getByRole("button", { name: "Generar" }).first();
    if (await generateBtn.isVisible().catch(() => false)) {
      const [genResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes("/pdf") && res.request().method() === "POST", {
          timeout: 60_000,
        }),
        generateBtn.click(),
      ]);
      expect(genResponse.ok()).toBeTruthy();
    }

    const downloadBtn = page.getByRole("button", { name: "Descargar" }).first();
    const [downloadResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/download") && res.request().method() === "GET"),
      downloadBtn.click(),
    ]);
    const body = await downloadResponse.json();
    expect(body.url).toBeTruthy();

    const pdfResponse = await page.request.get(body.url);
    expect(pdfResponse.ok()).toBeTruthy();
    const buffer = await pdfResponse.body();
    fs.writeFileSync(path.join(outDir, filename), buffer);
    console.log(`Guardado: ${filename} (${buffer.byteLength} bytes)`);
  }
});
