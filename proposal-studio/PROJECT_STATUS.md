# PROJECT_STATUS.md — Proposal Studio™

Última actualización: 2026-07-15. Este documento resume el estado real del proyecto para coordinar los próximos prompts/pasos de desarrollo.

---

## 1. Qué es el proyecto

Proposal Studio™ es una plataforma SaaS para que Productores Asesores de Seguros generen propuestas comerciales premium (no es un CRM, no es un cotizador). Convierte datos técnicos de una cotización en un documento consultivo de alto impacto visual, en menos de 5 minutos por propuesta.

## 2. Fuentes de verdad del repo

- `/docs` — documentación funcional (**no se modifica**).
- `/stitch-export` — diseño visual oficial (**no se rediseña**, ya consolidado — ver sección 4).
- `/src` — código de la aplicación (**vacío, greenfield**).
- `/specs`, `/prompts`, `/assets` — scaffolding vacío, sin contenido aún.

## 3. Documentación funcional: qué está escrito y qué falta

| Documento | Estado | Contenido |
|---|---|---|
| `00_PROJECT_VISION.md` | ✅ Completo | Visión, misión, principios de producto |
| `01_PRODUCT_SPEC.md` | ✅ Completo (450 líneas) | Especificación funcional del producto |
| `02_USER_FLOWS.md` | ✅ Completo (327 líneas) | Flujos de usuario |
| `03_DESIGN_SYSTEM.md` | ✅ Completo (663 líneas) | Sistema de diseño — **⚠️ contiene una paleta de colores distinta a la que Stitch diseñó realmente** (ver sección 5, riesgo #1) |
| `04_DATA_MODEL.md` | ✅ Completo (398 líneas) | Modelo de datos |
| `05_BUSINESS_RULES.md` | ✅ Completo (403 líneas) | Reglas de negocio |
| `06_PDF_ENGINE.md` | ✅ Completo (669 líneas) | Especificación del motor de generación de PDF |
| `07_BRANDING_SYSTEM.md` | ✅ Completo (488 líneas) | Sistema de marca/personalización del asesor |
| `08_ROADMAP.md` | ❌ **Vacío** | Sin ninguna decisión de roadmap documentada |
| `09_TECH_ARCHITECTURE.md` | ❌ **Vacío** | **No hay stack técnico definido todavía** (framework, gestor de estado, hosting, motor de PDF a usar) |
| `10_COMPONENT_LIBRARY.md` | ❌ **Vacío** | Sin librería de componentes definida (ni shadcn, ni Radix, ni nada) |

**Punto clave para ChatGPT:** la documentación de producto/negocio está sólida y completa (8 de 11 docs). Lo que falta no es "qué construir" sino "con qué stack" y "en qué orden" — eso es exactamente lo que definen los 3 documentos vacíos.

## 4. Diseño visual: consolidado y listo para usar como referencia

Se auditó el export completo de Stitch (25 pantallas HTML estáticas, con hasta 3 variantes por pantalla) y se ejecutó una consolidación: se comparó contenido real (no solo nombres) para elegir la versión más evolucionada de cada pantalla, se fusionaron 2-3 funcionalidades que existían solo en versiones descartadas, y se corrigió un caso de mezcla de idioma. Las variantes duplicadas/obsoletas ya fueron eliminadas.

`stitch-export/stitch_premium_proposal_engine/` contiene ahora **10 pantallas de referencia definitivas**, sin sufijos de versión:

| Carpeta | Pantalla |
|---|---|
| `dashboard/` | Panel principal del asesor (con hero personalizado por saludo + resumen de actividad) |
| `login/` | Login / portal de acceso |
| `library/` | Biblioteca de recursos y plantillas (con sección "Favoritos") |
| `branding/` | Configuración de marca del asesor (logo, firma, paleta, pie de página legal) |
| `wizard-steps-1-2/` | Wizard nueva propuesta — Paso 1 (tipo de cliente) y Paso 2 (datos) |
| `wizard-steps-3-4/` | Wizard — Paso 3 (alternativas financieras) y Paso 4 (beneficios) |
| `wizard-steps-5-7/` | Wizard — Paso 5 (estrategia/editor), Paso 6 (comparación), Paso 7 (CTA final) |
| `preview/` | Paso 8 — vista previa final del PDF |
| `onboarding/` | Onboarding de objetivos del cliente |
| `client-view/` | Vista del documento final tal como la recibe el cliente ("magazine view") |

Más 4 carpetas de **assets de referencia** (no son pantallas): set de íconos de línea, 3 fotografías editoriales de estilo, un demo de shader, y notas de spacing (`proportional_precision`).

**Importante:** estas 10 carpetas son HTML+Tailwind CDN estático puro — **no son componentes ni código de producto**. Sirven como referencia visual pixel-a-pixel (tokens de color, tipografía, spacing, estructura de layout), no como código a reutilizar directamente.

## 5. Riesgos / decisiones abiertas que ChatGPT debería tener en cuenta

1. **Conflicto de paleta:** `docs/03_DESIGN_SYSTEM.md` especifica una paleta (`Background #F8F9FB`, `Text Primary #111827`, nombres tipo Background/Surface/Border) que **no coincide** con la paleta que Stitch efectivamente diseñó (`primary #0041c8`, sistema de roles tipo Material Design 3: `surface-container-low`, `on-primary-fixed`, etc.). Falta decidir cuál es la paleta oficial antes de tokenizar el design system del código real. Recomendación ya dada: usar la paleta de Stitch, dado que "el diseño no se rediseña".
2. **Sin stack técnico definido** (`09_TECH_ARCHITECTURE.md` vacío): falta decidir framework (Next.js/Vite/otro), gestor de estado, librería de componentes base, y motor de generación de PDF real (el doc `06_PDF_ENGINE.md` especifica el comportamiento esperado pero no la tecnología).
3. **Sin roadmap ni librería de componentes documentados** — cualquier plan de sprints que arme ChatGPT necesita llenar ese vacío primero.
4. **El wizard tiene 8 pasos pero solo 3 archivos de referencia** (agrupados 1-2, 3-4, 5-7) más la vista previa (paso 8) — al construir el componente `WizardStepper` real, cada paso deberá desacoplarse en su propio componente/ruta, no replicar el agrupamiento del HTML de referencia.
5. Las imágenes de todas las pantallas de referencia son URLs temporales de generación de Stitch (`lh3.googleusercontent.com/aida-public/...`) — no son assets de producción, van a necesitar reemplazo.

## 6. Gate de Inicio del Desarrollo (checklist para los próximos prompts)

- [ ] Definir stack técnico → completar `docs/09_TECH_ARCHITECTURE.md`
- [ ] Resolver el conflicto de paleta (docs vs. Stitch) → actualizar `docs/03_DESIGN_SYSTEM.md` o documentar la decisión
- [ ] Definir librería de componentes base → completar `docs/10_COMPONENT_LIBRARY.md`
- [ ] Definir roadmap/orden de construcción → completar `docs/08_ROADMAP.md`
- [ ] Setup del proyecto real en `/src` (hoy vacío): bundler, Tailwind compilado (no CDN), TypeScript
- [ ] Portar tokens de diseño de `/stitch-export` a `tailwind.config` tipado
- [ ] Construir componentes base reutilizables a partir de los patrones repetidos en las 10 pantallas: `Sidebar`, `TopNav`, `BentoCard`, `StatusPill`, `WizardStepper`, `DataTable`
- [ ] Definir tecnología real del motor de PDF (hoy solo está la especificación funcional en `06_PDF_ENGINE.md`)
- [ ] Reemplazar imágenes temporales de Stitch por assets propios

## 7. Lo que NO hace falta rehacer

- La documentación funcional (visión, spec, flujos, modelo de datos, reglas de negocio, motor de PDF, branding) está completa y no requiere reescritura, solo consulta.
- La referencia visual ya está consolidada y limpia — no hace falta volver a auditar el export de Stitch.



## Foundation Sprint — Estado

Estado: ✅ Aprobado

Resultados:

- aplicación Next.js inicializada;
- TypeScript strict;
- Tailwind CSS v4 compilado;
- tokens visuales oficiales portados;
- shell principal implementado;
- componentes fundacionales creados;
- rutas base navegables;
- build, lint y typecheck correctos.

No se implementaron todavía:

- wizard funcional;
- generación de PDF;
- inteligencia artificial;
- portal público (share_token).

## Corrección integral pre-Sprint 3 — Estado

Estado: ✅ Aprobado (2026-07-15)

Auditoría técnica completa aplicada sobre base de datos, RLS, Storage, Auth,
Server Actions y frontend. Resumen de lo corregido:

- `brands` garantiza una marca por usuario a nivel de DB (`UNIQUE(user_id)`) y
  se escribe vía `upsert(onConflict: "user_id")`.
- `proposal_versions` es inmutable: policies separadas (SELECT/INSERT del
  dueño; sin UPDATE/DELETE para `authenticated`).
- Las 15 policies RLS de las 13 tablas (+ 4 policies de Storage) usan
  `(select auth.uid())` — sin avisos `auth_rls_initplan` en el advisor.
- Creación, actualización de metadatos y archivado de `proposals` pasan por
  RPCs transaccionales (`create_draft_proposal`, `update_proposal_meta`,
  `archive_proposal`) que garantizan que la propuesta y su `proposal_event`
  se escriben atómicamente.
- `proposal_number` se genera en servidor vía secuencia (`generate_proposal_number()`),
  sin colisiones posibles bajo concurrencia.
- Bucket `signatures` es privado; acceso vía signed URLs de corta duración.
- `rls_auto_enable()` ya no es ejecutable por `anon`/`authenticated`.
- Sesión y perfil se resuelven una sola vez por request (`requireSession()`
  cacheada con `React.cache`).
- `/clients` tiene paginación server-side (range + count, 20 por página).
- Password reset usa `NEXT_PUBLIC_SITE_URL` (obligatoria en producción, falla
  explícito si falta).
- Lógica de clientes separada a `src/lib/client/actions.ts`.

Validado con `tsc --noEmit`, `eslint`, `next build`, advisors de seguridad
(0 warnings) y pruebas RLS/atomicidad/concurrencia con dos usuarios reales
temporales (creados y eliminados durante la auditoría).

## Platform Owner — Estado

Estado: ✅ Implementado (2026-07-16)

Ver `docs/AUTH_AND_ROLES.md` para el detalle completo. Resumen:

- `public.profiles.is_platform_owner` (boolean, default `false`) separa la
  propiedad máxima de la plataforma del rol operativo (`role`).
- Índice único parcial `profiles_single_platform_owner_idx`: como máximo un
  owner activo a la vez.
- Owner asignado: `98a388bb-5385-42e2-98d5-9db0b716af82` (`role='admin'`,
  `is_platform_owner=true`, `is_active=true`).
- `handle_new_user()` crea usuarios nuevos siempre con `role='advisor'`,
  `is_active=true`, `is_platform_owner=false` — ignora cualquier campo
  privilegiado enviado en `raw_user_meta_data` durante el signup.
- Se revocó la policy de `UPDATE` amplia de `profiles` (permitía a un usuario
  escribir su propio `role`/`is_active`/`is_platform_owner`/`user_id` sin
  restricción). Reemplazada por la RPC `update_own_profile(p_full_name)`
  (solo toca `full_name`, valida `auth.uid()`), sin uso desde el frontend
  todavía.
- Helpers centrales: `src/lib/auth/authorization.ts` (puros: `isAdmin`,
  `isPlatformOwner`, `canAccessAdminArea`) y
  `src/lib/auth/authorization-guards.ts` (server-only: `requireAdmin()`,
  `requirePlatformOwner()`).
- UI: el avatar del topbar (antes hardcodeado a "AM") ahora muestra el
  nombre real y la etiqueta de rol ("Propietario de plataforma" /
  "Administrador" / "Asesor").
- Validado con 21 aserciones automatizadas (owner, admin operativo, advisor,
  admin inactivo, intento de escalada de privilegios vía metadata de signup,
  intento de escalada vía `UPDATE` directo bloqueado por RLS, RPC de
  autoservicio, constraint de único owner) — usuarios temporales creados y
  eliminados durante la prueba (`e2e/platform-owner-guards.mjs`).
- No existe todavía ningún panel administrativo ni Server Action exclusiva
  de admin/owner en el producto: los guards quedan preparados y documentados
  para cuando se agregue uno.

## Hardening final Platform Owner + Auth — Estado

Estado: ✅ Completado (2026-07-16)

Riesgo real encontrado: todas las Server Actions y Route Handlers privados
(clientes, branding, propuestas, wizard, emisión de versiones, descarga y
generación de PDF) usaban `requireUser()` (solo valida que exista sesión) en
vez de exigir además `profile.is_active === true`. El middleware revalida
`is_active` para navegación de página, pero **no cubre `/api/**`** — los dos
Route Handlers de PDF/descarga dependían enteramente del guard interno, y ese
guard no chequeaba `is_active`. Un usuario desactivado a mitad de sesión
podía seguir generando/descargando PDFs y ejecutando mutaciones mientras su
JWT siguiera vigente.

Corrección:

- Guard central nuevo `requireActiveUser()` en
  `src/lib/auth/authorization-guards.ts`: exige sesión + `is_active`,
  reutiliza la caché por request de `requireSession` (sin llamadas
  duplicadas a Supabase Auth), y hace `signOut()` + redirect a
  `/login?error=inactive` si el usuario está inactivo.
- `requireAdmin()`/`requirePlatformOwner()` refactorizados para construirse
  sobre `requireActiveUser()`.
- `requireUser()` (el helper que solo validaba autenticación) se eliminó de
  `session.ts` — ya no tiene ningún call site y era el foot-gun que permitía
  saltear el chequeo de `is_active`.
- Reemplazado en las 8 Server Actions/Route Handlers y 7 páginas del grupo
  `(app)` que antes llamaban `requireUser()`/`requireSession()` directamente:
  `src/lib/client/actions.ts`, `src/lib/branding/actions.ts`,
  `src/lib/proposal/actions.ts`, `src/lib/wizard/actions.ts`,
  `src/lib/versions/actions.ts`,
  `src/app/api/proposal-versions/[versionId]/{pdf,download}/route.ts`,
  `src/app/(app)/layout.tsx` y las páginas de dashboard, clientes, branding,
  propuesta, edición, nueva propuesta y preview de versión.
- No se tocaron migraciones históricas. `update_own_profile` y
  `handle_new_user` remotos ya cumplían todos los requisitos de
  endurecimiento (SECURITY DEFINER, `search_path` fijo, referencias
  calificadas, solo `full_name` como parámetro, `REVOKE`/`GRANT` correctos)
  — no se recrearon.
- Verificado en DB real (proyecto `btgopvaztnttahyjejav`): un solo
  `is_platform_owner = true`, índice único parcial intacto, sin policy de
  `UPDATE` en `profiles`, `update_own_profile` sin `EXECUTE` para
  `public`/`anon`.
- Advisors de seguridad: sin warnings nuevos. Los dos existentes son
  esperados y ya estaban documentados —
  `authenticated_security_definer_function_executable` sobre
  `update_own_profile` (función acotada a un solo campo, aceptado) y
  `auth_leaked_password_protection` (acción manual pendiente en Supabase
  Dashboard → Authentication → Attack Protection, no configurable por SQL).
  Advisor de performance: solo `unused_index` informativos preexistentes en
  tablas fuera de alcance de esta tarea.
- `e2e/platform-owner-guards.mjs` ampliado con aserciones explícitas de
  `requireActiveUser()` para cada perfil (owner, admin operativo, advisor,
  admin inactivo) — 24 aserciones, todas en verde; usuarios temporales
  creados y eliminados durante la corrida.
- `tsc --noEmit`, `eslint` y `next build` sin errores ni warnings.

Riesgos pendientes (fuera de alcance, no bloqueantes):

- Leaked password protection sigue requiriendo activación manual en el
  Dashboard de Supabase.
- Los archivos `supabase/migrations/20260716010000_platform_owner.sql` y
  `20260716010100_drop_redundant_platform_owner_index.sql` documentan (de
  forma idempotente) el mismo cambio que ya está aplicado en remoto bajo
  otros nombres de migración (`20260716025944_platform_owner_complete`,
  `20260716030919_drop_redundant_platform_owner_index`). No se tocaron para
  no reescribir historial: quedan como referencia versionada del cambio.


