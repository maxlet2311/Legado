import { test, expect } from "@playwright/test";

const USER = { email: "h0-e2e-user-a@proposalstudio.test", password: "H0-e2e-TestPass-A1!" };

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`dashboard pilot visual — ${viewport.name}`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/login");
    await page.getByLabel(/Correo Electr/).fill(USER.email);
    await page.getByLabel(/Contrase/).fill(USER.password);
    await page.getByRole("button", { name: /Iniciar sesi/ }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: /Buen d/ })).toBeVisible();
    await expect(page.getByText("Actividad reciente")).toBeVisible();
    await page.screenshot({ path: `.qa-visual-cert/dashboard-pilot-${viewport.name}.png`, fullPage: true });

    const metrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      cardsOutsideViewport: Array.from(document.querySelectorAll("main *")).filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
      }).length,
      minTapTargets: Array.from(document.querySelectorAll("main a, main button")).map((node) => {
        const rect = node.getBoundingClientRect();
        return { text: node.textContent?.trim().slice(0, 40), width: Math.round(rect.width), height: Math.round(rect.height) };
      }),
    }));
    console.log(`DOM_METRICS_${viewport.name.toUpperCase()}=${JSON.stringify(metrics)}`);
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.cardsOutsideViewport).toBe(0);
    expect(metrics.minTapTargets.every((target) => target.height >= 24)).toBe(true);
    expect(runtimeErrors).toEqual([]);
  });
}
