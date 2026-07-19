# Schema Drift Report — Etapa 8

Fecha: 2026-07-18
Proyecto Supabase: `Legado WebApp` (`btgopvaztnttahyjejav`, Postgres 17.6, us-west-2)
Alcance: reproducibilidad completa del esquema de base de datos a partir únicamente de `supabase/migrations/`. No se modificó ninguna regla de negocio, UI, permiso de usuario ni dato de producción. No se hizo commit, push ni deploy.

## Resumen ejecutivo

El repositorio tenía 39 migraciones locales que reconstruían correctamente 22 tablas, la mayoría de funciones/RPC, todos los buckets de storage y casi todas las policies. Sin embargo, comparando contra el estado real de la base remota se encontraron **6 objetos o grupos de objetos** que existen y funcionan en producción pero nunca quedaron representados en una migración versionada — exactamente el riesgo que motivó esta etapa (los ejemplos citados en el enunciado, `create_draft_proposal`, `update_proposal_meta` y `archive_proposal`, están entre ellos).

Se agregaron **6 migraciones nuevas** (`20260718000001` a `20260718000006`) que recrean esos objetos de forma idempotente y sin alterar su comportamiento actual. Con esas migraciones aplicadas, el repositorio queda funcionalmente completo respecto del estado remoto verificado.

No se pudo ejecutar la reconstrucción en una base limpia (`supabase db reset`) porque el entorno no tiene Docker Desktop disponible (prerequisito de la CLI de Supabase para levantar el stack local) — se documenta en el Paso 6 con la evidencia exacta del intento.

## Objetos encontrados fuera de migraciones (schema drift)

| # | Objeto | Dónde vive en remoto | Evidencia |
|---|--------|----------------------|-----------|
| 1 | Event trigger `ensure_rls` + función `public.rls_auto_enable()` | Habilita RLS automáticamente en cada `CREATE TABLE` nuevo en `public` | `pg_event_trigger` / `pg_get_functiondef` — sin migración de origen (ningún nombre de migración remota lo referencia) |
| 2 | `UNIQUE (user_id)` en `public.brands` (`brands_user_id_key`) | Invariante "un asesor, una marca" | `pg_constraint`; ya asumido en un comentario de `20260715234200_fix_emit_proposal_version_brand_lookup.sql` pero nunca creado |
| 3 | Índice `proposal_versions_created_by_idx` | `public.proposal_versions(created_by)` | `pg_indexes`; migración remota `proposal_versions_created_by_index` (20260715204246) sin equivalente local |
| 4 | Secuencia `proposal_number_seq` + función `public.generate_proposal_number()` | Generan el número `PROP-YYYY-NNNNNN` | `pg_sequences` / `pg_get_functiondef`; migración remota `proposal_number_sequence` (20260715204310) sin equivalente local |
| 5 | Funciones `public.create_draft_proposal`, `public.update_proposal_meta`, `public.archive_proposal` | RPCs atómicas (mutación + `proposal_events`) usadas por Server Actions | `pg_get_functiondef`; migración remota `proposal_event_atomic_rpcs` (20260715204326) sin equivalente local — **los 3 ejemplos citados en el enunciado** |
| 6 | ~20 policies RLS con `auth.uid()` sin envolver en `(select ...)` | `brands`, `clients`, `library_items`, `profiles`, `proposal_alternatives/benefits/events/files/narratives/sections/templates`, `proposals`, `proposal_versions`, `storage.objects` (4 policies) | `pg_policies`: qual remoto usa `(SELECT auth.uid() AS uid)`, migraciones locales (`rls_policies.sql`, `storage_buckets.sql`, `proposal_versions_immutable_rls.sql`) las crean sin envolver — migración remota `rls_auth_uid_initplan_optimization` (20260715204239) sin equivalente local completo (solo existía la versión acotada a `proposal_comparisons`) |

### Diferencias descartadas (no son drift real)

Migraciones que aparecen en el historial remoto (`supabase migration list`) sin archivo local homónimo, pero cuyo objeto final **coincide exactamente** con lo que ya crea otra migración local — el desajuste es solo de nombre/timestamp de historial, no de esquema:

- `platform_owner_complete` → coincide byte a byte con `20260716010000_platform_owner.sql` (verificado con `pg_get_functiondef` de `handle_new_user` y `update_own_profile`).
- `optimistic_concurrency_drop_old_overloads` → los mismos `drop function if exists` ya están inline al inicio de `20260715220000_optimistic_concurrency.sql`.
- `signatures_bucket_private` (remoto, 20260715204251) → coincide con `20260717040000_signatures_bucket_private.sql` local (bucket `signatures` confirmado `public = false` en remoto).
- `revoke_rls_auto_enable_execute` → absorbido dentro de la migración nueva #1 (mismo `revoke` en la misma migración que crea la función, no amerita archivo separado).
- Todas las migraciones cuyo nombre coincide 1:1 con un archivo local (`account_activation_invitations`, `membership_*`, `payment_provider_events`, `admin_audit_events`, etc.) — se verificaron contra `information_schema.tables` (22/22 tablas coinciden) y no presentan drift de columnas.

## Clasificación

| Objeto | Clase | Justificación |
|--------|-------|----------------|
| `ensure_rls` / `rls_auto_enable()` | **A** | Mecanismo de seguridad activo en remoto; sin migración, un `db reset` dejaría nuevas tablas sin RLS automático |
| `brands_user_id_key` | **A** | Constraint activa que el código ya asume; ausente rompería la garantía en una base reconstruida |
| `proposal_versions_created_by_idx` | **A** | Índice de performance activo; ausente no rompe funcionalidad pero sí reproducibilidad exacta |
| `proposal_number_seq` / `generate_proposal_number` | **A** | Dependencia dura de `create_draft_proposal`; sin esto, la app no podría crear propuestas en una base reconstruida |
| `create_draft_proposal` / `update_proposal_meta` / `archive_proposal` | **A** | RPCs usadas directamente por Server Actions (los 3 ejemplos del enunciado) |
| Policies sin optimizar (`auth.uid()` vs `(select auth.uid())`) | **A** | Mismo efecto de acceso, pero el `qual` textual difiere del remoto — para que `db reset` produzca *exactamente* el mismo esquema (no solo equivalente) hace falta versionarlo |
| Renumeración de timestamps de migraciones locales vs historial remoto | **B** | No afecta el resultado de `db reset` (que solo respeta el orden alfabético de archivos), pero sí puede confundir `supabase migration list --linked` / `supabase db push` al intentar reconciliar historiales. Documentado como riesgo restante, no se resuelve automáticamente (implicaría reescribir `supabase_migrations.schema_migrations` en remoto, fuera del alcance autorizado) |
| Extensiones remotas no instaladas localmente (`pgaudit`, `pg_cron`, `pgroonga`, etc., ~90 extensiones *disponibles* mostradas por `list_extensions`) | **C** | Son extensiones *disponibles* en la imagen de Postgres de Supabase, no necesariamente *instaladas*. Solo están `installed_version` no nulo: `vector`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `pgsodium`/`supabase_vault` (gestión de Supabase) — todas ya cubiertas por `20260715170001_extensions_and_helpers.sql` + `20260715170016_security_hardening.sql` (mueve `vector` a schema `extensions`) |
| Triggers de sistema (`pgrst_ddl_watch`, `issue_pg_cron_access`, etc.) y triggers internos de `storage`/`realtime` | **C** | Provistos por la plataforma Supabase al aprovisionar el proyecto, no por migraciones de usuario; se recrean automáticamente en cualquier proyecto Supabase nuevo |

## Migraciones creadas

| Archivo | Contenido |
|---|---|
| `20260718000001_event_trigger_rls_auto_enable.sql` | Función `rls_auto_enable()` + event trigger `ensure_rls` (con su `revoke execute`) |
| `20260718000002_brands_unique_user_id.sql` | `alter table brands add constraint brands_user_id_key unique (user_id)` |
| `20260718000003_proposal_versions_created_by_index.sql` | `create index if not exists proposal_versions_created_by_idx` |
| `20260718000004_proposal_number_sequence.sql` | Secuencia `proposal_number_seq` + función `generate_proposal_number()` |
| `20260718000005_proposal_event_atomic_rpcs.sql` | `create_draft_proposal`, `update_proposal_meta`, `archive_proposal` (+ grants) |
| `20260718000006_rls_auth_uid_initplan_optimization.sql` | Reemplaza ~20 policies para envolver `auth.uid()` en `(select ...)`, alineado con el patrón ya usado en `fix_proposal_comparisons_rls_initplan.sql` |

Todas son idempotentes (`create or replace function`, `create index if not exists`, `drop policy if exists` + `create policy`, `drop event trigger if exists`) salvo la constraint única (#2) y la secuencia (#4, usa `if not exists`), que no requieren idempotencia adicional porque no se ejecutan dos veces sobre la misma base ya migrada.

### Orden y dependencias verificadas

`000004` (secuencia) debe preceder a `000005` (`create_draft_proposal` llama a `generate_proposal_number()`) — se respeta por timestamp. `000006` solo reescribe policies sobre tablas creadas en migraciones muy anteriores — sin ciclos. Ninguna migración nueva depende de objetos creados en otra migración nueva posterior.

## Validación

| Paso | Resultado |
|---|---|
| Reconstrucción en base limpia (`supabase db reset`) | **No ejecutado.** El entorno no tiene Docker Desktop instalado/corriendo (prerequisito de la CLI de Supabase para el stack local). Evidencia real del intento: `supabase db reset --linked=false` → `failed to inspect service: error during connect: ... the docker client must be run with elevated privileges to connect ... Docker Desktop is a prerequisite for local development.` Tampoco existe `supabase/config.toml` en el repo (no se corrió nunca `supabase init`), lo que también bloquearía `supabase start`. Este es un riesgo restante real, no una validación fallida silenciada. |
| `npx tsc --noEmit` | ✅ Sin errores |
| `npm run lint` | ✅ Sin errores (`eslint .`) |
| `npm test` | ✅ 116/116 tests pasan |
| `npm run build` | ✅ Build de producción exitoso (42 rutas generadas) |
| RPC críticas presentes en remoto | ✅ `create_draft_proposal`, `update_proposal_meta`, `archive_proposal`, `emit_proposal_version`, `record_proposal_version_artifact` — confirmadas vía `pg_proc`, y ahora las 3 primeras quedan versionadas |

La validación de aplicación (tsc/lint/test/build) se corrió contra el código actual sin tocar la base remota — confirma que el código sigue funcionando, pero **no** confirma por sí sola que las migraciones nuevas apliquen limpiamente en una base vacía (eso requeriría el Paso 6, no disponible en este entorno).

## Riesgos restantes

1. **No se validó `db reset` en una base realmente limpia** (falta Docker Desktop). Las migraciones nuevas se derivaron leyendo la definición exacta de cada objeto en remoto (`pg_get_functiondef`, `pg_get_constraintdef`, `pg_policies.qual`) y replicándola literalmente, pero solo una ejecución real en base limpia certifica ausencia de errores de sintaxis u orden. Recomendación: instalar Docker Desktop y correr `supabase db reset` antes de dar por cerrada la etapa.
2. **Historial de migraciones remoto y local no coinciden en timestamps/nombres** (ver clase B arriba). Si en el futuro se corre `supabase db push` contra este proyecto sin antes reconciliar `supabase migration repair`, la CLI puede reportar conflictos de historial aunque el esquema resultante sea idéntico. No se tocó el historial remoto en esta etapa (fuera del alcance autorizado: "no aplicar migraciones remotas sin autorización").
3. **No existe `supabase/config.toml`** — nunca se corrió `supabase init` en este repo. No es drift de esquema, pero es parte del mismo objetivo de reproducibilidad (`supabase start`/`db reset` lo requieren). No se creó en esta etapa porque implica decisiones de configuración (puertos, versión de Postgres del stack local, etc.) fuera del alcance de "no rediseñar" — se documenta para decisión explícita del usuario.
4. Las ~90 extensiones "disponibles" reportadas por `list_extensions` no instaladas no representan riesgo: son parte de la imagen base de Supabase, no de las migraciones del proyecto.

## Confirmación

**¿El proyecto puede reconstruirse completamente desde un repositorio limpio utilizando únicamente las migraciones versionadas?**

**No**, todavía no de forma *verificada* — aunque el análisis objeto por objeto indica que sí debería ser posible. La razón es exclusivamente de entorno: no se pudo ejecutar `supabase db reset` (falta Docker Desktop y `supabase/config.toml`) para confirmarlo empíricamente, tal como exige el Paso 6 ("no afirmar resultados no ejecutados"). Con las 6 migraciones agregadas en esta etapa, el inventario de objetos remotos vs. locales queda cerrado (0 diferencias pendientes conocidas); lo que falta es la corrida de verificación en una base limpia, no un objeto sin migrar.
