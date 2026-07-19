# RC1 — Certificación final para producción

Fecha: 2026-07-18
Rol de esta auditoría: Lead Engineer independiente. Objetivo explícito: intentar demostrar que el proyecto **no** está listo para producción, no confirmar que lo está. Todo lo que sigue está basado en evidencia verificada en esta sesión (lectura de código, queries contra el proyecto Supabase real `btgopvaztnttahyjejav`, ejecución real de `tsc`/`lint`/`test`/`build`, y un sub-agente de exploración dedicado exclusivamente a buscar bypasses de autorización). No se agregó funcionalidad, no se refactorizó, no se hizo commit/push/deploy. Se corrigieron 2 documentos con información desactualizada (ver Hallazgos §7) por ser estrictamente parte de "verificar coherencia de documentación".

## Resumen ejecutivo

El **código** de Proposal Studio está en buen estado: TypeScript limpio, lint limpio, 116/116 tests unitarios, build de producción exitoso, y una revisión adversarial de los 19 route handlers y 10 archivos de Server Actions no encontró ningún bypass de autorización, IDOR, ni escalación de privilegios explotable. El esquema de base de datos quedó completamente versionado en la Etapa 8 (schema drift cerrado).

Sin embargo, **el proyecto como producto comercial no está operativamente listo**. La brecha no está en el código sino en la puesta en marcha real: cero planes de membresía configurados, el flujo de pago de Mercado Pago nunca se validó de punta a punta (sin credenciales de sandbox disponibles), el envío real de emails de Resend nunca se confirmó, la asociación del Auth Hook de Google OAuth no está verificada (si falta, un alta por Google evita el control de membresía), el modo de enforcement de membresías sigue en `audit` (no bloquea), y la reconstrucción completa del esquema (`supabase db reset`) no pudo verificarse empíricamente por falta de Docker. Ninguno de estos puntos es un bug de código: son pasos operativos pendientes, ya documentados honestamente por el propio equipo en `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` desde antes de esta auditoría, y confirmados aquí como todavía no resueltos.

## Evidencia

| Fuente | Resultado |
|---|---|
| `git status` | Working tree con 17 archivos modificados + ~25 sin seguimiento (trabajo de Etapas 6-8 sin commitear). Sin archivos sospechosos, sin binarios grandes, sin `.env*` trackeados. |
| Búsqueda de secretos (`sk_live`, `AKIA`, private keys, passwords hardcodeados) en `src/` | 0 resultados. |
| Búsqueda de `TODO:`/`FIXME:`/`HACK:` reales (marcador de comentario, no la palabra "todo" en español) | 0 resultados. |
| `.env.example` vs `.env.local` (solo nombres de variable, nunca valores — bloqueado explícitamente por el sandbox de este agente para lectura de contenido) | Local tiene 8/17 variables documentadas cargadas (Supabase, Mercado Pago access token/webhook secret, Resend key). Faltan localmente: `PUBLIC_APP_URL`, `SANDBOX_CHECKOUT_ENABLED`, `MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS`, `MERCADO_PAGO_DETERMINISTIC_CHECKOUT`, `MEMBERSHIP_GRACE_PERIOD_DAYS`, `MEMBERSHIP_ENFORCEMENT_MODE`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_ENABLED`. **No se puede confirmar el estado de las variables en el entorno de producción de Vercel desde este entorno** (CLI de Vercel no instalada/autenticada). |
| Sub-agente de seguridad (19 route handlers + 10 archivos de Server Actions + guards + RLS de `proposal_versions`) | Sin bypass de autorización, IDOR ni escalación de privilegios encontrado. 2 hallazgos menores de robustez (ver Hallazgos §3). |
| `pg_policies`, `pg_proc`, `pg_constraint`, `pg_indexes`, `pg_event_trigger` contra el proyecto remoto | Confirmado 1:1 contra las migraciones locales (incluidas las 6 nuevas de la Etapa 8). |
| `npx tsc --noEmit` | ✅ Sin errores. |
| `npm run lint` | ✅ Sin errores ni warnings. |
| `npm test` | ✅ 116/116. |
| `npm run build` | ✅ Compila, genera todas las rutas. |
| `supabase db reset` | ❌ No ejecutable — `docker --version` → `command not found`. Confirmado nuevamente en esta sesión (no cambió desde la Etapa 8). |
| `npm audit --omit=dev` | 2 advisories moderadas, ambas la misma causa raíz: `postcss < 8.5.10` (XSS en el *stringifier* de PostCSS) arrastrada transitivamente por la propia copia interna de `next`. Riesgo real bajo: es una vulnerabilidad de build-time sobre el stringifier de CSS, no de manejo de input de usuario en runtime. |
| `npm outdated` | Todas las dependencias del proyecto están en versiones actuales de su rama mayor salvo actualizaciones mayores voluntarias no aplicadas (Next 16, React 19.2, Zod 4, ESLint 10, etc.) — ninguna es un fix de seguridad crítico pendiente. |

## Hallazgos

### 1. Auth Hook de Google OAuth sin confirmar (potencial bypass de membresía)

La función `before_user_created_check_membership` (`SECURITY DEFINER`) existe y está confirmada en el esquema remoto, pero su **asociación como Auth Hook activo** en el dashboard de Supabase no es verificable desde este entorno (sin API de administración disponible). Si no está asociado, un alta vía Google OAuth se completa sin pasar por el control de membresía que sí aplica al alta por invitación/activación por email — un bypass funcional del modelo de negocio, no solo un gap cosmético. Ya documentado en `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` §6; confirmado aquí como **todavía sin resolver**.

### 2. Flujo de pago (Mercado Pago) nunca ejecutado de punta a punta

El código de reconciliación, validación de firma de webhook (`isValidMercadoPagoSignature`, cubierta por 8 unit tests) y transición de estado están completos y revisados, pero **nunca se ejecutó el procedimiento de sandbox real** (`docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md`, sección final) — no hay credenciales de prueba en este entorno. Cero planes de membresía existen hoy en el proyecto (`membership_plans` vacía, confirmable por el propio checklist). Aceptar pagos reales sin haber corrido ni una vez el circuito completo (`init_point` → pago de prueba → webhook → activación → cancelación → idempotencia de duplicados) es un riesgo real de negocio, no solo de código.

### 3. Hallazgos menores de robustez (Server Actions) — no explotables, sí inconsistentes

`archiveProposalAction`, `createDraftFromClientAction`, `deleteAlternativeAction` y `deleteBenefitAction` reciben strings crudos (sin `zod`/validación de formato UUID) antes de pasarlos a sus RPCs correspondientes. La autorización real la sigue aplicando el RPC (scoping por `auth.uid()`, error "no encontrado/sin acceso" ante un id ajeno), así que **no es una vulnerabilidad** — es una inconsistencia con el resto del código, que sí valida formato antes de usar el dato. P2.

### 4. Rate limiting en memoria no es seguro en serverless multi-instancia

`checkRateLimit` (`src/lib/utils/rate-limit.ts`) usa un `Map` en memoria de proceso — ya documentado como deuda técnica desde la Etapa 2 ("NO ofrece protección real en despliegues serverless multi-instancia"). Protege endpoints públicos de alto riesgo de abuso (`checkout`, `request-activation`, webhook) con una barrera que se resetea por instancia. Bajo tráfico real en Vercel (múltiples instancias concurrentes) el límite efectivo es mucho más alto que el nominal. P1 para los endpoints públicos sin autenticación; P2 para los endpoints admin (ya protegidos por `requirePlatformOwner`).

### 5. Navegación mobile rota (confirmado en navegador real, Etapa 6)

El `Sidebar`/`AppShell` compartido (no exclusivo de `/admin`) no tiene drawer/hamburger: a 390px de ancho el contenido queda comprimido e ilegible. Confirmado con QA real en Chromium/Playwright, no solo lectura de código. Afecta cualquier ruta autenticada en mobile, no solo admin. P1 — requiere decisión de diseño, no un fix de una línea.

### 6. Reproducibilidad de esquema sin verificación empírica

La Etapa 8 cerró el inventario de drift (0 diferencias conocidas entre migraciones y remoto), pero `supabase db reset` **nunca se ejecutó** por falta de Docker Desktop en este entorno — confirmado de nuevo en esta sesión, sin cambios respecto a la Etapa 8. La certeza de que el repo reconstruye el esquema exacto sigue siendo por análisis objeto-por-objeto, no por ejecución real.

### 7. Documentación desactualizada (corregida en esta auditoría)

`docs/PROPOSAL_FLOW_STATUS.md` y `docs/PROPOSAL_FLOW_AUDIT.md` seguían describiendo el drift de `create_draft_proposal`/`update_proposal_meta`/`archive_proposal` como un riesgo **sin resolver**, contradiciendo a `docs/PROJECT_STATUS.md` y `docs/SCHEMA_DRIFT_REPORT.md` (Etapa 8), que ya lo dan por cerrado. Corregido en ambos archivos con una referencia cruzada a la Etapa 8 — esto es una corrección de coherencia documental (Paso 7 de esta auditoría), no un refactor de producto.

### 8. Suite E2E de Playwright nunca ejecutada

`e2e/admin-memberships.spec.ts` existe pero requiere un servidor corriendo y usuarios de prueba reales que no existen en este entorno — documentado como pendiente desde antes de esta auditoría (`MEMBERSHIP_PRODUCTION_CHECKLIST.md` §10) y confirmado aquí como **todavía sin ejecutar**. La validación de guards de Platform Owner sí se corrió una vez vía un script ad hoc (`e2e/platform-owner-guards.mjs`, 26/26 OK, Etapa 6) — no es lo mismo que la suite Playwright real.

## Matriz de riesgo

### P0 — Bloquea producción

| # | Riesgo | Por qué bloquea |
|---|---|---|
| 1 | Auth Hook de Google OAuth sin confirmar | Bypass funcional del control de membresía en un alta por Google (Hallazgo 1) |
| 2 | Flujo de Mercado Pago nunca validado de punta a punta, sin credenciales de sandbox en este entorno | Cobrar dinero real sin haber probado el circuito de pago ni una vez (Hallazgo 2) |
| 3 | Cero planes de membresía configurados en `membership_plans` | No hay nada que un usuario pueda comprar hoy |
| 4 | `MEMBERSHIP_ENFORCEMENT_MODE` en `audit`, no `enforce` | El paywall real no bloquea nada mientras siga así — es el diseño de rollout, pero "producción" en sentido estricto requiere el corte a `enforce` tras completar el checklist |

### P1 — Puede salir, pero debería corregirse antes

| # | Riesgo |
|---|---|
| 1 | Envío real de email (Resend) nunca confirmado — dominio sin verificar, `EMAIL_ENABLED` default `false` |
| 2 | Rate limiting en memoria, no seguro en serverless multi-instancia, para endpoints públicos (`checkout`, `request-activation`, webhook) |
| 3 | Navegación mobile rota en todas las rutas autenticadas (confirmado en navegador real) |
| 4 | Suite E2E de Playwright nunca ejecutada contra un servidor real |
| 5 | Historial de migraciones remoto con timestamps distintos a los locales — riesgo de conflicto en un futuro `supabase db push`/`migration repair` |
| 6 | No se pudo confirmar qué variables de entorno están realmente cargadas en el proyecto de Vercel de producción (fuera del alcance de este entorno) |

### P2 — Puede corregirse después del release

| # | Riesgo |
|---|---|
| 1 | Validación de formato faltante (sin zod/UUID) en 4 Server Actions, mitigado por ownership del lado del RPC (Hallazgo 3) |
| 2 | Advisory moderada de `postcss` transitiva vía `next`, riesgo real bajo (build-time, no input de usuario) |
| 3 | Desfasaje de versión mayor entre `puppeteer` (dev, 23.11.1) y `puppeteer-core` (prod, 25.3.0) — el renderer de PDF probado localmente no es exactamente el mismo que corre en Vercel |
| 4 | Botón "Reintentar" para eventos de webhook individuales — decisión de negocio pendiente, no gap técnico |
| 5 | Campos "Resumen ejecutivo"/"mensaje final" del wizard sin UI de captura (columnas y render ya existen) |
| 6 | `supabase/config.toml` inexistente — bloquea `supabase start`/`db reset` local para nuevos desarrolladores |

### P3 — Mejoras futuras

| # | Riesgo |
|---|---|
| 1 | `/library` con datos 100% hardcodeados, sin conexión real a `proposal_templates`/`library_items` |
| 2 | Error de validación de "comparativa" no se muestra inline por celda |
| 3 | Paquetes extraños (`@emnapi/*`, `@napi-rs/wasm-runtime`) marcados "extraneous" por `npm ls` — binarios opcionales de plataforma, sin impacto funcional |
| 4 | Varias dependencias con actualizaciones mayores disponibles sin urgencia de seguridad (Next 16, Zod 4, ESLint 10, React 19.2, etc.) |

## Checklist de release

| Ítem | Estado | Justificación |
|---|---|---|
| Build reproducible | ⚠️ Parcial | `tsc`/lint/test/build reproducibles y verdes; `supabase db reset` no verificado (sin Docker) |
| Migraciones completas | ⚠️ Parcial | Drift cerrado (Etapa 8, 0 diferencias conocidas) pero sin ejecución real en base limpia; historial remoto desalineado (P1 #5) |
| RLS validada | ✅ Sí | Policies, initplan optimization, immutable versions e IDOR revisados sin hallazgos |
| Tests exitosos | ✅ Sí | 116/116 |
| Lint limpio | ✅ Sí | `eslint .` sin errores ni warnings |
| TypeScript limpio | ✅ Sí | `tsc --noEmit` sin errores |
| Variables documentadas | ⚠️ Parcial | `.env.example` completo y clasificado; estado real en Vercel producción no verificable desde este entorno |
| Documentación consistente | ✅ Sí | Corregidas las 2 contradicciones encontradas (Hallazgo 7) |
| PDF funcional | ✅ Sí | Motor dual revisado (puppeteer/puppeteer-core+sparticuz), consumido de verdad por branding/versiones |
| Wizard funcional | ✅ Sí | 7 pasos completos, autosave con conflictos, gaps de contenido documentados (P2) no bloquean |
| Panel administrativo funcional | ✅ Sí | 13/13 pantallas completas, QA en navegador real ya ejecutado, salvo mobile (P1) |
| Membresías funcionales | ⚠️ Parcial | Código y RLS completos; 0 planes configurados y enforcement en `audit` (P0 #3-4) |
| Mercado Pago listo | ❌ No | Nunca validado de punta a punta, sin credenciales de sandbox (P0 #2) |
| Resend listo | ⚠️ Parcial | Código completo; envío real y dominio verificado sin confirmar (P1 #1) |
| Storage listo | ✅ Sí | Buckets, policies e índices verificados 1:1 contra remoto |
| Branding correcto | ✅ Sí | Auditado en Etapa 7, consumido de verdad en el PDF |
| Assets correctos | ✅ Sí | Mismo veredicto que branding |
| Auditoría correcta | ✅ Sí | `admin_audit_events`, RLS deny-by-default, cobertura confirmada |
| Logs aceptables | ⚠️ Parcial | `logServerError` usado consistentemente; retención/PII en logs de Vercel producción no auditada en esta sesión |
| Sin secretos expuestos | ✅ Sí | Sin secretos hardcodeados en código; `.env*.local` gitignored; panel de settings solo expone presencia, nunca valores |

## Pendientes

Ver P0-P1 en la matriz de riesgo — son, en orden de bloqueo real: confirmar Auth Hook de Google, validar Mercado Pago en sandbox, crear planes comerciales reales, decidir el corte a `MEMBERSHIP_ENFORCEMENT_MODE=enforce`, confirmar entrega real de Resend, resolver navegación mobile, ejecutar la suite E2E, y reemplazar el rate limiter en memoria por un store compartido antes de exponer los endpoints públicos a tráfico real a escala.

## Recomendación

El código está listo. El producto, no. Ningún hallazgo de esta auditoría es un bug de código bloqueante — es enteramente falta de validación operativa de las integraciones externas (pagos, email, OAuth) y de configuración comercial (planes). Desplegar a un entorno de staging/producción con `MEMBERSHIP_ENFORCEMENT_MODE=audit` (tal como está hoy, sin bloquear acceso real) es seguro y es precisamente el propósito de ese modo. Desplegar como producción comercial real, cobrando y bloqueando acceso, no lo es todavía.

### Conclusión

```text
APROBADO PARA STAGING
NO APROBADO PARA PRODUCCIÓN
```
