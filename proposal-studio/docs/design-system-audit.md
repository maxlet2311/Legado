# Auditoría de Design System — Legado / Proposal Studio™

**Rol:** Design System Architect.
**Alcance:** toda la UI de la aplicación (no incluye el flujo de uso, ya auditado aparte). Se evalúa consistencia, duplicación y sistema de tokens en base al código real.
**Conclusión de una línea:** la base de tokens es sólida y poco frecuente de ver bien hecha (paleta con roles semánticos, tipografía única y disciplinada, escala de movimiento tokenizada) — el problema no es que falte un sistema, es que **partes de la UI no lo usan**, reconstruyendo a mano lo que los primitivos ya resuelven. Y hay una grieta seria: el documento PDF que el cliente final recibe vive en una paleta de color completamente desconectada de la marca que el asesor ve en la app.

---

## 1. Tokens — la base es fuerte

Todo el sistema vive en un único archivo (`globals.css`, bloque `@theme`), no hay `tailwind.config` paralelo ni tokens dispersos. Eso ya es una fortaleza poco común: una sola fuente de verdad.

- **Color:** paleta con roles semánticos estilo Material 3 (primary/secondary/tertiary/error, cada uno con su "container" y su "on-"), más superficies en 6 niveles de profundidad (`surface-dim` → `surface-bright`) y tokens semánticos de estado (`success`/`warning`/`info`). Incluye además dos paletas de marca variante ("Personas" y "Empresas") — señal de que el sistema ya anticipó necesitar identidades distintas por segmento, algo que no se está explotando fuera de branding.
- **Tipografía:** una sola familia (Inter, cargada vía `next/font`) con una escala nombrada de 9 pasos (display → caption), cada uno con su propio line-height y peso. No hay una segunda tipografía "de heading" compitiendo — decisión consistente, sin fragmentación.
- **Radio, sombra y movimiento:** radios en 5 pasos tokenizados; movimiento con una curva de easing única (`ease-premium`) y 3 duraciones (fast/base/slow) reutilizadas de forma consistente en sidebar, botones y stepper. No se encontraron valores de duración arbitrarios sueltos.
- **Sin valores arbitrarios de Tailwind:** cero usos de `bg-[...]`, `text-[...]` o `border-[...]` en toda la UI de la app — toda la utilización pasa por el sistema de tokens o la escala estándar. Esto es una disciplina real, no un accidente.

**La grieta:** ~39 colores hexadecimales hardcodeados fuera del archivo de tokens, y casi todos concentrados en un solo lugar: los componentes que renderizan el **documento PDF** (`src/components/document/*`). Esa carpeta usa su propia paleta completa (`#1B211C`, `#5A6259`, `#F4F1E9`, `#B08A4E`, etc.), sin relación con los tokens `--color-primary`/`--color-secondary` que gobiernan el resto de la app. En la práctica esto significa que **la identidad visual que ve el asesor en la app y la identidad visual que recibe el cliente final en el PDF son dos sistemas de color distintos que hoy coinciden por casualidad, no por diseño** — cualquier cambio de marca futuro (por ejemplo, ajustar el azul primario) requiere tocar dos sistemas desconectados a mano. Un caso menor del mismo problema: el formulario de Mi Marca hardcodea `#596B4D`, `#F6F2E9`, `#C49752` como paleta por defecto — valores que coinciden con los tokens "Personas" pero están reescritos como literales en vez de referenciar el token real, con riesgo de que se desincronicen silenciosamente si el token cambia.

---

## 2. Componentes base (`src/components/ui/`)

14 primitivos, todos con la forma estándar de una librería tipo shadcn, pero recoloreados por completo al sistema de tokens propio (no quedan colores genéricos de plantilla): `Badge`, `Button`, `Card` (+ subcomponentes), `Checkbox`, `Dialog`, `DropdownMenu`, `EmptyState`, `Input`, `Label`, `Select`, `Skeleton`, `Switch`, `Textarea`, `Tooltip`.

**Ausentes por completo hoy:** Table/DataTable, Toast, Tabs, Accordion, Popover, Avatar, Separator, Alert/Banner, RadioGroup, Spinner. Su ausencia no es un problema en sí mismo — es la causa directa de casi todas las duplicaciones descritas abajo.

---

## 3. Duplicación e inconsistencia por concepto

### Badges / estados — ✓ resuelto
Una sola implementación (`Badge`, con 8 variantes mapeadas a los estados reales de una propuesta), reutilizada sin excepción. Nada que corregir.

### Modales — ✓ resuelto
Un solo `Dialog` compartido, usado en los 15 lugares donde existe un modal en la app. Ninguna pantalla construye su propio overlay.

### Breadcrumbs — ✓ resuelto
Un solo componente (`PageHeader`) los produce en todos los casos. No hay markup de breadcrumb duplicado en ninguna pantalla.

### Tablas — ✗ el hueco más grande del sistema
No existe ningún componente `Table` compartido. **11 archivos** construyen su propia tabla desde cero, cada uno con su propio `<table>`, `<thead>` y estilos de fila: Clientes, Dashboard (actividad reciente), y prácticamente toda la sección Admin (auditoría, invitaciones, planes de membresía, membresías, membresía individual, checkouts, eventos de pago). Es la mayor superficie de deriva visual posible en todo el producto — hoy cada tabla puede (y probablemente ya empieza a) verse ligeramente distinta en padding, tipografía de encabezado o comportamiento de hover, sin que nadie lo haya decidido así.

### Botones — parcialmente resuelto, subutilizado
El primitivo `Button` está bien diseñado (4 variantes, tamaño de ícono automático, soporte `asChild`), pero se lo evita en varios lugares: el botón de colapsar sidebar y el de cerrar sesión están hechos con `<button>` crudo con estilos propios, y los controles de paginación/filtro de Clientes y de Membresías (admin) **repiten literalmente la misma cadena de clases** en dos archivos distintos en vez de usar `Button variant="secondary" size="sm"`. Es el ejemplo más claro de "el sistema ya resuelve esto, pero no se está usando".

### Cards / paneles bordeados — parcialmente resuelto
El patrón visual "panel con borde redondeado sobre superficie" (`rounded-xl border border-outline-variant bg-surface`) está perfectamente consistente en todos lados — pero se logra de dos formas distintas: unas pantallas usan el primitivo `Card`, y al menos tres (Dashboard, Clientes, Membresías admin) reconstruyen exactamente el mismo resultado con un `div` a mano. El resultado visual hoy es idéntico, pero es casualidad, no garantía: cualquier ajuste futuro al primitivo `Card` (por ejemplo, cambiar el padding interno) no se reflejará en esos tres lugares a menos que alguien recuerde actualizarlos a mano también.

### Loaders / spinners — sin abstraer
No hay duplicación de *concepto* (siempre es el mismo ícono `Loader2` + `animate-spin`), pero sí de *implementación*: se repite igual, en línea, en **37 lugares** distintos en vez de existir como un componente `Spinner`. El costo no es visual hoy — es de mantenimiento: cambiar el color o el tamaño por defecto del loader de la app implica tocar 37 archivos uno por uno.

### Estados vacíos — dos sistemas paralelos
El componente `EmptyState` (ícono + título + descripción + acción) está bien resuelto y se usa en 13 lugares a nivel de página/listado. Pero en paralelo existen ~15 mensajes de "no hay datos" hechos a mano con texto plano, sin ícono ni estructura — en pasos del wizard, en el detalle de propuesta, en varios paneles de admin. No es que falte un componente: es que conviven dos patrones distintos para la misma idea, uno formal y uno improvisado.

### Skeletons — no es duplicación, es cobertura baja
El primitivo `Skeleton` existe y es correcto, pero solo se usa en 4 rutas (`branding`, `clients`, `dashboard`, `proposal/[id]`) que tienen `loading.tsx`. El resto del producto no tiene ningún estado de carga intermedio — no es un problema de consistencia visual, es una ausencia total en la mayoría de las pantallas.

---

## 4. Chrome de layout (sidebar, header, breadcrumbs, footer, toolbar)

- **Sidebar y barra superior:** ambos completamente tokenizados, sin un solo valor hardcodeado — el estándar más alto de todo el inventario.
- **Breadcrumbs:** resuelto, ver arriba.
- **Footer:** no existe un footer del shell de la aplicación (razonable para un SaaS logueado). El único "footer" en el código pertenece al documento PDF y es un concepto completamente distinto — vale aclararlo para que no se confunda como un hueco real.
- **Toolbar:** no existe como abstracción genérica. Hoy hay dos soluciones puntuales para necesidades parecidas — el slot de acciones de `PageHeader` y el pie de navegación del wizard — que funcionan bien para lo que cubren hoy, pero no van a escalar solos si el roadmap comercial agrega vistas más ricas (pipeline, agenda) que necesiten una barra de acciones más completa.

---

## 5. Iconografía

Una sola librería (`lucide-react`), usada de forma consistente en tamaño para contextos iguales (`h-4 w-4` domina, 130+ usos, reforzado porque el propio `Button` auto-dimensiona sus íconos). El punto flojo es que no hay una escala de tamaños documentada ni un wrapper: íconos de navegación de la sidebar (`h-5 w-5`) y los íconos de las tarjetas de acceso rápido del dashboard (`h-6 w-6`) divergen sin que exista una regla explícita que diga cuándo corresponde cada uno — hoy es criterio de quien escribió ese componente puntual, no una decisión de sistema.

---

## 6. Animación y microinteracciones

El punto mejor resuelto del sistema completo, junto con los tokens de color. Todo el movimiento pasa por las 3 duraciones y la única curva de easing tokenizadas — cero valores arbitrarios de duración encontrados. La única microinteracción repetida por fuera del sistema de tokens es `active:scale-[0.98]` en los 4 variantes de `Button` y en el CTA de la sidebar: el valor es consistente cada vez que aparece, pero al ser un valor arbitrario de Tailwind en vez de un token, no está protegido de que alguien lo escriba distinto (`0.97`, `0.99`) en un componente nuevo.

---

## 7. Espaciado

El tratamiento exterior de los paneles (`rounded-xl border border-outline-variant bg-surface`) es consistente en todos los casos, incluso en las implementaciones hand-rolled — eso ya funciona como un token no declarado. Donde sí hay divergencia real es en el padding: los componentes que usan `Card` heredan automáticamente `p-8`; los paneles hechos a mano a veces repiten ese mismo `p-8` explícitamente y otras veces lo omiten por completo, apoyándose en el padding interno de sus celdas — dos formas distintas de llegar a un resultado parecido pero no idéntico, dependiendo de quién construyó esa pantalla.

---

## Clasificación de componentes

### Componentes existentes (sólidos, no tocar)
`Badge`, `Dialog`, `DropdownMenu`, `Select`, `Checkbox`, `Switch`, `Input`, `Textarea`, `Label`, `Tooltip`, `Sidebar`, `TopNavigation`, `PageHeader`/Breadcrumbs, el sistema de tokens de color/tipografía/radio/movimiento para la UI de la app.

### Componentes a unificar (el concepto ya existe dos veces, elegir uno y migrar)
| Concepto | Estado actual | Acción |
|---|---|---|
| Tablas | 11 implementaciones manuales independientes | Construir un `Table`/`DataTable` único y migrar las 11 pantallas |
| Paneles bordeados | `Card` + 3 lugares con divs manuales idénticos | Migrar Dashboard, Clientes y Membresías admin a `Card` |
| Botones | `Button` + botones crudos repetidos (sidebar, paginación) | Migrar toggle/logout de sidebar y controles de paginación a `Button` |
| Estados vacíos | `EmptyState` (formal) + ~15 mensajes de texto plano | Crear una variante compacta/inline de `EmptyState` y migrar los 15 casos |
| Loaders | Mismo patrón repetido 37 veces sin componente | Extraer `Spinner` (wrap de `Loader2` + tamaño configurable) |
| Iconografía | Tamaños ad hoc por contexto sin regla | Documentar una escala oficial (xs/sm/md/lg) y aplicarla donde hoy diverge sin razón |

### Componentes a eliminar
- Las clases de botón repetidas como string literal copiado en `clients` y `admin/memberships` — no son un componente, son duplicación de código que debe desaparecer al migrar a `Button`.
- Los valores hex hardcodeados en el formulario de Mi Marca que ya existen como token — eliminar el literal, referenciar el token.
- No se detectó ningún componente redundante dentro de `ui/` que deba eliminarse — el inventario de primitivos es limpio; el problema nunca es "sobran componentes", es que se los subutiliza fuera de `ui/`.

### Componentes nuevos (no existen hoy)
| Componente | Por qué falta |
|---|---|
| `Table`/`DataTable` | La brecha más grande y de mayor reutilización — 11 pantallas lo necesitan hoy mismo |
| `Spinner` | Extracción directa de un patrón ya usado 37 veces |
| `Alert`/`Banner` | Los mensajes de error/éxito persistentes (login, activación, Mi Marca) hoy se arman a mano cada uno con su propio div coloreado |
| `Toast` | No existe ningún sistema de notificación transitoria — el único feedback de éxito hoy es un banner que queda pegado en pantalla |
| `Avatar` | El círculo de iniciales del usuario en la barra superior está hardcodeado ahí en vez de ser reusable |
| `Icon` (wrapper con escala) | Formaliza la escala de tamaños que hoy es implícita e inconsistente |
| `Tabs` | No existe todavía; se vuelve necesario si el wizard adopta fases o si Admin agrupa sub-vistas |
| `Toolbar` genérico | Hoy resuelto puntualmente por `PageHeader` y el pie del wizard; no va a escalar solo si el producto crece hacia pipeline/agenda |

---

## Backlog priorizado (impacto visual + reutilización)

### P0 — Mayor riesgo de deriva visual, mayor reutilización inmediata

| # | Acción | Por qué es P0 |
|---|---|---|
| 1 | Construir `Table`/`DataTable` y migrar las 11 tablas manuales | Es el mayor riesgo de inconsistencia visual del producto y el componente con más reutilización posible |
| 2 | Extraer `Spinner` y reemplazar las 37 repeticiones inline | Costo de construcción mínimo, beneficio de mantenimiento inmediato en todo el producto |
| 3 | Migrar Dashboard, Clientes y Membresías admin a `Card` en vez de divs manuales | Cierra la brecha entre "se ve igual por casualidad" y "es el mismo componente" |
| 4 | Reemplazar los botones crudos y las clases repetidas por `Button` | Elimina copy-paste de estilos y consolida el punto de control de todos los botones |
| 5 | Reconectar (o formalizar como sistema propio, pero explícito) la paleta del documento PDF con los tokens de marca reales | Es la única inconsistencia con riesgo real de negocio: la marca que ve el asesor y la que recibe el cliente final hoy son dos sistemas de color desconectados |

### P1 — Cierra huecos de consistencia con impacto medio

| # | Acción | Impacto esperado |
|---|---|---|
| 6 | Crear la variante compacta de `EmptyState` y migrar los ~15 mensajes sueltos | Un solo lenguaje visual para "no hay datos" en todo el producto |
| 7 | Construir `Alert`/`Banner` y migrar los mensajes de error/éxito hand-rolled | Consistencia en el feedback crítico de formularios y flujos de autenticación |
| 8 | Documentar la escala oficial de tamaños de ícono y corregir las divergencias existentes | Resuelve la inconsistencia entre íconos de navegación y de tarjetas |
| 9 | Reemplazar los hex hardcodeados de Mi Marca por referencias reales a los tokens | Elimina el riesgo de desincronización silenciosa entre token y literal |

### P2 — Prepara el sistema para el crecimiento del producto

| # | Acción | Impacto esperado |
|---|---|---|
| 10 | Construir `Toast` para feedback transitorio | Mejora sobre el patrón actual de banners persistentes, no urgente |
| 11 | Construir `Avatar` reutilizable | Bajo impacto hoy, relevante en cuanto se muestren más usuarios en la UI (equipos, asignaciones) |
| 12 | Construir `Tabs` | Sin necesidad urgente hoy; necesario si el editor o Admin crecen en complejidad |
| 13 | Diseñar un `Toolbar` genérico | Anticipa las necesidades del roadmap comercial (pipeline, agenda) antes de que se vuelvan urgentes |

---

## Lectura final

Este no es un sistema de diseño débil que necesite reconstruirse — es un sistema de diseño bien fundado que no se está aplicando con disciplina pareja en todas las pantallas. La prioridad no es "crear un design system": ya existe uno, y es bueno. La prioridad es terminar de imponerlo donde hoy se lo está reinventando a mano, y resolver la única grieta real de identidad de marca: que el documento que finalmente ve el cliente no comparte los mismos tokens que la aplicación que usa el asesor.
