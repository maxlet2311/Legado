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

  // Step 3: Diagnóstico. Espera confirmación de guardado antes de navegar:
  // `finalize_proposal` (RPC) valida server-side que la narrativa esté
  // realmente persistida, no solo tipeada -- sin esta espera, un click rápido
  // en "Siguiente" puede adelantarse al guardado real (ver causa raíz del
  // fallo de "Finalizar propuesta" en la auditoría de cierre).
  await page.getByLabel("Situación actual", { exact: false }).fill("Cliente sin cobertura de vida ni ahorro formal.");
  await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 25_000 });
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 4: Alternativas (paso opcional — isValid siempre true; el CRUD de
  // alternativas/beneficios se prueba aparte en el test dedicado).
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 5: Beneficios (paso opcional — isValid siempre true).
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 6: Comparativa -> Siguiente (sin datos, es opcional)
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 7: Recomendación
  await page.getByLabel("Recomendación", { exact: false }).fill("Recomendamos el Plan Vida Integral por su cobertura y flexibilidad.");
  await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 25_000 });
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 8: Resumen
  await expect(page.getByText(title)).toBeVisible();
}

test.describe("Flujo completo — Proposal Studio", () => {
  test("login, crear propuesta, wizard completo, emitir versión, PDF, historial, logout", async ({ page }) => {
    // Timeout de test más alto que el resto: es el único flujo que además
    // genera un PDF real (Puppeteer) -- medido en logs del dev server, esa
    // sola llamada tomó ~17s en frío (compilación de la ruta + render real),
    // sobre un flujo que ya de por sí recorre las 8 pantallas del wizard con
    // guardado real en cada una. No es para tapar un bug: generación de PDF
    // y descarga completaron con 200 en los logs del servidor, el timeout
    // por defecto de la suite (90s) simplemente no le alcanza a este test en
    // particular.
    test.setTimeout(180_000);
    await login(page, USER_A);

    await createProposalUpToEdit(page, `Cliente E2E Flujo ${RUN_ID}`, `Propuesta E2E Flujo Completo ${RUN_ID}`);

    // `finalize_proposal` (RPC, ver supabase/migrations/20260721010000_harden_proposals_state_writes.sql)
    // exige al menos una alternativa además de la narrativa -- causa raíz real
    // del fallo original de este test: `createProposalUpToEdit` nunca agrega
    // ninguna (a propósito, ese CRUD se prueba aparte), así que sin esto
    // "Finalizar propuesta" rechaza la propuesta con un error legítimo de
    // negocio ("La propuesta necesita al menos una alternativa").
    await page.getByRole("button", { name: /Alternativas/ }).click();
    await page.getByRole("button", { name: "Agregar alternativa" }).click();
    const altItem = page.getByTestId("alternative-item").first();
    await altItem.getByLabel("Título", { exact: false }).fill("Plan Vida Integral");
    await altItem.getByLabel("Compañía", { exact: false }).fill("Aseguradora Test");
    await altItem.getByLabel("Producto", { exact: false }).fill("Vida Integral Plus");
    await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 25_000 });
    await page.getByRole("button", { name: /Resumen/ }).click();

    // "Emitir versión" tiene que ir antes de "Finalizar propuesta": finalizar
    // navega de inmediato a /proposal/[id] al tener éxito (`router.push` en
    // handleFinalize, step-summary.tsx), y "Emitir versión" solo existe en el
    // paso Resumen del wizard -- una vez que se sale de /edit ya no es alcanzable.
    const editUrl = page.url();
    await page.getByRole("button", { name: "Emitir versión" }).click();
    await expect(page.getByRole("link", { name: "Ver preview" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Finalizar propuesta" }).click();
    await page
      .waitForURL((url) => !url.pathname.endsWith("/edit"), { timeout: 30_000 })
      .catch(async () => {
        // Si finalizar mostró un error en vez de navegar, que el test lo diga
        // explícitamente en vez de un timeout genérico de waitForURL.
        const maybeError = await page
          .locator("text=/No pudimos finalizar|Error/")
          .first()
          .textContent()
          .catch(() => null);
        throw new Error(
          `"Finalizar propuesta" no navegó fuera de /edit. Texto de error visible: ${maybeError ?? "(ninguno encontrado)"}`,
        );
      });

    await page.goto(editUrl.replace("/edit", ""));
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

  test("alternativas y beneficios: agregar, guardar (manual) y eliminar", async ({ page }) => {
    await login(page, USER_A);
    await createProposalUpToEdit(page, `Cliente E2E Items ${RUN_ID}`, `Propuesta E2E Items ${RUN_ID}`);

    const editUrl = page.url();

    // Saltamos directo a Alternativas por el outline (no gateado por
    // isValid, a diferencia de "Siguiente"/"Anterior" -- ver WizardFooter).
    await page.getByRole("button", { name: /Alternativas/ }).click();
    await expect(page.getByRole("button", { name: "Agregar alternativa" })).toBeVisible();

    await page.getByRole("button", { name: "Agregar alternativa" }).click();
    const altItem = page.getByTestId("alternative-item").first();
    await altItem.getByLabel("Título", { exact: false }).fill("Plan Vida Integral");
    await altItem.getByLabel("Compañía", { exact: false }).fill("Aseguradora Test");
    await altItem.getByLabel("Producto", { exact: false }).fill("Vida Integral Plus");

    // Guardado explícito con el botón "Guardar" (también autoguardan por
    // debounce tras ~2s de pausa; el click fuerza el guardado inmediato).
    await altItem.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 25_000 });

    // "Eliminar alternativa" solo abre el ConfirmDialog (ver
    // step-alternatives.tsx, confirmLabel="Eliminar"); hace falta un segundo
    // click en el botón de confirmación del diálogo para que se borre de
    // verdad -- sin este segundo click el conteo nunca baja a 0.
    await altItem.getByRole("button", { name: "Eliminar alternativa" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByTestId("alternative-item")).toHaveCount(0, { timeout: 25_000 });

    // Paso 5: Beneficios (Siguiente x1 desde Alternativas).
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Beneficios
    await expect(page.getByRole("button", { name: "Agregar beneficio" })).toBeVisible();

    await page.getByRole("button", { name: "Agregar beneficio" }).click();
    const benefitItem = page.getByTestId("benefit-item").first();
    await benefitItem.getByLabel("Título", { exact: false }).fill("Cobertura inmediata");
    await benefitItem.getByLabel("Descripción", { exact: false }).fill("Vigencia desde la primera cuota.");
    // "Ícono" no es un campo de texto libre: IconPicker (icon-picker.tsx) es
    // un buscador (`aria-label="Buscar ícono"`) + grilla de botones donde
    // cada ícono tiene su propio `aria-label={name}` -- hay que buscar Y
    // clickear el resultado. `getByLabel("Ícono", {exact:false})` matcheaba
    // por substring contra "Buscar ícono" y solo tipeaba en el buscador sin
    // seleccionar nada, dejando `item.icon` vacío y "Guardar" deshabilitado
    // para siempre (causa raíz real de que este test nunca llegara a probar
    // el conteo tras eliminar beneficios).
    await benefitItem.getByLabel("Buscar ícono").fill("shield");
    await benefitItem.getByRole("button", { name: "shield", exact: true }).click();

    await benefitItem.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 25_000 });

    // Mismo ConfirmDialog que en alternativas: hace falta confirmar.
    await benefitItem.getByRole("button", { name: "Eliminar beneficio" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByTestId("benefit-item")).toHaveCount(0, { timeout: 25_000 });

    // Recargar la página: lo persistido en DB debe reflejar la eliminación (no quedaron huérfanos).
    await page.goto(editUrl);
    await expect(page.getByTestId("alternative-item")).toHaveCount(0, { timeout: 25_000 });
  });

  // Regresión del bug P0 encontrado en la auditoría Wizard -> Preview: editar
  // un campo de una alternativa/beneficio y navegar de paso (Siguiente/
  // Anterior/salto) SIN apretar el botón "Guardar" de esa tarjeta perdía la
  // edición en silencio, porque StepAlternatives/StepBenefits nunca
  // registraban el `saveNow` de cada ítem en `stepMeta` (a diferencia de
  // Información/Narrativa/Comparación, que sí lo hacían). El fix agrega un
  // registro de `saveNow` por ítem que se flushea al navegar.
  test("editar una alternativa y un beneficio y navegar sin apretar Guardar no pierde los cambios", async ({ page }) => {
    await login(page, USER_A);
    await createProposalUpToEdit(page, `Cliente E2E NoLoss ${RUN_ID}`, `Propuesta E2E NoLoss ${RUN_ID}`);

    const editUrl = page.url();

    // Saltamos directo a Alternativas por el outline (no gateado por
    // isValid, a diferencia de "Siguiente"/"Anterior" -- ver WizardFooter).
    await page.getByRole("button", { name: /Alternativas/ }).click();
    await page.getByRole("button", { name: "Agregar alternativa" }).click();
    const altItem = page.getByTestId("alternative-item").first();
    await altItem.getByLabel("Título", { exact: false }).fill("Alternativa Sin Guardar Manual");
    await altItem.getByLabel("Compañía", { exact: false }).fill("Aseguradora Flush");
    await altItem.getByLabel("Producto", { exact: false }).fill("Producto Flush");
    // Deliberadamente NO se hace click en el botón "Guardar" del ítem.

    // Avanza a Beneficios (Siguiente) sin guardar la alternativa a mano.
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByRole("button", { name: "Agregar beneficio" })).toBeVisible();

    await page.getByRole("button", { name: "Agregar beneficio" }).click();
    const benefitItem = page.getByTestId("benefit-item").first();
    await benefitItem.getByLabel("Título", { exact: false }).fill("Beneficio Sin Guardar Manual");
    await benefitItem.getByLabel("Descripción", { exact: false }).fill("Persiste sin click en Guardar.");
    // "Ícono" no es un campo de texto libre: IconPicker (icon-picker.tsx) es
    // un buscador (`aria-label="Buscar ícono"`) + grilla de botones donde
    // cada ícono tiene su propio `aria-label={name}` -- hay que buscar Y
    // clickear el resultado. `getByLabel("Ícono", {exact:false})` matcheaba
    // por substring contra "Buscar ícono" y solo tipeaba en el buscador sin
    // seleccionar nada, dejando `item.icon` vacío y "Guardar" deshabilitado
    // para siempre (causa raíz real de que este test nunca llegara a probar
    // el conteo tras eliminar beneficios).
    await benefitItem.getByLabel("Buscar ícono").fill("shield");
    await benefitItem.getByRole("button", { name: "shield", exact: true }).click();
    // Tampoco acá se hace click en "Guardar": se navega directo.

    await page.getByRole("button", { name: /Alternativas/ }).click(); // -> vuelve a Alternativas

    // La edición de la alternativa debe seguir ahí (flush al salir del paso).
    await expect(altItem.getByLabel("Título", { exact: false })).toHaveValue("Alternativa Sin Guardar Manual");

    // Causa raíz real encontrada al diagnosticar este test (no era timing
    // aleatorio): el flush es fire-and-forget -- dispara el POST y sigue,
    // sin esperar la respuesta (ver use-autosave.ts: "El guardado sigue en
    // curso aunque el componente se desmonte... lo único que sí lo pierde es
    // cerrar/recargar la pestaña mientras la respuesta está en vuelo"). Una
    // recarga inmediata (page.goto) ABORTA cualquier request todavía en
    // vuelo del documento anterior -- con logs de red se confirmó que el
    // flush de la alternativa (disparado ~1.4s antes) directamente no había
    // llegado a completarse cuando el test recargaba. El AutosaveIndicator
    // de cada ítem tampoco sirve como señal de espera acá: se desmonta junto
    // con el ítem al cambiar de paso, antes de que su propio guardado
    // confirme. La espera fija de abajo iguala el margen que ya demostró
    // alcanzar en un diagnóstico aislado (~1.5-3s por request observados
    // durante toda esta auditoría contra Supabase real).
    await page.waitForTimeout(5_000);

    // Recargar desde el servidor (reinicia `currentStep` a 0, ver `hydrate()`
    // en wizard-store.ts, pero re-hidrata `data` desde la base): si el flush
    // no persistió de verdad (solo quedó en memoria), el outline vuelve a
    // saltar directo a Alternativas/Beneficios y esto lo expone.
    await page.goto(editUrl);
    await page.getByRole("button", { name: /Alternativas/ }).click();
    await expect(page.getByTestId("alternative-item").first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("alternative-item").first().getByLabel("Título", { exact: false })).toHaveValue(
      "Alternativa Sin Guardar Manual",
    );

    await page.getByRole("button", { name: /Beneficios/ }).click();
    await expect(page.getByTestId("benefit-item").first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("benefit-item").first().getByLabel("Título", { exact: false })).toHaveValue(
      "Beneficio Sin Guardar Manual",
    );
  });

  // Regresión de la arquitectura híbrida preview/autosave: la vista previa
  // debe reflejar una edición sin que el asesor navegue de paso ni la guarde
  // a mano -- el debounce de autosave (~2s de pausa) más el refresh
  // inmediato de la preview al confirmarse el guardado alcanzan solos.
  test("la vista previa se actualiza sola tras una pausa al tipear, sin navegar ni guardar a mano", async ({ page }) => {
    await login(page, USER_A);
    await page.goto("/proposals/new");
    await page.getByRole("button", { name: "Crear cliente nuevo" }).click();
    const clientName = `Cliente E2E Preview ${RUN_ID}`;
    await page.getByLabel("Nombre").fill(clientName);
    await page.getByLabel("Email", { exact: true }).fill(`${clientName.toLowerCase().replace(/\s+/g, ".")}@cliente.test`);
    await page.getByRole("button", { name: "Crear y seleccionar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForURL(/\/proposal\/.+\/edit/);
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Información
    await page.getByLabel("Título", { exact: false }).first().fill("Propuesta Preview Vivo " + RUN_ID);
    // "Producto" también es requerido por proposalDetailsSchema: sin esto el
    // autoguardado devuelve "El producto es obligatorio." y nunca llega a "Guardado".
    await page.getByLabel("Producto", { exact: false }).first().fill("Vida Integral Plus");
    await page.getByRole("button", { name: "Siguiente" }).click(); // -> Diagnóstico

    // El título de la propuesta solo aparece en la portada, y la preview en
    // vivo usa variant="content" (sin portada, ver render-document.tsx) --
    // por diseño, no por bug. "Situación actual" sí es contenido del cuerpo,
    // así que es el campo correcto para probar la sincronización en vivo.
    const uniqueText = `Situación única de diagnóstico ${RUN_ID}`;
    await page.getByLabel("Situación actual", { exact: false }).fill(uniqueText);

    // Ni click en "Guardar" ni cambio de paso: solo la pausa del debounce
    // (~2s) debe disparar el guardado. Se separa en dos aserciones para que
    // una falla diga con precisión si lo que no ocurrió fue el guardado o el
    // refresh de la preview.
    await expect(page.getByText("Guardado").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".ps-preview-scale")).toContainText(uniqueText, { timeout: 10_000 });
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

    // Ambas pestañas saltan a "Información" por el outline. Nota: pageA1 sigue
    // en Resumen (paso 8, sin recargar) y pageA2 recién cargó vía goto()
    // (arranca en Cliente, paso 0 -- ver `hydrate()` en wizard-store.ts), así
    // que "Anterior" x6 no funciona igual para ambas; el salto por outline sí.
    for (const p of [pageA1, pageA2]) {
      await p.getByRole("button", { name: "Información" }).click();
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
