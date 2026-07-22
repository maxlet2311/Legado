# Go-Live Checklist — Proposal Studio™ / Legado

Basado en el cierre de RC1 (2026-07-22). Ver `RC1_RELEASE_REPORT.md` para el detalle completo de la auditoría. Solo información real verificada durante Sprint A, Sprint B y RC1 — nada de esto es especulativo.

## Base de datos / Supabase

- [x] Todas las migraciones de Sprint A y Sprint B aplicadas al proyecto remoto (`btgopvaztnttahyjejav`): `proposal_commercial_status`, `apply_template_atomic`, `proposal_templates_is_active`.
- [x] ACL verificada en remoto: `anon` sin `EXECUTE` en las RPCs de propuestas/plantillas, `authenticated` con `EXECUTE`.
- [ ] **Pendiente, decisión del equipo**: la migración de RC1 `20260724000000_revoke_remaining_proposal_rpcs_from_anon.sql` (cierra el gap de 10 RPCs con `EXECUTE` de `anon` sin revocar) existe solo en el repo local — no se aplicó a producción durante este RC1 por alcance ("no apliques migraciones al proyecto remoto"). Aplicarla antes o después de lanzar es indistinto en términos de riesgo (no es explotable hoy), pero debería aplicarse en algún momento cercano al Go Live.
- [ ] **Reconciliar historial de migraciones antes del primer `supabase link` + `db push` real**: el historial local (`supabase/migrations/`, timestamps desde `20260715170001`) y el historial remoto (mismo contenido, pero registrado con otros timestamps/nombres, ej. `20260716025944_platform_owner_complete` vs. local `20260716010000_platform_owner.sql`) no coinciden por versión. Un `db push` ingenuo intentaría reaplicar ~57 migraciones ya existentes en remoto. Reconciliar con `supabase migration repair --status applied <version>` para cada una antes de cualquier push real.
- [x] `supabase db reset` funciona sin intervención manual (platform owner local resuelto vía seed, sin depender del UUID real de producción).
- [ ] **Acción manual pendiente en el Dashboard de Supabase** (no configurable por SQL/migración): activar "Leaked Password Protection" en Authentication → Attack Protection.

## Seguridad

- [x] RLS/IDOR auditado en las 22 tablas del esquema — sin hallazgos.
- [x] `SECURITY DEFINER` + `search_path` fijo verificado en las 33 funciones con lógica de negocio.
- [x] XSS, CSRF, SSRF, SQL/PostgREST filter injection — auditados, sin hallazgos explotables.
- [x] Validación Zod en todas las Server Actions con input complejo.
- [x] Guards de rutas (`requireActiveUser`/`requireAdmin`/`requirePlatformOwner`) verificados en middleware y en los 15 route handlers de `/api/admin/**`.

## Funcional

- [x] Wizard completo (cliente, información, diagnóstico, alternativas, beneficios, comparativa, recomendación, resumen) validado de punta a punta.
- [x] Duplicar alternativa/beneficio/fila/columna: persistencia confirmada tras reload, indicador de guardado, rollback si falla, bloqueo de navegación mientras el guardado está en curso.
- [x] `commercial_status`: cambio, auditoría en `proposal_events`, independencia respecto del `status` técnico y de versiones ya emitidas — validado con pgTAP (33/33) y QA funcional real.
- [x] Emisión de versiones, preview, generación y descarga de PDF (portrait/landscape) — validado con evidencia real (PDFs descargados, magic bytes verificados).
- [x] Plantillas: creación atómica, rollback ante fallo intermedio, plantilla inactiva/inexistente/ajena — validado con pgTAP.

## Mobile

- [x] Sin overflow horizontal en login, dashboard, `/proposals`, biblioteca, wizard, detalle de propuesta (smoke test real a 375px).
- [x] Tabla de `/proposals` y de `/dashboard` no cortan la columna Estado sin aviso.
- [x] Historial de versiones (botón "Descargar") no queda cortado en mobile.
- [ ] **No verificado en este RC1** (fuera de alcance explícito): paneles de administración (`/admin/audit`, `/admin/payments/*`) en mobile — uso desktop esperado para estas herramientas de back-office.

## Calidad técnica

- [x] `supabase test db`: 33/33.
- [x] `npx tsc --noEmit`: sin errores.
- [x] `npm run lint`: sin errores.
- [x] `npm test`: 132/132.
- [x] `npm run build`: 43 rutas, sin errores.
- [x] Sin código muerto conocido, sin `console.log`/TODO temporales.

## Pendientes no bloqueantes (P2, ver `RC1_RELEASE_REPORT.md` sección 18)

- [ ] Paralelizar 2 `await` secuenciales en `duplicateProposalAction`.
- [ ] Evaluar server-render del primer batch de Biblioteca/Plantillas (evitar flash de loading).
- [ ] Ocultar columna "Fecha" en mobile en las 3 tablas de paneles admin, si en algún momento se usan desde el celular.
- [ ] Extraer un hook genérico de autosave si aparece un cuarto caso similar a los 3 ya existentes.
- [ ] Ajuste visual menor del footer del wizard en mobile (375px), sin overflow real.

## Veredicto de RC1

**RC1 aprobado.** Ver justificación técnica completa en `RC1_RELEASE_REPORT.md`, sección 19.
