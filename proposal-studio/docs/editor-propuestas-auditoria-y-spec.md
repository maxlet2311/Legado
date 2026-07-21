# El editor de propuestas — auditoría del estado actual y especificación del editor ideal

**Alcance:** exclusivamente la experiencia de edición (`/proposal/[id]/edit`, los 8 pasos del wizard, autosave, versionado). Se ignora deliberadamente el resto del producto (dashboard, clientes, membresía, etc.).
**Método:** lectura completa del código del wizard (steps, schemas, store, hooks de autosave, migración de emisión de versiones). Todos los datos cuantitativos (límites de caracteres, cantidad de pasos, mecanismos) están verificados contra el código, no estimados.

---

## Parte 1 — Diagnóstico del editor actual

### Flujo y orden

8 pasos, estrictamente secuenciales: Cliente → Información → Diagnóstico → Alternativas → Recomendación → Beneficios → Comparativa → Resumen. El orden en sí es correcto — replica la secuencia real de una venta consultiva. El problema no es el orden, es la **rigidez**: la navegación solo avanza o retrocede un paso a la vez con los botones del pie; el stepper de arriba muestra los 8 nombres pero **no son clickeables** — no se puede saltar directo a "Beneficios" desde "Cliente". La única forma de saltar es llegar hasta el final (Resumen) y usar el botón "Editar" de cada tarjeta, que ahí sí salta libre y sin validar. Es decir: el editor tiene navegación libre, pero solo la habilita en la última pantalla.

### Cantidad de pasos y campos

8 pasos es razonable como cantidad, pero mezcla tres naturalezas distintas sin distinguirlas visualmente: pasos administrativos (Cliente, Información), pasos de contenido narrativo (Diagnóstico, Recomendación), pasos de contenido estructurado repetible (Alternativas, Beneficios, Comparativa) y un paso de cierre (Resumen). Hoy los 8 se presentan como una lista plana de igual peso, cuando en esfuerzo real no lo son.

Campos por paso, con sus límites reales:
- **Diagnóstico:** 5 textareas libres, hasta 8.000 caracteres cada una (situación actual, necesidades, objetivos, riesgos, oportunidades). Solo "situación actual" es obligatorio.
- **Alternativas** (repetible): 11 campos por ítem, incluyendo ventajas/desventajas que se cargan como texto libre "una por línea" separado por salto de línea — no como una lista real con su propio control de agregar/quitar.
- **Beneficios** (repetible): 4 campos por ítem, con un campo de **ícono como texto libre** (nombre de un ícono de una librería técnica) sin selector visual — un asesor no tiene forma de saber qué nombres son válidos ni de ver el ícono resultante hasta generar el PDF.
- **Comparativa:** tabla dinámica de columnas × filas, hasta 12 columnas y 50 filas, sin ningún indicador visual de cuánto falta para llegar al límite.

### Validaciones

Bien resuelto en lo esencial: "Siguiente" solo se bloquea por los campos mínimos de cada paso (cliente elegido, título y producto cargados, situación actual y estrategia recomendada no vacías); Alternativas, Beneficios y Comparativa nunca bloquean el avance, lo cual es correcto para contenido opcional/repetible. Lo que falta es **retroalimentación agregada**: no hay ningún indicador de "cuánto de la propuesta está completo" hasta llegar al Resumen final — el usuario no sabe si le faltan 2 o 15 minutos de trabajo.

### Scroll

Es el problema ergonómico más serio del editor actual. Diagnóstico ya son ~30 filas visuales de texto apiladas. Pero Alternativas y Beneficios son el caso grave: **cada ítem agregado se muestra siempre completamente expandido**, con las 11 (o 4) filas de campos visibles todo el tiempo — no hay forma de colapsar un ítem ya cargado. Un asesor con 5 alternativas para comparar se enfrenta a un scroll de decenas de pantallas para llegar a la última, y para editar la primera después de cargar la quinta tiene que volver a scrollear todo hacia arriba.

### Repeticiones (contenido que se repite)

No existe ningún mecanismo de reutilización: no se puede duplicar un ítem de Alternativas o Beneficios dentro de la misma propuesta (la única acción disponible es borrar), no se puede duplicar una propuesta completa como punto de partida de otra, y no hay plantillas. Para dos clientes con necesidades parecidas, el asesor redacta las mismas alternativas y beneficios desde cero cada vez.

### Tiempo

No hay ningún indicador de progreso real (más allá de en qué paso está parado), ni estimación de tiempo restante, ni distinción entre pasos rápidos (Cliente: un clic) y pasos largos (Alternativas: pueden ser 15-20 minutos reales). El costo de tiempo se concentra silenciosamente en Diagnóstico, Alternativas y Comparativa sin que el producto lo reconozca en ningún lado.

### Ergonomía de reordenamiento

No hay drag and drop en ningún punto del editor. Alternativas y Beneficios se reordenan con botones de flecha arriba/abajo, uno por uno — mover un ítem del final al principio de una lista de 6 requiere 5 clics. La tabla de Comparativa es peor: **no tiene ningún mecanismo de reordenamiento**, ni de columnas ni de filas — el orden es exclusivamente el orden en que se agregaron, y si el asesor se equivoca de orden tiene que borrar y volver a cargar.

### Edición posterior

El modelo de datos es correcto (la propuesta editable y las versiones emitidas son independientes, se puede seguir editando el borrador después de emitir una versión sin afectar lo ya emitido), pero la ergonomía de volver a editar algo puntual hereda el mismo problema de navegación: si el asesor ya terminó y quiere corregir un dato en Diagnóstico, tiene que ir hasta Resumen y usar "Editar" ahí, o retroceder paso por paso.

### Duplicación

Confirmado: no existe en ningún nivel — ni de propuesta completa, ni de plantilla, ni de ítem individual (alternativa/beneficio). Es la ausencia más costosa en tiempo real del editor actual.

### Versionado

Es, con diferencia, la parte mejor construida del sistema actual: emitir una versión genera una copia inmutable completa con checksum, y no se genera una versión nueva si no hubo cambios reales desde la última (deduplicación automática). Soporta múltiples versiones por propuesta correctamente. Lo que falta es **visibilidad entre versiones**: no hay ninguna forma de comparar la versión 2 contra la versión 1 y ver qué cambió, ni de recuperar una versión anterior como punto de partida de un nuevo borrador — el flujo es de una sola dirección (borrador → versión emitida), nunca al revés.

### Comparación (tabla comparativa)

Funcionalmente completa pero rudimentaria: celdas de texto plano sin tipos (no distingue un valor numérico de una marca de check), sin reordenamiento como ya se mencionó, sin duplicar fila/columna, sin ningún tipo de resaltado automático (por ejemplo, marcar la opción recomendada dentro de la propia tabla).

### Recomendación

Un solo textarea de hasta 8.000 caracteres, sin ningún tipo de formato (no hay negrita, listas ni párrafos estructurados) pese a que el nombre del componente subyacente es "RichTextarea" — en la práctica es texto plano con contador de caracteres, no edición enriquecida real.

### Beneficios

Ya señalado en campos: el selector de ícono como texto libre es el punto más frágil de esta sección — es el único campo de todo el editor donde un error de tipeo no se detecta hasta ver el documento final.

### Narrativa (Diagnóstico + Recomendación)

Consistente entre sí (mismo componente, mismo límite de 8.000 caracteres, mismo contador en vivo), lo cual es una fortaleza de consistencia interna. La debilidad es la ya mencionada falta de formato real.

### Autosave (fortaleza a preservar)

Merece mención aparte porque está genuinamente bien resuelto: guardado automático con demora de 2 segundos tras cada cambio, guardado forzado inmediato al cambiar de paso, y control de concurrencia optimista real por revisión numérica (no hay guardados que se pisen silenciosamente entre dos sesiones). El único hueco es que, ante un conflicto ("se modificó en otra sesión"), el usuario elige a ciegas entre quedarse con su versión o descartarla, sin ver qué cambió en la otra.

### Deshacer / rehacer y atajos de teclado

Confirmado por código: **no existe ningún mecanismo de deshacer/rehacer ni ningún atajo de teclado en todo el editor.** Para un editor que aspira a ser "extremadamente rápido", es la ausencia más importante de todas.

---

## Parte 2 — Principios para el editor ideal

La inspiración no es visual, es de **mecánica de interacción**. De cada referencia se toma el principio subyacente, no la interfaz:

- **De Notion:** el documento es una colección de bloques ordenables, no una secuencia de pantallas fijas. Cualquier bloque se puede mover, duplicar, colapsar u ocultar sin salir del documento.
- **De Pitch/Gamma:** el panel de estructura (outline) y el contenido conviven siempre visibles — no hay una pantalla de "resumen" separada al final; el resumen es simplemente el documento colapsado.
- **De Figma:** los bloques reutilizables funcionan como componentes con instancias — un beneficio o una alternativa "reutilizable" se define una vez y se reusa con la posibilidad de personalizarlo por propuesta sin romper el original.
- **De Framer/Canva:** todo lo visible en pantalla se edita en el lugar donde está (edición inline real), y drag and drop es el mecanismo por defecto para reordenar, no una alternativa a botones de flecha.
- **De todos ellos en conjunto:** autosave silencioso + deshacer instantáneo elimina la necesidad de "guardar" como concepto — el usuario nunca piensa en si su trabajo está a salvo.

El editor actual de Legado ya tiene el dato más difícil de acertar (el orden correcto del contenido de una venta consultiva) y el mecanismo más difícil de construir bien (autosave con control de concurrencia real). Lo que falta es la capa de velocidad y confianza encima de eso — no rehacer lo que ya funciona.

---

## Parte 3 — Especificación funcional del editor futuro

### 3.1 Modelo de documento (reemplaza el modelo de "pasos")

La propuesta deja de ser una secuencia de 8 pantallas y pasa a ser **un documento único compuesto por bloques**, agrupados en tres fases visualmente distintas pero siempre navegables sin restricción:

- **Fase Configuración** (Cliente, Información) — metadatos, no bloques de contenido.
- **Fase Redacción** (Diagnóstico, Alternativas, Recomendación, Beneficios, Comparativa) — bloques de contenido, cada uno independiente.
- **Fase Cierre** — ya no es una pantalla aparte: es la vista colapsada/resumen del mismo documento, siempre disponible con un clic, no un destino final obligatorio.

Un panel lateral persistente (outline) muestra las 3 fases y sus bloques como una lista siempre visible y **clickeable** — se puede saltar a cualquier bloque en cualquier momento, sin pasar por los anteriores. La barra de progreso dejar de ser un adorno y pasa a reflejar bloques completos vs. totales en tiempo real.

### 3.2 Edición inline

Cada bloque se edita directamente donde se muestra, sin diálogos modales ni paneles separados (excepto la creación de un cliente nuevo, que por su naturaleza transaccional puede seguir siendo un diálogo corto). Los campos de texto narrativo (Diagnóstico, Recomendación) incorporan formato mínimo real: negrita, listas y párrafos — no solo texto plano con contador de caracteres.

### 3.3 Bloques colapsables (resuelve el problema de scroll)

Todo ítem repetible (una alternativa, un beneficio) tiene dos estados: **colapsado** (una línea con título, dato clave y acciones rápidas) y **expandido** (todos los campos, como hoy). Por defecto, el ítem que se está editando está expandido y el resto colapsado — así una propuesta con 6 alternativas se navega como una lista corta, no como un scroll de pantallas completas.

### 3.4 Drag and drop real

Reemplaza los botones de flecha arriba/abajo en Alternativas y Beneficios, y agrega por primera vez reordenamiento a la tabla Comparativa (arrastrar una fila o columna entera). El arrastre funciona tanto con mouse como con teclado (accesibilidad), y el reordenamiento se refleja en la vista previa en tiempo real mientras se arrastra, no solo al soltar.

### 3.5 Ocultar bloques sin borrarlos

Un ítem de Alternativas, Beneficios o incluso una sección completa (por ejemplo, Comparativa si esa propuesta no la necesita) se puede **ocultar del documento final sin eliminarlo del borrador** — útil cuando el asesor no está seguro de incluir algo y no quiere perder el trabajo ya hecho redactándolo. Un bloque oculto se muestra atenuado en el outline con un indicador claro de "no incluido en el PDF".

### 3.6 Duplicar (el hueco más costoso del editor actual)

Tres niveles de duplicación, todos ausentes hoy:
- **Duplicar un ítem** (una alternativa o un beneficio) dentro de la misma propuesta — para variantes del mismo producto con pequeños cambios.
- **Duplicar una propuesta completa** como punto de partida de una nueva, para clientes con necesidades similares.
- **Duplicar una versión emitida** de vuelta a un borrador editable — hoy el flujo es de una sola dirección; esto permite retomar una propuesta ya enviada como base de una revisión, sin perder el historial de lo que se envió antes.

### 3.7 Bloques reutilizables (componentes)

Un beneficio o una alternativa se puede marcar como **reutilizable**: queda disponible en una biblioteca personal del asesor (la sección Biblioteca del producto, hoy vacía, es el lugar natural para esto) y se puede insertar en cualquier propuesta futura con un clic. Insertar una instancia reutilizable no la vuelve "de solo lectura" — se puede personalizar libremente por propuesta sin alterar el original de la biblioteca, igual que un componente con instancias editables.

### 3.8 Plantillas

Una propuesta completa (o un conjunto de bloques) se puede guardar como **plantilla** por tipo de producto o segmento de cliente. Crear una propuesta nueva ofrece elegir entre "en blanco" o "desde plantilla", precargando Diagnóstico, Alternativas y Beneficios típicos del producto elegido, dejando solo lo específico del cliente para completar.

### 3.9 Preview en tiempo real

El editor incorpora una vista previa del documento real (lo que hoy solo existe después de emitir una versión, en una ruta separada) visible **mientras se edita**, no como un paso posterior. Layout de dos columnas: bloques a la izquierda, documento renderizado a la derecha, actualizándose con cada cambio guardado — el asesor ve el PDF que su cliente va a recibir en todo momento, no al final.

### 3.10 Autosave (se mantiene, se mejora un punto)

El mecanismo actual (debounce de 2 segundos, guardado forzado al cambiar de contexto, control de concurrencia por revisión) se conserva sin cambios porque es sólido. Se agrega una sola mejora: en caso de conflicto entre sesiones, mostrar un resumen mínimo de qué cambió en la otra sesión antes de forzar la elección entre "recargar" o "conservar mi edición" — hoy esa decisión se toma a ciegas.

### 3.11 Deshacer / rehacer

Historial de cambios real dentro de la sesión de edición (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z), independiente del autosave — deshacer un cambio no depende de recargar la página ni de pelear con el sistema de conflictos. Cubre texto, reordenamientos, ocultar/mostrar bloques y borrados de ítems (un borrado accidental de una alternativa se deshace con un atajo, no requiere confirmación previa que enlentezca el flujo normal).

### 3.12 Atajos de teclado

Set mínimo pero real, pensado para que un asesor recurrente nunca necesite el mouse para lo más frecuente: crear un nuevo ítem (Alternativa/Beneficio), duplicar el ítem enfocado, moverlo con el teclado, saltar entre bloques del outline, y guardar/salir. Los atajos se muestran como tooltip la primera vez que un usuario pasa el mouse sobre la acción equivalente, para que se descubran solos sin necesitar documentación aparte.

### 3.13 Comparación entre versiones

Sobre el modelo de versionado ya sólido, se agrega una vista de comparación: elegir dos versiones emitidas de la misma propuesta y ver, bloque por bloque, qué cambió entre una y otra — útil tanto para el asesor (recordar qué le mandó al cliente la semana pasada) como para justificar una renegociación.

---

## Backlog priorizado — exclusivamente del editor

### P0 — Elimina la mayor fricción de uso diario, sin rediseñar el modelo de datos

| # | Funcionalidad | Por qué es P0 |
|---|---|---|
| 1 | Bloques colapsables en Alternativas y Beneficios | Resuelve el problema de scroll más grave del editor hoy, sin cambiar ninguna lógica de guardado |
| 2 | Duplicar ítem (alternativa/beneficio) | El hueco de reutilización más barato de cerrar y el que más tiempo ahorra por propuesta |
| 3 | Drag and drop para reordenar (reemplaza flechas) | Mecanismo básico esperado en cualquier editor moderno; hoy reordenar es lento y torpe |
| 4 | Navegación libre por el outline (saltar a cualquier bloque) | Elimina la obligación de ir y volver secuencialmente para editar algo puntual |
| 5 | Selector visual de ícono en Beneficios (reemplaza el campo de texto libre) | Único campo del editor donde hoy un error no se detecta hasta ver el PDF final |

### P1 — Convierte el editor en una herramienta de producción rápida, no solo de carga de datos

| # | Funcionalidad | Impacto esperado |
|---|---|---|
| 6 | Duplicar propuesta completa | Punto de partida para clientes similares sin redactar de cero |
| 7 | Preview en tiempo real mientras se edita | El asesor ve el documento final durante todo el proceso, no solo al final |
| 8 | Deshacer/rehacer | Reduce el miedo a borrar o reordenar, acelera la edición exploratoria |
| 9 | Reordenamiento de filas/columnas en la tabla Comparativa | Hoy es el único bloque sin ningún mecanismo de reordenamiento |
| 10 | Bloques reutilizables (componentes) conectados a la Biblioteca | Convierte contenido ya redactado en activo reutilizable entre propuestas |
| 11 | Formato real (negrita, listas) en Diagnóstico y Recomendación | El documento final ya lo soporta visualmente; hoy el editor no permite producirlo |
| 12 | Ocultar bloque sin borrarlo | Permite redactar sin comprometerse a incluir, sin perder el trabajo |

### P2 — Pulido de velocidad y potencia para uso intensivo

| # | Funcionalidad | Impacto esperado |
|---|---|---|
| 13 | Plantillas de propuesta por producto/segmento | Acelera el armado inicial más allá de la duplicación puntual |
| 14 | Atajos de teclado | Beneficia especialmente al usuario recurrente de alto volumen |
| 15 | Comparación visual entre versiones emitidas | Útil pero no bloqueante — el modelo de versionado ya soporta la data necesaria |
| 16 | Resumen de cambios en conflicto de autosave | Mejora puntual sobre un mecanismo que ya funciona bien |
| 17 | Duplicar una versión emitida de vuelta a borrador editable | Cierra el único sentido que falta en un modelo de versionado por lo demás completo |

---

## Lectura final

El editor actual no necesita reconstruirse desde cero: el orden del contenido y el motor de autosave/versionado están bien resueltos y deben preservarse tal cual. Lo que falta es exactamente la capa que separa un formulario de un editor — colapsar, arrastrar, duplicar, deshacer y ver el resultado en vivo. Ninguno de los cinco ítems P0 requiere cambiar el modelo de datos existente; son mejoras de interacción sobre una base ya sólida.
