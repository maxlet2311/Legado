# DESIGN_CONSOLIDATION_REPORT.md

**Proposal Studio™ — Consolidación del Design Source of Truth**
Fecha: 2026-07-15 · Alcance: `/stitch-export/stitch_premium_proposal_engine` (25 carpetas)

**Estado: EJECUTADO Y LIMPIADO.** Se crearon las 10 carpetas definitivas (`dashboard/`, `login/`, `library/`, `branding/`, `wizard-steps-1-2/`, `wizard-steps-3-4/`, `wizard-steps-5-7/`, `preview/`, `onboarding/`, `client-view/`) con el código ganador copiado y las 3 fusiones + la corrección de idioma aplicadas (ver checklist al final). **Las 25 carpetas originales fueron eliminadas** tras confirmar la consolidación. Se conservaron los 4 folders de assets no-pantalla (`a_set_of_6_premium_minimalist_line_art_icons_...`, las 3 `premium_editorial_photography_*`, `shader`, `proportional_precision`) como referencia visual para el desarrollo. `stitch-export/stitch_premium_proposal_engine/` contiene ahora únicamente las 10 carpetas consolidadas + los assets de referencia.

Metodología: se leyó el `code.html` completo de cada carpeta (no solo el nombre) y se comparó idioma, completitud de copy, branding, número de secciones/funcionalidades, consistencia con el resto del set, y calidad de la interacción (scripts, microinteracciones). Los tokens de Tailwind (paleta, tipografía, spacing) son **idénticos byte a byte** en las 25 carpetas, así que nunca fueron criterio de desempate.

---

## 1. Agrupación de pantallas

| Grupo | Carpetas originales |
|---|---|
| Dashboard | `dashboard_legado`, `dashboard_proposal_engine_1`, `dashboard_proposal_engine_2` |
| Login | `login_legado`, `login_proposal_engine_1`, `login_proposal_engine_2`, `proposal_engine_advisor_platform` |
| Biblioteca | `biblioteca_legado`, `biblioteca_proposal_engine_1`, `biblioteca_proposal_engine_2` |
| Mi Marca | `mi_marca_legado`, `mi_marca_proposal_engine` |
| Wizard — Pasos 1-2 | `nueva_propuesta_paso_1_y_2_1`, `nueva_propuesta_paso_1_y_2_2` |
| Wizard — Pasos 3-4 | `nueva_propuesta_paso_3_y_4_1`, `nueva_propuesta_paso_3_y_4_2` |
| Wizard — Pasos 5-7 | `nueva_propuesta_paso_5_6_y_7_1`, `nueva_propuesta_paso_5_6_y_7_2` |
| Vista Previa Final | `nueva_propuesta_vista_previa_final` (única versión) |
| Onboarding | `nuevo_comienzo_objetivos_del_cliente`, `onboarding_objetivos_del_cliente` |
| Vista Cliente | `propuesta_premium_vista_cliente_legado`, `propuesta_premium_vista_cliente_1`, `propuesta_premium_vista_cliente_2` |

No son pantallas de producto (excluidas de la consolidación, se mantienen como assets/experimentos de referencia):
`a_set_of_6_premium_minimalist_line_art_icons_...`, `premium_editorial_photography_*` (x3), `proportional_precision` (solo `DESIGN.md`), `shader` (demo WebGL suelto).

---

## 2. Tabla de decisión

### Dashboard
```
dashboard_legado / dashboard_proposal_engine_1 / dashboard_proposal_engine_2
                              ↓
                  dashboard_proposal_engine_2   ← SELECCIONADA
                              ↓
Motivo: es la única con branding correcto y consistente ("Proposal Engine™",
no "Legado™") y sin residuos de inglés (alt de imagen, "Asesor Premium"
vs "Advisor Premium" en _1). Estructura idéntica a _1 y a legado
(hero + bento 4 accesos + tabla de actividad reciente).
                              ↓
Descartadas: dashboard_legado, dashboard_proposal_engine_1
```
**⚠️ Señalado para fusión (no descartar sin revisar):** `dashboard_legado` tiene un hero personalizado y superior — saluda por nombre ("Buenos días, Ariel") y resume el estado real del asesor ("12 propuestas activas, 4 clientes esperando respuesta, 2 seguimientos pendientes, 1 propuesta lista para enviar"). Las versiones `proposal_engine_1/2` seleccionadas usan en cambio un hero genérico de marketing ("Potencia tus propuestas de seguros"). El patrón de `legado` es una mejor solución de UX (dashboard accionable vs. banner publicitario) y conviene fusionarlo sobre la base de `proposal_engine_2` antes de congelar la referencia.

### Login
```
login_legado / login_proposal_engine_1 / login_proposal_engine_2 / proposal_engine_advisor_platform
                              ↓
                    login_proposal_engine_2   ← SELECCIONADA
                              ↓
Motivo: única versión con idioma español completo (incluye el texto del
panel flotante editorial) y branding correcto "Proposal Engine™".
login_legado usa branding "Legado™"; login_proposal_engine_1 está
enteramente en inglés.
                              ↓
Descartadas: login_legado, login_proposal_engine_1, proposal_engine_advisor_platform
```
**Nota:** `proposal_engine_advisor_platform` no es una variante distinta — su `code.html` es **idéntico** (byte a byte en el contenido visible) a `login_proposal_engine_1`. Es un duplicado exacto mal nombrado, no una cuarta iteración.

### Biblioteca
```
biblioteca_legado / biblioteca_proposal_engine_1 / biblioteca_proposal_engine_2
                              ↓
                  biblioteca_proposal_engine_2   ← SELECCIONADA
                              ↓
Motivo: español completo + branding correcto. Además introduce un modelo
de filtrado más rico: facetas separadas "Segmento" (checkboxes
Individuos/Empresas) + "Categoría" (botones con contador), contra el
filtro de una sola lista que usa legado.
                              ↓
Descartadas: biblioteca_legado, biblioteca_proposal_engine_1
```
**⚠️ Señalado para fusión:** `biblioteca_legado` tiene una sección **"Favoritos"** (3 tarjetas destacadas con ícono de estrella: "Propuesta de Vida Universal", "Calculadora de Brecha", "Acuerdo de Socios") que **no existe** en `proposal_engine_1/2`. Es una funcionalidad real (acceso rápido a lo más usado), no solo un cambio visual. Debe evaluarse si se reincorpora sobre la base de `proposal_engine_2` antes de congelar la referencia.

### Mi Marca
```
mi_marca_legado / mi_marca_proposal_engine
                              ↓
                  mi_marca_proposal_engine   ← SELECCIONADA
                              ↓
Motivo: el título de la página ("Mi Marca") es consistente con la
etiqueta de navegación del sidebar ("Marca"); legado usa "Identidad de
Marca", que no coincide con su propia etiqueta de nav ("Identidad").
Contenido y estructura del formulario, por lo demás, son idénticos.
                              ↓
Descartada: mi_marca_legado
```
**⚠️ Señalado para fusión — importante:** `mi_marca_legado` incluye una sección completa que **falta en la versión seleccionada**: **"Configuración del Pie de Página"**, con disclaimer legal/regulatorio, URL de LinkedIn y sitio web. Esta información es relevante para el motor de PDF (pie de página de las propuestas, ver `docs/06_PDF_ENGINE.md`) y no debería perderse solo por elegir la versión con mejor naming. Recomendación: fusionar esa sección de `legado` dentro de `mi_marca_proposal_engine` antes de congelar.

### Wizard — Pasos 1 y 2
```
nueva_propuesta_paso_1_y_2_1 / nueva_propuesta_paso_1_y_2_2
                              ↓
                  nueva_propuesta_paso_1_y_2_2   ← SELECCIONADA
                              ↓
Motivo: _1 mezcla idiomas (nav "Drafts/Client Activity" en inglés,
contenido en español, "Alexander Vance (Premium Advisor)"); _2 corrige
la traducción por completo (nav, botón "Siguiente Paso", "Asesor
Premium"). Layout y lógica de selección de tarjetas idénticos.
                              ↓
Descartada: nueva_propuesta_paso_1_y_2_1
```

### Wizard — Pasos 3 y 4
```
nueva_propuesta_paso_3_y_4_1 / nueva_propuesta_paso_3_y_4_2
                              ↓
                  nueva_propuesta_paso_3_y_4_2   ← SELECCIONADA
                              ↓
Motivo: _1 está enteramente en inglés; _2 es la traducción completa y
fiel (stepper, tabla de alternativas financieras, tabla de beneficios).
Sin diferencias funcionales entre ambas más allá del idioma.
                              ↓
Descartada: nueva_propuesta_paso_3_y_4_1
```

### Wizard — Pasos 5, 6 y 7
```
nueva_propuesta_paso_5_6_y_7_1 / nueva_propuesta_paso_5_6_y_7_2
                              ↓
                  nueva_propuesta_paso_5_6_y_7_2   ← SELECCIONADA
                              ↓
Motivo: mismo patrón — _1 en inglés, _2 traducción completa (editor de
estrategia, tabla comparativa, configuración de CTA/WhatsApp). Sin
diferencias funcionales.
                              ↓
Descartada: nueva_propuesta_paso_5_6_y_7_1
```

### Vista Previa Final
```
nueva_propuesta_vista_previa_final (única versión)
                              ↓
                  nueva_propuesta_vista_previa_final   ← SELECCIONADA (sin alternativa)
```
**⚠️ Señalado — no es un problema de versión, es un defecto a corregir:** esta pantalla mezcla idiomas dentro de sí misma: el sidebar/topbar están en inglés ("Dashboard", "Library", "Brand", "Settings", "New Proposal", "Search proposals...", "Drafts", "Client Activity") mientras el documento simulado está en español ("Planificación de Patrimonio", "Resumen Ejecutivo"), y el pie de página del documento dice "CONFIDENCIAL — PROPOSAL ENGINE CONSULTING GROUP" (mixto). Como es la única versión, no hay nada que descartar, pero debe corregirse el idioma del shell antes de tomarla como referencia definitiva.

### Onboarding
```
nuevo_comienzo_objetivos_del_cliente / onboarding_objetivos_del_cliente
                              ↓
                  onboarding_objetivos_del_cliente   ← SELECCIONADA
                              ↓
Motivo: pese a que el nombre no lleva sufijo de versión, el contenido
es claramente más evolucionado — íconos ilustrados propios (sprite
image) en vez de Material Symbols genéricos, overlay de transición con
fondo shader WebGL animado (vs. overlay estático oscuro en la otra),
tarjetas más grandes (rounded-2xl, p-10) y un botón de acción primaria
"Continuar con Selección" que nuevo_comienzo no tiene.
                              ↓
Descartada: nuevo_comienzo_objetivos_del_cliente
```
Este es el caso explícito que pediste vigilar: **el nombre no indica versión, pero el contenido sí prueba cuál es la iteración posterior.**

### Vista Cliente
```
propuesta_premium_vista_cliente_legado / _1 / _2
                              ↓
                  propuesta_premium_vista_cliente_2   ← SELECCIONADA
                              ↓
Motivo: español completo (traducción fiel de _1) + conserva las mejoras
de _1 sobre legado: microinteracción de hover en filas de tabla,
fotografía editorial más refinada (tratamiento grayscale/brightness) y
copy más preciso ("240 puntos básicos" vs. genérico en legado).
                              ↓
Descartadas: propuesta_premium_vista_cliente_legado, propuesta_premium_vista_cliente_1
```

---

## 3. Estructura de carpetas propuesta (para cuando se apruebe)

```
stitch-export/stitch_premium_proposal_engine/
├── dashboard/           ← ex dashboard_proposal_engine_2 (+ fusión hero de legado)
├── login/               ← ex login_proposal_engine_2
├── library/             ← ex biblioteca_proposal_engine_2 (+ fusión sección Favoritos de legado)
├── branding/             ← ex mi_marca_proposal_engine (+ fusión pie de página de legado)
├── wizard-steps-1-2/    ← ex nueva_propuesta_paso_1_y_2_2
├── wizard-steps-3-4/    ← ex nueva_propuesta_paso_3_y_4_2
├── wizard-steps-5-7/    ← ex nueva_propuesta_paso_5_6_y_7_2
├── preview/             ← ex nueva_propuesta_vista_previa_final (+ corrección de idioma del shell)
├── onboarding/          ← ex onboarding_objetivos_del_cliente
├── client-view/         ← ex propuesta_premium_vista_cliente_2
└── _assets/             ← iconos, fotografías editoriales, shader, proportional_precision (sin cambios)
```

Ningún nombre lleva `_1`, `_2`, `_legado`, `_final` ni `_v2`, según lo pedido.

---

## 4. Checklist de ejecución (completado 2026-07-15)

- [x] `dashboard/` — copiado desde `dashboard_proposal_engine_2` + hero fusionado desde `dashboard_legado` (saludo personalizado y resumen de actividad; se mantuvo el texto de botón "Nueva Propuesta" para no romper consistencia con el resto de la app en vez de "Nueva Propuesta de Protección").
- [x] `login/` — copiado desde `login_proposal_engine_2`, sin cambios adicionales.
- [x] `library/` — copiado desde `biblioteca_proposal_engine_2` + sección "Favoritos" fusionada desde `biblioteca_legado`, insertada antes de la grilla principal de categorías.
- [x] `branding/` — copiado desde `mi_marca_proposal_engine` + sección "Configuración del Pie de Página" (disclaimer legal, LinkedIn, sitio web) fusionada desde `mi_marca_legado`, insertada antes del botón "Guardar Cambios".
- [x] `wizard-steps-1-2/`, `wizard-steps-3-4/`, `wizard-steps-5-7/` — copiados desde las versiones `_2` de cada paso, sin cambios adicionales.
- [x] `preview/` — copiado desde `nueva_propuesta_vista_previa_final` + corrección de idioma: sidebar y topbar traducidos al español ("Panel de Control", "Biblioteca", "Marca", "Configuración", "Nueva Propuesta", "Soporte", "Cerrar Sesión", "Buscar propuestas...", "Borradores", "Actividad del Cliente", "Paso 8", "Modo Vista Previa"). El nombre de marca del pie de documento ("Proposal Engine Consulting Group") se dejó igual por ser un nombre propio ficticio del cliente, no una etiqueta de UI.
- [x] `onboarding/` — copiado desde `onboarding_objetivos_del_cliente`, sin cambios adicionales.
- [x] `client-view/` — copiado desde `propuesta_premium_vista_cliente_2`, sin cambios adicionales.
- [x] Verificadas y **eliminadas** las 25 carpetas originales de pantallas (duplicadas/obsoletas). Se conservaron los 4 folders de assets no-pantalla como referencia.

---

*Fin del informe. `stitch-export/stitch_premium_proposal_engine/` contiene ahora solo las 10 carpetas consolidadas (referencia visual oficial) más 4 folders de assets de referencia. El desarrollo puede iniciar sobre esta base.*
