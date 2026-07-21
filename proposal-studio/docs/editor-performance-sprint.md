# Proposal Studio™ — Performance Sprint del Editor

**Rol:** Principal Product Designer (velocidad de producción, no auditoría).
**Pregunta única que gobierna todo el documento:** ¿cómo hago que un asesor tarde la mitad del tiempo en construir una propuesta?
**Este documento no repite las auditorías previas** ([ux-audit-proposal-studio.md](ux-audit-proposal-studio.md), [editor-propuestas-auditoria-y-spec.md](editor-propuestas-auditoria-y-spec.md), [design-system-audit.md](design-system-audit.md), [roadmap-comercial-legado.md](roadmap-comercial-legado.md)) — las da por leídas y construye encima. Donde una auditoría ya diagnosticó un problema (scroll en Alternativas, ausencia de undo, falta de Table component), este documento no lo vuelve a diagnosticar: diseña la solución de velocidad concreta y la ordena por impacto en tiempo real de producción.
**Restricciones respetadas:** no se toca el modelo de negocio, no se convierte en CRM, no se agregan funciones porque sí, no se rompe el flujo consultivo de 8 pasos (Cliente → Información → Diagnóstico → Alternativas → Recomendación → Beneficios → Comparativa → Resumen). Cada recomendación pasa el mismo filtro: *¿hace que el asesor cree una propuesta mejor, en menos tiempo y con menos esfuerzo?* Si la respuesta es no, no está en este documento aunque sea una buena idea.

---

## 1. Executive Summary

Proposal Studio™ hoy pide al asesor **tiempo prestado a un formulario** para producir un documento de venta. El contenido y el orden ya son correctos (la auditoría del editor lo confirma línea por línea contra el código); lo que falta es la capa de velocidad que convierte "cargar datos en un wizard" en "producir un documento como quien piensa en voz alta". Esa capa tiene cinco componentes, y ninguno requiere tocar el modelo de datos ni el motor de autosave/versionado, que ya son sólidos:

1. **Nunca reescribir lo mismo dos veces** — duplicar, reutilizar y plantillas cierran el hueco de mayor tiempo perdido real (hoy: 0% de reutilización de contenido entre propuestas).
2. **Nunca scrollear para encontrar algo** — bloques colapsables + outline clickeable + Cmd+K eliminan el 90% del scroll actual en Alternativas, Beneficios y Comparativa.
3. **Nunca soltar el teclado** — atajos completos + Modo Experto para el asesor de 200 propuestas/año, que hoy usa el mismo flujo lento que alguien en su primera propuesta.
4. **Nunca dudar si el trabajo está a salvo** — undo instantáneo + autosave silencioso eliminan las confirmaciones que hoy frenan al usuario (o su ausencia, que lo asusta).
5. **IA invisible en 6 puntos exactos** — no un chatbot: autocompletado de campos inferibles, generación de primer borrador narrativo, y detección de comparativas/beneficios incompletos, exactamente donde hoy el asesor escribe más y piensa menos de lo que debería.

**El ahorro de tiempo agregado estimado, propuesta típica (Sección 2), es de ~35-45 minutos sobre una base actual de ~70-90 minutos** — es decir, la mitad del tiempo, tal como pide el mandato de este documento. La mayor porción de ese ahorro no viene de hacer la interfaz más rápida de operar: viene de **no hacer que el asesor rehaga trabajo que ya hizo antes** (duplicar, reutilizar, plantillas) y de **no hacerlo escribir lo que el sistema ya sabe o puede inferir** (IA invisible, prellenado).

---

## 2. Los 50 mayores puntos de fricción, ordenados por impacto en tiempo

Impacto estimado = tiempo perdido por propuesta típica (cliente con 3-4 alternativas, 4-6 beneficios, tabla comparativa de 3 columnas). Estimaciones basadas en la cantidad de interacciones que exige el flujo actual documentado en la auditoría del editor, no en medición de sesión real.

### Tramo A — Nunca reescribir lo mismo (mayor impacto agregado)

| # | Fricción | Minutos perdidos/propuesta | Causa raíz |
|---|---|---|---|
| 1 | No se puede duplicar una alternativa/beneficio dentro de la misma propuesta | 6-10 | Producto de retiro con 3 variantes de aporte se redacta 3 veces desde cero |
| 2 | No se puede duplicar una propuesta completa como punto de partida | 15-25 | Cliente similar a uno anterior arranca en blanco igual |
| 3 | No existen plantillas por producto/segmento | 10-15 | El 80% del contenido de Diagnóstico/Alternativas/Beneficios se repite entre clientes del mismo producto |
| 4 | Biblioteca vacía / decorativa (confirmado en auditoría UX, hallazgo P0) | 5-8 | Ningún contenido redactado queda disponible para la próxima propuesta |
| 5 | Diagnóstico no persiste por cliente, solo por propuesta | 3-6 | Cliente que vuelve por otro producto obliga a re-preguntar y re-escribir lo ya sabido |
| 6 | Selector de ícono de Beneficios es texto libre sin validación visual | 1-3 + riesgo de error no detectado hasta el PDF | Fricción de escritura + retrabajo si el nombre de ícono está mal |
| 7 | No se puede duplicar una versión emitida de vuelta a borrador | 3-5 | Revisar una propuesta ya enviada obliga a reconstruir desde el borrador vigente, no desde lo realmente enviado |

### Tramo B — Nunca scrollear (fricción de navegación y ergonomía)

| # | Fricción | Minutos perdidos/propuesta | Causa raíz |
|---|---|---|---|
| 8 | Alternativas y Beneficios siempre expandidos, sin colapsar | 4-7 | Scroll de decenas de pantallas con 4-6 ítems cargados |
| 9 | Stepper superior no clickeable — no se puede saltar a un paso puntual | 2-4 | Único atajo es llegar a Resumen y usar "Editar" por tarjeta |
| 10 | Reordenar con flechas arriba/abajo en vez de drag and drop | 2-3 | Mover el último ítem al principio de 6 exige 5 clics |
| 11 | Tabla Comparativa sin ningún mecanismo de reordenamiento | 2-4 | Un error de orden obliga a borrar fila/columna y recargar |
| 12 | Sin indicador de avance real (bloques completos vs. totales) | 1-2 + ansiedad | El asesor no sabe si le faltan 2 o 15 minutos |
| 13 | Sin buscador global (cliente/propuesta) en la barra superior | 1-3 | Encontrar algo puntual obliga a navegar sección por sección |
| 14 | Preview del documento final solo existe después de emitir versión | 3-5 (por ida y vuelta a verificar formato) | El asesor edita "a ciegas" del resultado real hasta el final |
| 15 | Sin resumen visual de qué cambió en conflicto de autosave | 1-2 (ocasional, alto costo cuando ocurre) | Decisión a ciegas entre "recargar" o "conservar mi edición" |
| 16 | Comparativa sin indicador de cuánto falta para el límite (12 col × 50 filas) | 0.5-1 | Ensayo y error para saber cuánto espacio queda |
| 17 | Dos flujos distintos de creación de propuesta (dashboard vs. pantalla dedicada) | 0.5-1 + confusión | Comportamiento potencialmente divergente, decisión extra innecesaria |

### Tramo C — Nunca escribir de más (texto, formato, inferencia)

| # | Fricción | Minutos perdidos/propuesta | Causa raíz |
|---|---|---|---|
| 18 | Diagnóstico y Recomendación son texto plano sin formato real | 2-4 | El asesor intenta estructurar con saltos de línea manuales lo que debería ser lista/negrita |
| 19 | Ventajas/desventajas de Alternativas se cargan como texto libre "una por línea" | 2-3 | Sin control de agregar/quitar ítem, cada edición reescribe el bloque completo |
| 20 | Sin narrativa generada a partir de datos ya cargados (edad, producto, objetivo) | 5-10 | Diagnóstico y Recomendación parten de hoja en blanco cuando el sistema ya tiene el contexto |
| 21 | Sin detección de comparativa/beneficios incompletos antes de avanzar | 1-2 (retrabajo si se detecta tarde) | El asesor descubre huecos recién en el Resumen o en el PDF |
| 22 | Sin banco de argumentos/objeciones por producto disponible al redactar (roadmap comercial, ítem P2) | 3-5 | Cada asesor reinventa el mismo argumentario de memoria |
| 23 | Campo "Información" no infiere nada del cliente ya cargado | 1-2 | Datos que ya existen en la ficha de cliente se vuelven a tipear |
| 24 | Sin corrector de tono/errores antes de generar el documento final | 1-3 (riesgo de vergüenza frente al cliente, no solo tiempo) | Ningún control de calidad antes de que el cliente vea el texto |

### Tramo D — Nunca dudar de si el trabajo está seguro (confianza, undo, estados)

| # | Fricción | Minutos perdidos/propuesta | Causa raíz |
|---|---|---|---|
| 25 | No existe undo/redo en todo el editor (confirmado por código) | 2-5 (cuando ocurre) + freno psicológico constante | Borrar un ítem por error, o "probar" un cambio, tiene costo percibido alto |
| 26 | Borrar una alternativa/beneficio con contenido no pide confirmación | 3-8 (cuando ocurre) | Pérdida real de texto redactado, sin red de seguridad |
| 27 | Archivar una propuesta se ejecuta al instante sin confirmación | 0 tiempo directo, alto riesgo de pérdida de visibilidad comercial | Mismo patrón de fricción silenciosa que #26 |
| 28 | Parpadeo en blanco al entrar al editor mientras hidrata el store | 0.1-0.2 × N entradas al editor | Sin skeleton dedicado en esta ruta |
| 29 | Sin atajos de teclado en ningún punto del editor | 3-6 | Cada acción frecuente (nuevo ítem, guardar, navegar) exige mouse |
| 30 | El botón de tres puntos del dashboard no tiene acción conectada | 0 tiempo directo, alto costo de confianza | Rompe el modelo mental de que la app hace lo que aparenta |

### Tramo E — Fricción de contexto y setup (antes de llegar al contenido)

| # | Fricción | Minutos perdidos/propuesta | Causa raíz |
|---|---|---|---|
| 31 | Crear cliente nuevo interrumpe el flujo con navegación completa a otra sección | 1-3 | Sin creación inline en el paso Cliente del wizard |
| 32 | Sin sugerencia de plan/producto basada en el perfil ya cargado del cliente | 1-2 | El asesor elige a mano lo que el sistema podría preseleccionar |
| 33 | Mi Marca se configura "a ciegas" sin preview en una propuesta real (auditoría UX, P2) | 0 por propuesta, alto costo de setup inicial | Configuración de marca no se valida hasta el primer PDF real |
| 34 | Sin checklist de onboarding (Marca → Clientes → Primera propuesta) | 5-10 (una sola vez, primer uso) | El orden lógico de setup no está sugerido en ningún lado |
| 35 | Título de propuesta no se autogenera a partir de cliente + producto | 0.3-0.5 | Micro-decisión de nombrado que no aporta nada y podría ser automática |

### Tramo F — Fricción de salida y cierre (el momento de mayor valor, hoy cortado)

| # | Fricción | Minutos perdidos/propuesta | Causa raíz |
|---|---|---|---|
| 36 | Sin acción de enviar/compartir desde el preview de versión (auditoría UX, P1) | 3-5 (salir a mail/WhatsApp manualmente) | El producto genera el PDF y abandona al asesor justo antes del momento de mayor valor |
| 37 | Sin comparación visual entre versiones emitidas | 2-4 (cuando se necesita reconstruir qué cambió) | Recordar qué se envió la semana pasada exige abrir ambos PDFs a mano |
| 38 | Sin plantilla de propuesta de renovación precargada (roadmap comercial) | 10-20 (fuera del alcance de este sprint, pero cuantificado por relevancia) | Renovación se arma desde cero como si fuera cliente nuevo |
| 39 | Sin expectativa de qué pasa después de emitir (¿el cliente ya la puede ver? ¿cómo?) | 1-2 (incertidumbre, no bloqueo real) | El límite entre "documento listo" y "documento entregado" no es claro en la interfaz |

### Tramo G — Micro-fricciones acumulativas (bajas individualmente, altas en agregado sobre 200 propuestas/año)

| # | Fricción | Minutos perdidos/propuesta | Causa raíz |
|---|---|---|---|
| 40 | Contador de caracteres sin indicador visual de proximidad al límite (8.000) | 0.2 | Solo un número, sin barra ni color de advertencia |
| 41 | Guardar y salir requiere navegación explícita, no un atajo | 0.3 | Cmd/Ctrl+S no está mapeado a nada |
| 42 | Tooltip de atajos no existe — nada se descubre solo | 0 directo, alto costo de adopción de todo lo demás | Sin descubribilidad, ningún atajo nuevo se usará |
| 43 | Botón "Siguiente"/"Anterior" exige moverse al pie de pantalla cada vez | 0.3-0.5 × 7 transiciones | Sin atajo de teclado para avanzar/retroceder paso |
| 44 | Sin indicador de qué campos son opcionales vs. obligatorios a simple vista | 0.5 | Obliga a intentar avanzar para descubrir el mínimo real |
| 45 | Reordenar columnas de Comparativa no existe ni con flechas | 1-2 (cuando ocurre) | Mismo problema que #11, pero a nivel de columna en vez de fila |
| 46 | Sin previsualización de ícono elegido en Beneficios hasta el PDF | 0.3-0.5 | Extensión del problema #6 |
| 47 | Autosave no muestra "última vez guardado hace X segundos" de forma prominente | 0.2 (ansiedad, no tiempo real) | El indicador existe pero es discreto |
| 48 | Sin resaltado automático de la alternativa recomendada dentro de la tabla comparativa | 0.5-1 (se resuelve manualmente con texto) | Nada distingue visualmente cuál opción es la sugerida |
| 49 | Sin cross-sell/sugerencia visible del próximo producto a ofrecer (roadmap comercial) | Fuera del alcance de este sprint — mencionado por completitud, no accionable en el editor |
| 50 | Sidebar y stepper no comparten el mismo lenguaje de "completo/incompleto" | 0.3 | Dos sistemas de progreso que podrían ser uno solo |

**Total estimado tramo A-D (accionable dentro del editor, sin tocar modelo de negocio): ~65-100 minutos de fricción acumulada por propuesta, de los cuales el sprint aquí diseñado ataca directamente ~55-85.**

---

## 3. Clics, scroll y escritura — el diseño de la solución

### 3.1 Clics eliminados

| Acción hoy | Clics hoy | Clics objetivo | Cómo |
|---|---|---|---|
| Duplicar una alternativa | No existe (recrear = 15-20 clics) | 1 | Ícono duplicar en cada bloque colapsado |
| Saltar a un paso específico | 7-8 (avanzar uno por uno) | 1 | Outline lateral clickeable |
| Reordenar un ítem del final al principio | 5 (flechas) | 1 (arrastre) | Drag and drop con teclado como alternativa accesible |
| Crear cliente durante el wizard | Navegación completa fuera del wizard + vuelta | 0 (modal inline, ya identificado en la auditoría del editor como la única excepción válida a "sin modales") | Diálogo corto sin abandonar el paso Cliente |
| Confirmar que un campo opcional se completó | Implícito, sin indicador | 0 (visible en outline sin clic) | Badge de completitud por bloque |
| Enviar la propuesta al cliente | Sale del producto (0 clics medibles pero abandono total del flujo) | 2 (elegir canal + confirmar) | Acción "Enviar" en el preview, dentro del producto |

### 3.2 Acciones que deberían desaparecer por completo

- **Nombrar la propuesta a mano** → autogenerado como `{Cliente} — {Producto}`, editable si el asesor quiere, nunca obligatorio de tipear primero.
- **Guardar explícitamente** → ya casi no existe (autosave), pero el atajo Cmd/Ctrl+S debería significar "guardar y salir", no agregar un guardado que ya ocurre solo.
- **Elegir entre "dashboard" o "pantalla dedicada" para crear propuesta** → un solo punto de entrada, tal como ya recomendó la auditoría UX (P0 #6).
- **Retroceder paso por paso para corregir un dato anterior** → reemplazado por navegación libre del outline; "retroceder" deja de ser una acción necesaria.
- **Escribir el nombre de un ícono de memoria** → reemplazado por selector visual con búsqueda.

### 3.3 Reducción de scroll

Regla de diseño: **ningún bloque de contenido repetible se muestra expandido si no se está editando activamente.** Esto, combinado con el outline lateral, significa que la altura de la pantalla deja de crecer con la cantidad de ítems cargados — una propuesta con 8 alternativas ocupa el mismo alto visual que una con 2. El único scroll que debería sobrevivir es el scroll natural de leer un párrafo largo dentro de un bloque expandido, nunca el scroll de "buscar dónde está el ítem 5".

### 3.4 Reducción de escritura

Tres mecanismos, en orden de impacto:

1. **Reutilización** (duplicar, biblioteca, plantillas) — elimina reescritura de contenido ya redactado antes. Es el mecanismo de mayor ahorro (Tramo A, sección 2).
2. **Inferencia** — el sistema completa lo que ya sabe: nombre de propuesta, datos de cliente ya cargados, producto sugerido según el historial del cliente.
3. **Generación asistida** (IA invisible, sección 5) — primer borrador de Diagnóstico/Recomendación a partir de los datos ya ingresados en el paso Cliente/Información, que el asesor edita en vez de partir de cero.

---

## 4. Navegación — nunca pensar dónde se está

- **Outline lateral persistente** (ya especificado en la auditoría del editor, sección 3.1): siempre visible, siempre clickeable, refleja completitud real por bloque, no por paso.
- **Cmd/Ctrl+K** abre un buscador universal: saltar a cualquier bloque de la propuesta actual, buscar un cliente, o buscar una propuesta existente — un solo mecanismo para las tres necesidades de "encontrar algo" identificadas en la auditoría UX (búsqueda global) y en la auditoría del editor (navegación libre).
- **Breadcrumb con "volver"**: un solo clic para volver al dashboard o al detalle de la propuesta sin perder el borrador — ya se guarda solo, así que "volver" nunca debería sentirse riesgoso.
- **Resumen ya no es un destino final**: es la vista colapsada del mismo documento, accesible con un clic desde cualquier punto, tal como ya lo especifica la auditoría del editor (sección 3.1) — este documento no lo vuelve a diseñar, lo hereda como base de la navegación.

---

## 5. IA invisible — exactamente 6 puntos de intervención, ninguno es un chatbot

Cada punto de intervención responde a una fricción específica ya identificada en la sección 2. Ninguno reemplaza la decisión comercial del asesor — todos producen un borrador editable, nunca un texto final impuesto.

| # | Dónde interviene | Qué hace | Fricción que resuelve |
|---|---|---|---|
| 1 | Al entrar a Diagnóstico con Cliente + Producto ya cargados | Genera un primer borrador de "situación actual" y "objetivos" a partir del perfil del cliente y el tipo de producto elegido — el asesor edita, no redacta desde cero | #20 |
| 2 | Al terminar de cargar una Alternativa | Sugiere 2-3 beneficios típicos de ese producto, como chips para agregar con un clic, no como texto impuesto | #3, #22 |
| 3 | Al salir de un campo de texto narrativo (Diagnóstico, Recomendación) | Corrector de tono y errores inline (no bloquea el avance, solo subraya) — mismo lugar donde hoy no hay ningún control de calidad | #24 |
| 4 | Antes de avanzar a Resumen | Detecta huecos objetivos: comparativa sin marcar una opción recomendada, beneficios sin ícono válido, alternativa sin desventajas cargadas — como una lista de sugerencias, no un bloqueo | #21 |
| 5 | Al momento de duplicar una propuesta o crear desde plantilla | Resalta qué campos probablemente necesitan cambiar (montos, nombre de cliente, fechas) para que el asesor no entregue una propuesta con datos del cliente anterior por descuido | Reduce el riesgo del propio mecanismo de duplicación (Tramo A) |
| 6 | Al cargar la tabla Comparativa | Autocompleta filas típicas del producto elegido (ej. "Rescate parcial", "Costo de administración") dejando solo la celda de valor para completar por asesor | Extensión de #3, sobre el bloque más rígido del editor actual |

**Deliberadamente fuera de alcance:** ningún asistente conversacional, ninguna generación de la propuesta completa sin intervención humana, ninguna sustitución del argumentario comercial del asesor. La IA aquí ahorra tiempo de tipeo y de detección de huecos — nunca reemplaza el criterio de venta.

---

## 6. Sistema de atajos de teclado

Diseñado para que el asesor de alto volumen (sección 7) nunca necesite el mouse para las acciones más frecuentes. Se descubre solo vía tooltip la primera vez que el mouse pasa sobre la acción equivalente (ya especificado en la auditoría del editor, sección 3.12 — aquí se completa el set).

| Atajo | Acción |
|---|---|
| `Cmd/Ctrl+K` | Buscador universal (bloque / cliente / propuesta) |
| `Cmd/Ctrl+N` | Nuevo ítem en el bloque activo (alternativa, beneficio, fila de comparativa) |
| `Cmd/Ctrl+D` | Duplicar el ítem enfocado |
| `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` | Deshacer / rehacer |
| `Cmd/Ctrl+S` | Guardar y salir (autosave ya corre solo; este atajo cierra el loop) |
| `Cmd/Ctrl+↑` / `Cmd/Ctrl+↓` | Mover el ítem enfocado dentro de su lista |
| `]` / `[` | Ir al siguiente / anterior bloque del outline |
| `E` | Expandir/colapsar el bloque enfocado |
| `Cmd/Ctrl+Enter` | Marcar bloque como completo y saltar al siguiente incompleto |
| `Cmd/Ctrl+P` | Abrir preview del documento en tiempo real |
| `?` | Mostrar el mapa completo de atajos |

---

## 7. Modo Experto — para quien hace 200 propuestas por año

No explica, no guía, no confirma de más. Se activa una vez que el sistema detecta un volumen de uso sostenido (o el usuario lo activa a mano desde su perfil), y cambia el comportamiento por defecto:

- **Todo empieza colapsado**, incluso el primer ítem — el experto ya sabe qué va en cada bloque, no necesita que se le muestre expandido.
- **Confirmaciones de borrado desaparecen** (undo ya cubre el riesgo real, sección 8) — la confirmación es fricción para quien ya confía en el atajo de deshacer.
- **Tooltips de descubribilidad se desactivan** — ya conoce los atajos, no necesita que se le repitan.
- **Autocompletado de IA se vuelve más agresivo por defecto** (borradores más largos, más chips de sugerencia) porque el experto edita más rápido de lo que redacta.
- **Comando "clonar última propuesta similar"** disponible desde el buscador universal — el experto no busca una plantilla, sabe exactamente cuál de sus últimas 10 propuestas quiere clonar.

El modo experto no es una pantalla distinta: es el mismo editor con menos pasos intermedios entre pensar y producir.

---

## 8. Cómo debería sentirse editar — principios, no interfaces

- **De Notion:** todo es un bloque manipulable en el lugar donde vive — nada se edita "en otro lado".
- **De Linear:** cada acción tiene una tecla, y la tecla siempre gana contra el mouse en velocidad percibida.
- **De Superhuman:** el estado por defecto es "ya está resuelto" — el asesor entra al editor y lo que puede inferirse ya está inferido, no en blanco esperando ser llenado.
- **De Figma:** los bloques reutilizables son componentes con instancias — reutilizar nunca significa "perder la posibilidad de personalizar".
- **De Framer/Canva:** el resultado final se ve mientras se construye, nunca como una sorpresa al final.

La medida de éxito no es "¿se ve como Notion?" — es "¿el asesor deja de notar que está usando un formulario?".

---

## 9. Focus Mode

Un modo de un solo bloque a la vez, activable desde cualquier punto del editor (atajo `F` o ícono en el outline):

- Oculta el outline lateral, el header de navegación y cualquier chrome que no sea el bloque activo y su preview inmediato.
- El único elemento visible además del contenido es una barra mínima inferior: nombre del bloque actual, estado de guardado, y una flecha para salir del modo foco.
- Pensado para el momento de mayor esfuerzo cognitivo real del editor: redactar Diagnóstico o Recomendación, donde cualquier distracción visual compite directamente con la calidad del texto.
- Salir de Focus Mode nunca pierde contexto — vuelve exactamente al mismo bloque con el outline restaurado.

---

## 10. Estados — todo debe sentirse instantáneo

| Estado | Comportamiento objetivo |
|---|---|
| Loading (entrada al editor) | Skeleton del layout completo (outline + bloque + preview), nunca pantalla en blanco — cierra la fricción #28 |
| Saving | Indicador discreto pero siempre visible (no un banner que interrumpe) — "Guardado" aparece y se desvanece solo, nunca queda pegado |
| Autosave | Silencioso por defecto; solo se vuelve visible cuando hay algo que decidir (conflicto) |
| Undo/Redo | Instantáneo, sin loading — vive en memoria de sesión, no depende de una llamada al servidor |
| Errores | Inline, en el bloque exacto que falló, nunca un banner genérico separado del campo |
| Conflictos de autosave | Muestra qué cambió en la otra sesión (ya especificado en la auditoría del editor, 3.10) antes de forzar la elección |

---

## 11. Motion — microinteracciones que comunican velocidad

No se trata de animaciones vistosas — cada una existe para que el usuario perciba que el sistema ya reaccionó, incluso antes de que termine de procesar:

- **Colapsar/expandir un bloque**: transición de 150-200ms, altura real animada (no un salto), para que el ojo nunca pierda la posición del ítem que estaba mirando.
- **Duplicar un ítem**: el nuevo ítem aparece con un leve destello y se posiciona inmediatamente debajo del original — comunica "esto ya existe" sin necesidad de leer ningún texto de confirmación.
- **Drag and drop**: el resto de la lista se reacomoda en vivo mientras se arrastra, no solo al soltar — el usuario ve el resultado final antes de decidir soltar.
- **Guardado**: un check discreto que aparece y se desvanece en ~1 segundo — nunca un modal, nunca un sonido, nunca algo que exija ser descartado.
- **Cambio de bloque en el outline**: scroll suave al bloque elegido, con un breve resaltado de fondo que se desvanece — confirma que el salto ocurrió sin necesidad de leer nada.

---

## 12. Performance percibida (aunque el backend tarde lo mismo)

- **Optimistic UI en todo**: duplicar, reordenar, colapsar y marcar completo se reflejan en la interfaz al instante, sin esperar confirmación del servidor — el autosave corre detrás, invisible.
- **Preview que no bloquea**: la actualización de la vista previa del documento nunca congela el editor — se actualiza en segundo plano y muestra su propio indicador sutil de "actualizando", nunca un spinner que tape el contenido.
- **Precarga del siguiente bloque probable**: si el asesor está en Alternativas, el sistema ya preparó los datos de Beneficios en memoria — saltar entre bloques del outline se siente instantáneo porque técnicamente ya lo es.
- **Feedback antes que resultado**: cada acción (duplicar, borrar, mover) muestra su efecto visual antes de que la operación de guardado termine — el usuario nunca espera para ver que algo pasó, aunque el guardado real tome unos milisegundos más.

---

## 13. Delight — detalles, no funcionalidades

- El atajo `?` no solo lista comandos: agrupa por frecuencia de uso real del asesor, mostrando primero los que más usa.
- Al duplicar la propuesta número 50, 100, 200 de un asesor, un mensaje discreto y no intrusivo reconoce el volumen ("Es tu propuesta número 100 este año") — sin gamificación forzada, solo un gesto de reconocimiento puntual.
- El ícono de un beneficio, al seleccionarse desde el selector visual, hace una transición sutil hacia su posición final en el bloque — pequeño, pero comunica que el sistema "entendió" la elección.
- El buscador universal (`Cmd/Ctrl+K`) recuerda las últimas 3 propuestas abiertas y las muestra primero, sin necesidad de escribir nada — la mitad de las veces que alguien abre el buscador es para volver a algo reciente, no para buscar algo nuevo.
- Cuando el asesor termina de redactar el último bloque incompleto, el outline entero pasa a un estado "completo" con una transición conjunta (no bloque por bloque) — un solo momento de cierre visual en vez de una acumulación silenciosa de checks.

---

## 14. Quick Wins (menos de un día de esfuerzo cada uno)

| # | Cambio | Por qué es rápido |
|---|---|---|
| 1 | Autogenerar el título de la propuesta como `{Cliente} — {Producto}` | Un valor derivado, sin nueva UI |
| 2 | Indicador visual de proximidad al límite de caracteres (barra/color, no solo número) | Cambio de componente existente, sin lógica nueva |
| 3 | Atajo `Cmd/Ctrl+S` = guardar y salir | Mapeo de tecla sobre una acción que ya existe |
| 4 | Tooltip de atajo la primera vez que el mouse pasa sobre una acción equivalente | Capa de UI sobre acciones ya existentes |
| 5 | Badge de "última vez guardado hace X segundos" más prominente | Componente ya existe, solo cambia jerarquía visual |
| 6 | Resaltado automático de la opción recomendada en la tabla comparativa | Una regla visual sobre datos que ya existen (cuál alternativa es la recomendada) |
| 7 | Indicador de completitud por bloque en el outline (aunque el outline completo sea P0, un badge simple es inmediato) | Cálculo simple sobre datos ya validados hoy |
| 8 | Unificar el único flujo de creación de propuesta (ya recomendado en auditoría UX P0 #6) | Elimina un camino redundante, no crea uno nuevo |

---

## 15. P0 — Imprescindibles

*(Construyen directamente sobre la especificación ya validada en la auditoría del editor, sección 3 y su backlog P0 — aquí se prioriza específicamente por minutos de producción ahorrados, no se vuelve a especificar el mecanismo.)*

| # | Funcionalidad | Minutos ahorrados/propuesta | Depende de |
|---|---|---|---|
| 1 | Duplicar ítem (alternativa/beneficio) dentro de la propuesta | 6-10 | Nada — es el hueco más barato de cerrar |
| 2 | Duplicar propuesta completa | 15-25 | #1 (mismo mecanismo, distinto alcance) |
| 3 | Bloques colapsables por defecto en Alternativas/Beneficios | 4-7 | Nada |
| 4 | Outline lateral clickeable (navegación libre) | 2-4 | Nada |
| 5 | Drag and drop para reordenar (Alternativas, Beneficios, filas/columnas de Comparativa) | 4-7 | Nada |
| 6 | Undo/redo real de sesión | 2-5 + reduce fricción psicológica en #26/#27 | Nada |
| 7 | Selector visual de ícono en Beneficios | 1-3 + elimina errores no detectados | Nada |
| 8 | Confirmación antes de borrar contenido no vacío (ya cubierto por undo, pero mantiene como red adicional en Modo Estándar) | Previene pérdida de 3-8 min de redacción cuando ocurre | #6 |

---

## 16. P1 — Muy recomendables

| # | Funcionalidad | Minutos ahorrados/propuesta |
|---|---|---|
| 9 | Plantillas por producto/segmento | 10-15 |
| 10 | Bloques reutilizables conectados a Biblioteca real | 5-8 |
| 11 | Preview en tiempo real durante la edición (dos columnas) | 3-5 |
| 12 | Set completo de atajos de teclado (sección 6) | 3-6 |
| 13 | IA — primer borrador de Diagnóstico/Recomendación (punto 1, sección 5) | 5-10 |
| 14 | IA — sugerencia de beneficios/comparativa por producto (puntos 2 y 6, sección 5) | 3-5 |
| 15 | Buscador universal `Cmd/Ctrl+K` | 1-3 |
| 16 | Formato real (negrita, listas) en campos narrativos | 2-4 |
| 17 | Envío directo de la propuesta desde el preview (cierra el loop comercial) | 3-5 |
| 18 | Diagnóstico persistente por cliente, reutilizable entre propuestas | 3-6 |

---

## 17. P2 — Pulido

| # | Funcionalidad | Impacto esperado |
|---|---|---|
| 19 | Focus Mode | Mejora de calidad de redacción, no de velocidad medible en minutos |
| 20 | Modo Experto activable | Beneficia desproporcionadamente al usuario de alto volumen |
| 21 | Comparación visual entre versiones emitidas | Ahorra tiempo ocasional, alto valor cuando ocurre |
| 22 | IA — detección de huecos antes de Resumen (punto 4, sección 5) | Reduce retrabajo tardío |
| 23 | IA — corrector de tono inline (punto 3, sección 5) | Calidad percibida del documento final, no solo velocidad |
| 24 | Delight de reconocimiento de volumen (sección 13) | Sin impacto en tiempo, impacto en percepción de marca |
| 25 | Duplicar versión emitida de vuelta a borrador | Cierra el único sentido faltante del modelo de versionado |

---

## 18. Experiencia ideal — del primer clic al PDF final

El asesor abre Proposal Studio™ y ve, sin pensar, el nombre del cliente con quien va a trabajar hoy — ya sea porque lo eligió desde el buscador universal o porque el sistema lo sugirió por actividad reciente. Elige "Nueva propuesta", y en el mismo gesto el sistema le pregunta una sola cosa real: cliente y producto. Todo lo demás — el título, la primera versión del diagnóstico, la sugerencia de beneficios típicos de ese producto — ya está ahí, esperando ser editado, no ser creado.

El asesor nunca avanza "paso a paso": ve el documento completo como una columna de bloques a la izquierda y el resultado real, tal como lo va a recibir el cliente, a la derecha. Edita Diagnóstico en foco total (Focus Mode), sale con un atajo, y el outline le muestra de un vistazo qué falta. Cuando llega a Alternativas, no escribe tres variantes del mismo producto: carga una, la duplica dos veces, ajusta solo lo que cambia. Reordena arrastrando, nunca clickeando flechas. Si se equivoca, deshace con una tecla — nunca duda antes de borrar algo.

La tabla comparativa ya trae las filas típicas del producto precargadas; el asesor completa valores, no estructura. La opción que recomienda se resalta sola porque ya la marcó como tal en Alternativas — no la repite a mano en la tabla.

Termina de escribir, y el outline entero se ilumina en verde de una sola vez. No hay una pantalla de "Resumen" separada — es el mismo documento, colapsado. Revisa el preview, que ya venía viendo actualizarse en tiempo real desde el primer bloque, así que no hay sorpresas. Emite la versión, y desde ahí mismo la envía al cliente por el canal que prefiera, sin salir del producto.

De principio a fin, el asesor nunca sintió que estaba llenando un formulario. Sintió que estaba pensando en voz alta y el sistema iba ordenando eso en un documento — exactamente la mitad del tiempo que le tomaba antes, con la mitad del esfuerzo.

---

## 19. North Star — a tres años

Si en tres años Proposal Studio™ es considerado el editor comercial más rápido del mundo para Productores Asesores de Seguros, es porque ocurrieron, en orden, las siguientes cosas:

1. **El editor dejó de tener "pasos" como concepto técnico** — el modelo de documento de bloques (ya especificado en la auditoría del editor) se volvió la única realidad del producto, y el wizard de 8 pasos sobrevive solo como agrupación visual de fases, nunca como restricción de navegación.
2. **La Biblioteca se convirtió en el activo más valioso del asesor**, no una sección vacía — cada propuesta que arma deja algo reutilizable atrás, y después de dos años de uso, un asesor de alto volumen arma el 70% de una propuesta nueva por reutilización, no por redacción original.
3. **La IA invisible se volvió invisible de verdad** — ningún asesor describe el producto como "tiene IA"; lo describe como "nunca tengo que empezar de una hoja en blanco".
4. **El tiempo de producción de una propuesta típica bajó de 70-90 minutos a 25-35** — no por una interfaz más rápida de clickear, sino porque la mayoría del contenido ya no se escribe desde cero.
5. **El modo experto se volvió el modo por defecto para todo usuario con más de 20 propuestas cargadas** — el producto aprendió a dejar de explicarse a sí mismo a medida que el usuario ya no lo necesita.
6. **Ningún asesor recuerda la última vez que perdió trabajo por un error o un cierre accidental** — undo, autosave y confirmaciones inteligentes se volvieron tan confiables que "¿se guardó?" dejó de ser una pregunta que alguien se hace.
7. **El producto se ganó la comparación con Notion/Linear/Superhuman no por parecerse visualmente**, sino porque un asesor que use esas herramientas reconoce el mismo principio: nunca hay una distancia entre pensar algo y verlo reflejado en el documento.

Ninguno de estos siete hitos requiere que Proposal Studio™ deje de ser lo que es: una herramienta de producción de documentos de venta consultiva para un productor asesor de seguros. El North Star no es agregar más — es que quede exactamente lo necesario, y que cada pieza de eso sea instantánea.
