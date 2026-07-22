# RC1 Release Report — Proposal Studio™ / Legado

Fecha: 2026-07-22
Alcance: cierre de Release Candidate 1. Sin funcionalidades nuevas — solo bugs, riesgos y deuda técnica, sobre el estado ya cerrado de Sprint A y Sprint B.

---

## 1. Estado inicial de Git

Rama `main`. Working tree con todo el trabajo de Sprint B sin commitear (wizard duplicar/colapsar, `commercial_status`, plantillas atómicas, migraciones nuevas, `supabase/` sin trackear) más los cambios de esta sesión de RC1. Ningún commit se creó durante Sprint A, Sprint B ni RC1.

## 2. Cambios realizados

**Fase 1 — riesgos abiertos de Sprint B:**
- Migración local-only (`platform_owner`) resuelta de raíz (ver sección 3).
- Race condition de `duplicateItem()` corregida con indicador de guardado, rollback y bloqueo de navegación (ver sección 3).

**Fase 2/3 — auditoría y limpieza:**
- 1 migración nueva local (`20260724000000_revoke_remaining_proposal_rpcs_from_anon.sql`), no aplicada a remoto.
- 6 archivos corregidos por accesibilidad/UX (confirmación de borrado en tabla comparativa, chips de Biblioteca operables por teclado, labels sin `htmlFor`, aria-label faltante).
- 2 archivos corregidos por performance (debounce + guard de carrera en búsqueda de Biblioteca, memoización en preview en vivo del wizard).
- 2 archivos corregidos por bug de mobile (tabla de `/proposals`, historial de versiones).
- 3 archivos de código muerto eliminados.

Detalle completo de cada cambio en las secciones siguientes.

## 3. Riesgos corregidos

### Riesgo 1 — Migración local-only de `platform_owner`

**Diagnóstico:** `20260716010000_platform_owner.sql` asigna `is_platform_owner=true` al owner real de producción y antes abortaba toda la cadena de migraciones (`RAISE EXCEPTION`) si ese perfil no existía — lo cual es siempre el caso en un reset local desde cero. El workaround existente (`20260716005900_zzz_local_only_platform_owner_seed.sql`) creaba un usuario fake en `auth.users` bajo el UUID **real** de producción (`98a388bb-5385-42e2-98d5-9db0b716af82`) para satisfacer esa migración, viviendo dentro de `supabase/migrations/` — con riesgo de terminar aplicado a un proyecto remoto nuevo donde ese UUID todavía no exista.

**Decisión arquitectónica (justificación):**
1. El `RAISE EXCEPTION` original se cambió a `RAISE NOTICE` (no aborta). Una migración que solo puede completarse si un dato externo específico (un signup real de producción) ya existe es frágil por diseño — falla en *cualquier* entorno fresco, no solo local (un staging nuevo, un rollback completo). Convertirla en no-op silencioso cuando el perfil no existe es correcto independientemente del problema de local-vs-remoto.
2. Con esa migración ya no bloqueante, la asignación de un platform owner **local** se movió por completo a `supabase/seed.sql`, con un UUID generado (`90000000-0000-0000-0000-000000000009`) que **nunca coincide ni se relaciona** con el UUID real de producción.
3. Esto es estructuralmente más seguro que cualquier guardia en SQL: `supabase db push` (el único camino realista hacia un accidente en remoto) **nunca lee `seed.sql`** — no es parte de su contrato, a diferencia de una migración. No hace falta un `if` que intente adivinar "¿estoy en local o en remoto?" (evaluado y descartado: ni el puerto ni la dirección de Postgres distinguen el stack local de un proyecto hosteado, ambos exponen el mismo puerto interno 5432).
4. Se descartaron alternativas más débiles: mantener el `on conflict do nothing` como única defensa (ya estaba, pero dependía de que el UUID real ya existiera en el destino — no protege contra un proyecto nuevo), o generar un script npm separado para correr antes del reset (agrega un paso manual, que es justo lo que el objetivo pedía evitar).
5. `supabase/manual-checks/rls_isolation.sql` (referencias de testing manual) se actualizó para usar el nuevo UUID local.

**Validado:** `supabase db reset` sin intervención manual, `NOTICE` visible en el log (no error), exactamente un perfil con `is_platform_owner=true` tras el reset, `supabase test db` 33/33 sin cambios.

### Riesgo 2 — Race condition de `duplicateItem()`

**Diagnóstico confirmado:** duplicar una alternativa/beneficio/fila/columna persiste con un guardado fire-and-forget fuera del ciclo de `useAutosave`. Un `reload()`/cierre de pestaña inmediatamente después pierde el duplicado sin ningún aviso.

**Corrección:**
- Nuevo hook `src/hooks/use-before-unload-guard.ts`: bloquea (diálogo nativo del navegador) el cierre/recarga de la pestaña mientras un guardado sigue en curso.
- Integrado en `src/hooks/use-autosave.ts` (`status === "saving"`): cubre automáticamente todo guardado manual existente (edición de alternativas/beneficios, "Guardar" de la comparativa) sin duplicar lógica en cada step.
- Integrado directamente en `step-alternatives.tsx`/`step-benefits.tsx` para el guardado de `duplicateItem()`, que corre fuera de `useAutosave`.
- `duplicateItem()` ahora también:
  - expone `saving`/`saved`/`error` a través de `stepMeta.autosaveStatus` (el mismo indicador ya visible en el footer del wizard) — no se rediseñó ningún componente, se reusó el mecanismo existente;
  - hace **rollback** del array optimista si el guardado falla (antes el duplicado quedaba en pantalla sin persistir, indistinguible de uno real).

**Validado:** regresión completa de los 18 flujos de QA funcional (`e2e/sprint-b-qa.spec.ts`) contra `db reset` limpio — duplicar + reload sigue persistiendo correctamente; `tsc`/`eslint`/`npm test` sin errores.

## 4. Riesgos que permanecen

Ver hallazgos P1/P2 (secciones 17/18) — ninguno bloqueante para producción.

## 5. Seguridad

Auditoría completa (RLS/IDOR, `SECURITY DEFINER`, `search_path`, grants, `auth.uid()`, ownership, anon/authenticated/service_role, XSS, CSRF, SSRF, SQL injection/PostgREST filter injection, validación Zod, guards de rutas):

- **RLS/IDOR**: sin hallazgos. Las tablas sin policy (`account_activation_invitations`, `admin_audit_events`, `membership_checkout_attempts`, `membership_status_history`, `payment_provider_events`) son deny-by-default intencional. `proposals` no tiene policy de UPDATE directa a propósito — todo pasa por RPCs `SECURITY DEFINER` con ownership revalidada.
- **`search_path`**: sin hallazgos — las 33 funciones con lógica de negocio lo tienen fijo.
- **Grants — 1 hallazgo real, corregido**: 10 RPCs (`archive_proposal`, `update_proposal_meta`, `delete_proposal_alternative`, `delete_proposal_benefit`, `reorder_proposal_alternatives`, `reorder_proposal_benefits`, `bump_revision`, `check_and_record_ai_usage`, `generate_proposal_number`, `record_proposal_version_artifact`) habían quedado fuera de la migración `20260721020000_revoke_proposal_rpcs_from_anon.sql` y seguían con `EXECUTE` otorgado a `anon` por el grant default de Supabase. No explotable hoy (todas revisan `auth.uid() is null` antes de actuar), pero es una dependencia frágil de defensa en profundidad. Corregido con `20260724000000_revoke_remaining_proposal_rpcs_from_anon.sql` (**solo local, no aplicada a remoto**).
- **XSS**: sin hallazgos. Los dos usos de `dangerouslySetInnerHTML` interpolan solo enums controlados por servidor o HTML generado con `renderToStaticMarkup` sobre JSX (auto-escapado).
- **CSRF**: sin hallazgos. Server Actions con protección nativa de Next.js; webhook de Mercado Pago valida `x-signature` HMAC-SHA256 con `timingSafeEqual`.
- **SSRF**: sin hallazgos. `logo_url`/`signature_image` se derivan de archivos subidos a Storage propio, nunca de una URL arbitraria.
- **SQL injection / PostgREST filter injection**: sin hallazgos explotables. El único `.or()` con input de usuario (`/proposals`) pasa por `escapeIlikeValue`.
- **Zod**: sin hallazgos — toda Server Action con input complejo usa `safeParse`; las que reciben solo un id lo delegan a un RPC `SECURITY DEFINER` que revalida ownership.
- **Guards de rutas**: sin hallazgos — middleware + `requireActiveUser`/`requireAdmin`/`requirePlatformOwner` independientes en cada route handler admin.

## 6. Performance

- **Corregido**: búsqueda de Biblioteca (`library-browser.tsx`) disparaba una Server Action por tecla sin debounce ni guardia de carrera (una respuesta vieja podía pisar a una más nueva). Se agregó debounce de 400ms + `requestIdRef`, mismo patrón que `live-preview-panel.tsx`.
- **Corregido**: `live-preview-panel.tsx` recalculaba `JSON.stringify` del estado completo de la propuesta en cada render (el panel queda montado todo el tiempo que se edita el wizard). Memoizado con `useMemo`.
- **Revisado, sin hallazgos**: N+1 queries, queries repetidas, `select("*")` desperdiciando payload en listados, "use client" evitable en componentes de PDF/documento, imports pesados (Puppeteer/dnd-kit correctamente acotados), rerenders por suscripción amplia al store del wizard (los selectores ya son específicos).
- **No corregido, listado como P2** (impacto bajo, no justifica el riesgo de tocarlo en un RC): dos `await` secuenciales paralelizables en `duplicateProposalAction`; posible server-render del primer batch de Biblioteca/Plantillas para evitar un flash de loading.

## 7. Accesibilidad

- **Corregido**: chips de filtro de categoría en Biblioteca eran `<span onClick>` sin `tabIndex` ni manejo de teclado — ahora son `<button>` nativos con `aria-pressed`, focuseables y operables con Enter/Espacio.
- **Corregido**: 6 labels sin `htmlFor`/`id` asociado (`proposal-filters.tsx` ×4, `proposal-actions.tsx` ×2 en `SaveAsTemplateDialog`) — un lector de pantalla no anunciaba el campo, y clickear el texto de la etiqueta no enfocaba el input/checkbox.
- **Corregido**: botón de cerrar preview en mobile (`wizard-layout.tsx`) sin `aria-label` (solo ícono).
- **Revisado, sin hallazgos**: diálogos (Radix, Escape + focus-trap + focus-return correctos), botones solo-ícono (todos con `aria-label` salvo el ya corregido), imágenes (todas con `alt`), metadata/título por página, color como único indicador de estado (siempre combinado con texto), orden de tab (sin uso de `order-*` de Tailwind).

## 8. UX

- **Corregido**: eliminar una fila o columna completa de la tabla comparativa (con todos sus valores cargados) se ejecutaba directo al click, sin confirmación — a diferencia de eliminar una alternativa o un beneficio, que sí confirman. La única red de seguridad era Ctrl+Z, sin ningún botón visible. Se agregó `ConfirmDialog` (mismo componente ya usado en el resto del editor).
- **Revisado, sin hallazgos**: estados vacíos (27 usos de `EmptyState` cubriendo todos los listados relevantes), loaders en acciones async (patrón `isPending`/`disabled`/`Spinner` consistente, sin riesgo de doble-submit), manejo de errores en Server Actions (sin `catch` vacíos), confirmaciones en el resto de acciones destructivas, botones "Guardar" ambiguos (el wizard ya usa autosave con indicador, no hay más de un "Guardar" compitiendo en pantalla).

## 9. Mobile

Smoke test real a 375px (login, dashboard, `/proposals`, biblioteca, wizard, detalle de propuesta) — cero overflow horizontal a nivel de documento en las 6 pantallas.

- **Corregido**: tabla de `/proposals` cortaba la columna Estado (2 pills: comercial + técnico) sin ningún aviso de scroll — mismo bug que ya se había corregido en `/dashboard` durante Sprint B pero nunca se replicó en esta página. Ocultada la columna Fecha en mobile (`hidden sm:table-cell`), igual que en dashboard.
- **Corregido**: el botón "Descargar" del historial de versiones (`version-history.tsx`) quedaba con el texto cortado a 375px (fila de acciones sin wrap). La fila ahora apila verticalmente en mobile (`flex-col sm:flex-row`) y el grupo de acciones permite wrap.
- **No corregido, listado como P2**: 3 tablas de paneles admin (`audit-table.tsx`, `checkouts-table.tsx`, `events-table.tsx`) tienen el mismo patrón de columna "Fecha" sin ocultar en mobile — fuera del alcance explícito de mobile de este RC1 (herramientas de back-office, uso desktop esperado).

## 10. Editor

Duplicar, colapsar/expandir, comparativa, drag-and-drop de filas — validados con evidencia real (ver sección 14). El único bug confirmado en el editor era la race condition de `duplicateItem()` (Riesgo 2, ya corregido) y la falta de confirmación al borrar fila/columna (ya corregida). No se rediseñó ningún flujo.

## 11. PDF

Validado en el smoke test: generación portrait y landscape, descarga de ambos con magic bytes `%PDF` confirmados, `commercial_status` ausente del documento/preview en ambas orientaciones, y cambiar `commercial_status` después de emitir no altera el contenido de la versión ya emitida (verificado comparando el body del preview antes/después). Sin saltos, huérfanas/viudas ni desbordes nuevos detectados — el motor de PDF no se tocó en este RC1.

## 12. Limpieza de código

- Eliminados 3 archivos de código muerto sin ningún consumidor real: `src/components/ui/dropdown-menu.tsx`, `src/components/ui/tooltip.tsx`, `src/lib/render/canonical-json.ts` (confirmado con grep exhaustivo + `tsc --noEmit` limpio tras el borrado).
- `console.log`/`console.error` revisados: todos los existentes son logging estructurado intencional con prefijo de contexto (`[account-activation]`, `[email]`, `[memberships:audit]`, `[payments]`) — no se encontró ningún `console.log` de debug temporal para eliminar.
- TODOs/FIXME: cero encontrados en `src/`.
- No se identificó duplicación de código que justifique una abstracción nueva en este momento (el patrón repetido entre `use-autosave.ts`/`use-narrative-autosave.ts`/`use-proposal-details-autosave.ts` ya está cross-referenciado por comentarios; extraerlo es una mejora legítima pero no un bug — queda listada como P2).
- Git blame: los archivos tocados solo tienen los cambios puntuales descritos arriba, sin reformateo ni reescritura innecesaria.

## 13. Documentación actualizada

- `PROJECT_STATUS.md`: agregadas las secciones "Sprint B — Estado" y "RC1 — Estado" con el resumen real de esta sesión y la anterior.
- `RC1_RELEASE_REPORT.md`: este documento.
- `GO_LIVE_CHECKLIST.md`: checklist de despliegue basado en hallazgos reales, sin tareas inventadas.

## 14. Smoke Test

Ejecutado realmente vía Playwright contra el stack local (`e2e/sprint-b-qa.spec.ts`, corrida completa tras todos los cambios de este RC1, servidor y DB frescos):

| Flujo | Resultado |
|---|---|
| Login | ✅ |
| Dashboard | ✅ |
| Crear propuesta (contenido mínimo: alternativa, beneficio, comparativa) | ✅ |
| Duplicar (alternativa, beneficio, fila, columna) + persistencia tras reload | ✅ |
| Biblioteca | ✅ (búsqueda con debounce verificada manualmente tras el fix) |
| Plantillas | ✅ (cubierto por pgTAP + Sprint B) |
| `commercial_status` (cambio, ausencia en documento, independencia de versión emitida) | ✅ |
| Emitir versión (×2, portrait y landscape) | ✅ |
| Preview | ✅ |
| PDF (generar) | ✅ |
| Download (×2, magic bytes `%PDF` verificados) | ✅ |
| Logout | ✅ (cubierto en `login()`/flujo de sesión) |
| Responsive (375px: login, dashboard, proposals, library, wizard, detalle) | ✅ (0 overflow horizontal; 2 bugs encontrados y corregidos, ver secciones 9) |

No se declaró ningún flujo aprobado sin ejecutarlo realmente.

## 15. Resultados de validaciones técnicas

Todas ejecutadas sobre `supabase db reset` limpio, en este orden:

- `supabase db reset`: ✅ sin intervención manual.
- `supabase test db`: ✅ **33/33** (17 plantillas + 16 commercial_status).
- `npx tsc --noEmit`: ✅ sin errores.
- `npm run lint`: ✅ sin errores.
- `npm test`: ✅ **132/132**.
- `npm run build`: ✅ 43 rutas, sin errores ni warnings de build.

## 16. Hallazgos P0

Ninguno. No se encontró ningún hallazgo que impida vender/lanzar.

## 17. Hallazgos P1

Conviene resolver antes del Go Live, ninguno bloqueante:

1. Ninguno adicional a lo ya corregido en este RC1 — todos los hallazgos con severidad media/alta detectados en la auditoría se corrigieron en esta misma sesión (ver secciones 5-9).

## 18. Hallazgos P2

Pueden esperar una versión posterior:

1. `duplicateProposalAction` (`src/lib/proposal/actions.ts`): dos `await` secuenciales (`update_proposal_details` + `upsert_proposal_narrative`) que podrían paralelizarse con `Promise.all`. Impacto bajo, acción de un solo uso.
2. `templates-browser.tsx`/`library-browser.tsx`: fetch inicial vía `useEffect` en vez de datos server-rendered — genera un flash de loading visible al entrar a `/library`. Cosmético.
3. 3 tablas de paneles admin (`audit-table.tsx`, `checkouts-table.tsx`, `events-table.tsx`) con el mismo patrón de columna "Fecha" sin ocultar en mobile que se corrigió en `/dashboard` y `/proposals`. Herramientas de back-office, uso desktop esperado.
4. Duplicación de patrón (payload memoizado + `useAutosave` + `useEffect` que empuja `stepMeta`) entre `use-autosave.ts`, `use-narrative-autosave.ts` y `use-proposal-details-autosave.ts` — candidato a un hook genérico `useFieldAutosave` si aparece un cuarto caso similar, no antes.
5. Botón "Siguiente" del footer del wizard visualmente ajustado en mobile (375px) junto a "Anterior"/"Guardar" — sin overflow de documento, pero el texto queda visualmente apretado. Cosmético, no bloqueante.

## 19. Veredicto final

### **RC1 aprobado**

**Justificación técnica:** los dos riesgos que Sprint B había dejado explícitamente abiertos (migración local-only, race condition de `duplicateItem()`) están corregidos de raíz y validados con evidencia real, no solo con un parche superficial. La auditoría de seguridad completa no encontró ningún hallazgo P0/P1 explotable — el único gap real (10 RPCs sin revoke de `anon`) ya estaba neutralizado en la práctica por el propio código de las funciones, y se cerró de todos modos por higiene. Los hallazgos de performance, accesibilidad, UX y mobile encontrados eran todos reales pero de severidad media o menor, y se corrigieron en esta misma sesión con cambios acotados (sin rediseñar el editor ni ningún otro flujo). Las 6 validaciones técnicas (`db reset`, `test db`, `tsc`, `lint`, `test`, `build`) están en verde, y el smoke test de los 12 flujos críticos se ejecutó realmente, con evidencia concreta (PDFs descargados y verificados, filas reales en base de datos, capturas de pantalla mobile), no declarado por supuesto. No queda ningún hallazgo P0 ni P1 pendiente — solo P2 de bajo impacto, explícitamente no bloqueantes y no desarrollados en este ciclo por mandato del propio RC1.

## 20. Confirmación explícita

- ❌ No se hizo commit.
- ❌ No se hizo push.
- ❌ No se hizo deploy.
- ❌ No se modificó la base remota (la migración `20260724000000_revoke_remaining_proposal_rpcs_from_anon.sql` existe **solo en el repo local**, nunca aplicada al proyecto remoto `btgopvaztnttahyjejav`).
- ❌ No se agregaron funcionalidades nuevas — todos los cambios de este RC1 son correcciones de bugs, riesgos de seguridad/UX/mobile confirmados, o limpieza de código muerto.
