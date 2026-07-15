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


