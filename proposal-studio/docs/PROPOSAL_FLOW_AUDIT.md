# Auditoría del flujo principal — Proposal Studio (Etapa 7)

Fecha: 2026-07-18. Flujo auditado end-to-end: cliente → propuesta → wizard → escenarios/alternativas → versiones → PDF → descarga/compartir.

## Método

Lectura completa de código (no solo grep) en `src/app/(app)/(premium)/**`, `src/components/wizard/**`,
`src/components/document/**`, `src/lib/{wizard,proposal,versions,render,client,branding}/**`, y verificación
directa contra el proyecto Supabase real (`btgopvaztnttahyjejav`) via `information_schema.routines` / `pg_proc`
para confirmar si las funciones RPC llamadas por el código existen de verdad (no asumido por presencia de
migraciones).

## Tabla de estado

| Paso | Ruta | Estado | Backend | UI | Riesgo | Prioridad |
|---|---|---|---|---|---|---|
| Dashboard | `/dashboard` | Completo | Sí | Sí | Bajo | — |
| Nueva propuesta (dialog + `/proposals/new`) | dashboard modal, `/proposals/new` | Completo | Sí (RPC `create_draft_proposal`, ahora versionada — ver Hallazgo A) | Sí | Bajo | — |
| Clientes (alta/listado/edición) | `/clients` | Completo | Sí | Sí | Bajo | — |
| Wizard — Cliente | paso 0 | Completo | Sí | Sí | Bajo | — |
| Wizard — Información | paso 1 | Completo | Sí | Sí | Bajo | — |
| Wizard — Diagnóstico | paso 2 | Completo | Sí | Sí | Bajo | — |
| Wizard — Alternativas | paso 3 | Parcial → **Corregido** | Sí | Sí | Ventajas/desventajas/notas se guardaban pero no se mostraban en el PDF (Hallazgo B) — corregido en esta etapa | — |
| Wizard — Recomendación | paso 4 | Completo | Sí | Sí | Bajo | — |
| Wizard — Beneficios | paso 5 | Completo | Sí | Sí | Bajo | — |
| Wizard — Comparativa | paso 6 | Completo | Sí | Sí | Bajo (mensaje de validación existe pero no es inline por celda) | Baja |
| Wizard — Resumen | paso 7 | Completo | Sí | Sí | Bajo | — |
| Autosave / recuperación de borrador | todos los pasos, `/proposal/[id]/edit` | Completo | Sí | Sí | Bajo | — |
| Detalle de propuesta | `/proposal/[id]` | Parcial | Sí (RPCs `update_proposal_meta`, `archive_proposal`, ahora versionadas — ver Hallazgo A) | Sí | Bajo — campo "Resumen ejecutivo" siempre vacío (Hallazgo C) | Media |
| Historial de versiones | `/proposal/[id]` | Completo | Sí | Sí | Bajo | — |
| Generación de PDF | API `/api/proposal-versions/[versionId]/pdf` | Completo | Sí | Sí | Bajo | — |
| Vista previa de versión | `/proposal/[id]/versions/[versionId]/preview` | Completo | Sí | Sí | Bajo | — |
| Descarga / compartir | API `/api/proposal-versions/[versionId]/download` | Completo | Sí (URLs firmadas, rate-limited) | Sí | Bajo | — |
| Branding | `/branding` | Completo | Sí | Sí | Bajo | — |
| Biblioteca | `/library` | **Sin backend real** | No (datos hardcodeados) | Parcial | Medio (funcionalidad secundaria, no bloquea el flujo principal) | Baja — fuera de alcance de esta etapa |
| `/preview` (stub huérfano) | `/preview` | Bug → **Eliminado** | No | No (placeholder deshabilitado) | Ruta muerta, sin enlaces, remanente del Sprint fundacional | — |

## Hallazgos

### Hallazgo A — Drift de esquema: funciones RPC del flujo principal no están en las migraciones versionadas

`create_draft_proposal`, `update_proposal_meta` y `archive_proposal` son invocadas desde
[actions.ts](src/lib/proposal/actions.ts) y [wizard/actions.ts](src/lib/wizard/actions.ts), pero no existe
ningún archivo en `supabase/migrations/` que las defina. Se verificó contra la base de datos real
(proyecto `btgopvaztnttahyjejav`) que **las tres funciones sí existen y con la firma correcta** — el flujo
funciona hoy en producción/desarrollo — pero como no están versionadas, cualquier entorno nuevo (otro
desarrollador, staging, disaster recovery) que se levante solo desde `supabase/migrations/` quedará roto en el
punto más crítico del flujo (crear propuesta).

**Actualización (Etapa 8, 2026-07-18): resuelto.** Ver `docs/SCHEMA_DRIFT_REPORT.md` — se agregó
`supabase/migrations/20260718000005_proposal_event_atomic_rpcs.sql` (y sus dependencias:
`20260718000004_proposal_number_sequence.sql`) que recrean las 3 funciones literalmente a partir de su
definición real en la base remota. Ya no es un riesgo pendiente.

### Hallazgo B — Ventajas/Desventajas/Notas de alternativas se guardaban pero nunca se mostraban en el PDF (corregido)

`AlternativeItem` capturaba "Ventajas", "Desventajas" y "Notas" y las persistía en
`proposal_alternatives.financial_details`, pero
[alternatives-section.tsx](src/components/document/alternatives-section.tsx) — el componente que renderiza el
PDF — nunca leía ese campo. Un asesor que completaba esos campos perdía el contenido silenciosamente en el
documento final. **Corregido**: se agregó el render de ventajas/desventajas (dos columnas) y notas en la tarjeta
de cada alternativa del PDF.

Bug relacionado (menor, corregido junto con el anterior): los textareas de "una por línea" guardaban un array
`[""]` en vez de `[]` cuando quedaban vacíos (`split("\n")` sin filtrar). Se agregó un `.transform()` en
[wizard/schemas.ts](src/lib/wizard/schemas.ts) que filtra líneas vacías antes de persistir.

### Hallazgo C — "Resumen ejecutivo" en el detalle de propuesta está permanentemente vacío

`/proposal/[id]` lee `proposal_narratives.executive_summary`
([page.tsx](<src/app/(app)/(premium)/proposal/[id]/page.tsx>) línea ~40), pero ningún paso del wizard ni acción
(`upsertNarrativeAction`) escribe esa columna — los campos de narrativa capturados son
`current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy`. El
mismo patrón aplica a `final_message`, que el motor de PDF soporta
([advisor-section.tsx](src/components/document/advisor-section.tsx)) pero el wizard nunca captura, así que el
cierre del PDF siempre usa el texto genérico por defecto.

También existen columnas en `proposal_alternatives` (`annual_premium`, `is_recommended`, `recommended_reason`,
`highlight_label`) que el motor de PDF sabe renderizar (badge "Recomendada", destacado visual) pero que el
wizard no expone en ningún formulario — quedan en su valor por defecto (`null`/`false`) para siempre.

**No implementado en esta etapa**: agregar estos campos requiere UI nueva en pasos existentes del wizard
(Alternativas, Resumen), lo cual excede "corregir un bug" y entra en zona de ampliación de formulario. Se
documenta como pendiente real y priorizable, no como bug bloqueante — el flujo completo (crear → PDF →
descargar) funciona sin estos campos, solo queda contenido opcional sin capturar.

### Hallazgo D — Ruta huérfana `/preview` (corregido — eliminada)

`src/app/(app)/(premium)/preview/page.tsx` era un placeholder 100% estático del Sprint fundacional
("El motor de renderizado se implementa en el Sprint 2", botón "Generar PDF" permanentemente
`disabled`). No tenía ningún enlace entrante desde sidebar, dashboard ni ningún otro componente (verificado por
grep). La vista previa real y funcional vive en `/proposal/[id]/versions/[versionId]/preview`. Se eliminó la
ruta muerta para no dejar una pantalla rota alcanzable por URL directa.

### Hallazgo E — Biblioteca (`/library`) sin backend real

La página tiene datos 100% hardcodeados (`favorites`, `categories`), el buscador no tiene `onChange`/estado, y
no consulta las tablas `proposal_templates` / `library_items` que sí existen en las migraciones. No forma parte
de los 7 pasos del flujo principal solicitado (crear cliente → ... → descargar/compartir), así que **no se
implementó en esta etapa** por restricción explícita de alcance ("no trabajar sobre nuevas funcionalidades
salvo que bloqueen el flujo principal"). Queda documentado como pendiente para una etapa futura.

## Lo que ya funcionaba bien (no se tocó)

- CRUD de clientes: validación real, Supabase real, paginación, estados vacíos/error.
- Arquitectura de autosave (debounce, guard de carrera por secuencia, concurrencia optimista con
  resolución de conflicto "mantener lo mío"/"recargar").
- Alta/edición/borrado/reordenado de alternativas y beneficios, cada uno con autosave y resolución de
  conflicto.
- Recuperación de borrador en `/proposal/[id]/edit`.
- Emisión de versiones (`emit_proposal_version`): transaccional, deduplicado por checksum, con evento de
  auditoría.
- Pipeline de generación de PDF (Puppeteer + `@sparticuz/chromium`, portada+contenido vía `pdf-lib`,
  subida a Storage con checksum, idempotente).
- Descarga/compartir: URLs firmadas de corta duración, rate-limited, con verificación de ownership.
- Branding: se guarda en DB y se consume de verdad en el render del PDF (colores, logo, firma).
- RLS/ownership: todas las acciones y RPCs verifican `user_id = auth.uid()` en el servidor.
