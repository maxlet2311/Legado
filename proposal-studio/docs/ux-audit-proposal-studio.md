# Auditoría UX — Proposal Studio™ / Legado

**Rol evaluado:** Productor Asesor de Seguros (primer ingreso)
**Pantallas auditadas:** 15
**Hallazgos accionables:** 21
**Método:** revisión de código y flujo de navegación, sin acceso a sesión de usuario real ni datos de uso. No se proponen cambios cosméticos ni de código en este documento.

---

## Resumen ejecutivo

El producto tiene una arquitectura de información fundamentalmente correcta — el wizard de 8 pasos sigue el orden real de una venta consultiva y la navegación principal no satura al usuario con opciones. El problema no es de diseño de flujo: es de **consistencia funcional**. Hay elementos en pantalla que aparentan hacer algo y no hacen nada (un botón de menú sin acción, un link mal etiquetado, una sección entera que simula estar terminada sin estarlo), y hay dos acciones que destruyen trabajo del usuario sin pedir confirmación. Para un productor que recién llega y todavía no confía en la herramienta, ese tipo de fricción silenciosa pesa más que cualquier detalle visual.

| P0 | P1 | P2 | Cambios cosméticos propuestos |
|---|---|---|---|
| 6 | 8 | 7 | 0 |

**Riesgo principal:** la confianza percibida se construye o se rompe en el Panel de Control y en el Wizard — son las dos pantallas de mayor tráfico y ambas contienen elementos rotos o sin red de seguridad ante errores del usuario.

---

## 01 — Login

**Propósito:** autenticar a un asesor ya registrado.

**✓ Qué funciona**
- Errores diferenciados por causa (cuenta inactiva, falla de OAuth, acceso restringido) en vez de un genérico.
- Banners de continuidad tras cambiar contraseña o activar cuenta — el usuario sabe que el paso anterior salió bien.
- Google como método alternativo reduce fricción de primer ingreso.

**⚠ Qué confunde**
- El estado de "acceso restringido" (allowlist) se muestra sin explicar qué hacer ni a quién escribir — para alguien recién invitado, lee como que el producto está roto.
- "¿Tenés una invitación?" es un link de pie de página de bajo contraste, fácil de no ver para quien llega sin cuenta todavía.

**Recomendaciones**
- Eliminar: nada estructural.
- Simplificar: nada mayor.
- Reorganizar: dar más peso visual al link de activación cuando el usuario llega sin sesión previa detectable.
- Agregar: canal de contacto explícito (mail o WhatsApp) en el mensaje de acceso restringido.

**Prioridad:** P1 · **Esfuerzo:** S · **Impacto:** Medio

---

## 02 — Recupero de contraseña

**Propósito:** restablecer acceso vía enlace enviado por email.

**✓ Qué funciona**
- Patrón anti-enumeración correcto: el mensaje de éxito es idéntico exista o no la cuenta.
- Estado explícito "Verificando enlace…" evita que el formulario parpadee antes de saber si el link es válido.

**⚠ Qué confunde**
- Si el enlace venció, no hay forma de pedir uno nuevo sin abandonar la pantalla y perder el contexto.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: input de email + reenvío in-situ cuando el link está vencido, en vez de rebotar a otra pantalla.

**Prioridad:** P2 · **Esfuerzo:** S · **Impacto:** Bajo

---

## 03 — Activación de cuenta

**Propósito:** primer ingreso de un asesor invitado por un administrador.

**✓ Qué funciona**
- Validación del token en servidor con rate limit antes de renderizar nada.
- Mensajes distintos para invitación vencida vs. inválida, cada uno con su propia salida correcta.
- Google reutiliza el mismo token — no duplica la invitación.

**⚠ Qué confunde**
- No se identifica quién invitó ni desde qué organización — para un no técnico, un link de "activación con token" sin marca reconocible puede leerse como sospechoso.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: "Fuiste invitado por [organización/administrador]" en el encabezado, para dar confianza y contexto inmediato.

**Prioridad:** P1 · **Esfuerzo:** S · **Impacto:** Alto

---

## 04 — Solicitar activación

**Propósito:** pedir el reenvío de una invitación vencida o perdida.

**✓ Qué funciona**
- Mismo patrón anti-enumeración que el recupero de contraseña — consistente.

**⚠ Qué confunde**
- Un error real de sistema (no de negocio) no se distingue del caso "no encontramos la invitación": el usuario siempre ve éxito, incluso si el email nunca se envió por una falla técnica, sin ninguna vía de recuperación.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: distinguir "no hay invitación asociada" (mensaje neutro actual) de errores reales de sistema, sin romper el patrón anti-enumeración de negocio.

**Prioridad:** P1 · **Esfuerzo:** S · **Impacto:** Medio

---

## 05 — Planes

**Propósito:** elegir plan comercial y entrar a checkout.

**✓ Qué funciona**
- Precios resueltos en servidor, no manipulables desde el cliente.
- Un plan sin proveedor de pago configurado se muestra como "Próximamente disponible" en vez de ocultarse — mantiene el catálogo completo visible.
- Estado vacío contemplado si no hay planes activos.

**⚠ Qué confunde**
- Decisión de alto compromiso (pago recurrente) con poca ayuda: sin plan recomendado, sin FAQ de facturación/cancelación en la misma pantalla.

**Recomendaciones**
- Eliminar / Simplificar: —
- Reorganizar: destacar visualmente el plan más elegido/recomendado, si existe uno.
- Agregar: FAQ corta inline (cancelación, facturación) para bajar la ansiedad de decisión.

**Prioridad:** P2 · **Esfuerzo:** M · **Impacto:** Medio

---

## 06 — Resultado de suscripción

**Propósito:** pantalla de retorno tras pagar en Mercado Pago.

**✓ Qué funciona**
- Decisión correcta de no confiar en parámetros de la URL — la única fuente de verdad es el webhook asincrónico, evitando falsos positivos de activación.

**⚠ Qué confunde**
- Pantalla sin expectativa de tiempo: el usuario no sabe si esperar 10 segundos o 10 minutos, ni si le va a llegar un aviso. El único link ("volver a login") probablemente lo devuelve al mismo estado sin membresía activa todavía.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: expectativa de tiempo explícita y confirmación de que llega un email cuando se active, para no forzar al usuario a reingresar por las suyas.

**Prioridad:** P1 · **Esfuerzo:** S · **Impacto:** Alto — es el momento de mayor ansiedad del usuario

---

## 07 — Navegación persistente

**Propósito:** sidebar y barra superior que enmarcan toda la app autenticada.

**✓ Qué funciona**
- 4 secciones principales — carga cognitiva de navegación baja, buena decisión de no saturar.
- "Nueva Propuesta" siempre visible y accesible, coherente con cuál es la acción primaria del producto.
- Rol visible en la barra superior da contexto claro de permisos.

**⚠ Qué confunde**
- No hay búsqueda global: con volumen real de clientes/propuestas, encontrar algo específico obliga a navegar sección por sección.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: búsqueda global simple (cliente/propuesta) en la barra superior — deuda de escalabilidad, no urgente para el volumen actual.

**Prioridad:** P2 · **Esfuerzo:** M · **Impacto:** Medio hoy, alto a futuro

---

## 08 — Panel de Control

**Propósito:** pantalla de aterrizaje tras iniciar sesión — orientación rápida y actividad reciente.

**✓ Qué funciona**
- Saludo y copy adaptativo según si el asesor ya tiene propuestas o no.
- Tabla de actividad reciente da sensación de continuidad con el trabajo previo.

**⚠ Qué confunde**
- La tarjeta "Mis propuestas" está deshabilitada sin ninguna explicación — el usuario no sabe si es un permiso, un bug o algo que no existe.
- La tarjeta rotulada "Configuración" en realidad lleva a crear una propuesta nueva, no a ajustes de cuenta — rompe el modelo mental por completo.
- El botón de tres puntos en cada fila de actividad reciente no tiene ninguna acción conectada: parece interactivo y no hace nada al clickearlo.
- Existen dos flujos distintos para crear una propuesta (diálogo del dashboard vs. pantalla dedicada) — comportamiento potencialmente divergente entre uno y otro.

**Recomendaciones**
- Eliminar: el botón de tres puntos sin acción — es peor tenerlo roto que no tenerlo. La tarjeta "Configuración" mal enlazada, hasta corregirla.
- Simplificar: un solo flujo de creación de propuesta, no dos.
- Reorganizar: "Mis propuestas" debería ser el primer acceso funcional, no una tarjeta apagada — es probablemente la necesidad #1 de un usuario recurrente.
- Agregar: un listado real de propuestas con filtro/búsqueda — hoy el único inventario visible son las últimas 8, sin forma de ver el resto.

**Prioridad:** P0 · **Esfuerzo:** M · **Impacto:** Alto — mayor tráfico del producto y donde más se rompe la confianza

---

## 09 — Clientes

**Propósito:** alta, edición y consulta de clientes que reciben propuestas.

**✓ Qué funciona**
- CRUD claro, paginación con estados deshabilitados correctos en los bordes.
- Estado vacío con llamado a la acción embebido.
- Validación inline en el formulario compartido de alta/edición.

**⚠ Qué confunde**
- La columna "Estado" (Activo/Inactivo) se muestra en la tabla pero no hay ninguna forma de cambiarla — parece un dato editable, como suele serlo en cualquier CRUD, pero es de solo lectura.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: acción de activar/desactivar cliente — clave para un productor que gestiona cartera y necesita archivar sin perder historial de propuestas.

**Prioridad:** P1 · **Esfuerzo:** S · **Impacto:** Medio

---

## 10 — Detalle de propuesta

**Propósito:** hub de una propuesta: resumen ejecutivo, estado y versiones emitidas.

**✓ Qué funciona**
- Skeleton real de carga — de las pocas pantallas con ese cuidado.
- Placeholder que dirige al wizard cuando falta contenido, en vez de mostrar vacío sin salida.
- Historial de versiones con badges de estado claros.

**⚠ Qué confunde**
- "Archivar" se ejecuta al instante, sin confirmación, sobre una propuesta que representa trabajo comercial real con un cliente.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: confirmación antes de archivar, con copy claro de qué implica y si es reversible.

**Prioridad:** P0 · **Esfuerzo:** S · **Impacto:** Alto — esfuerzo mínimo, previene pérdida real de trabajo

---

## 11 — Wizard de edición (el corazón del producto)

**Propósito:** construcción de la propuesta en 8 pasos: Cliente, Información, Diagnóstico, Alternativas, Recomendación, Beneficios, Comparativa, Resumen.

**✓ Qué funciona**
- Secuencia de pasos correcta: sigue el orden real de una venta consultiva (diagnóstico → alternativas → recomendación → beneficios → comparativa).
- Autosave con indicador de estado visible.
- Resumen final con links de vuelta a cada sección y estado vacío propio por bloque.
- "Finalizar propuesta" y "Emitir versión" están separados con copy que aclara que no son lo mismo — evita el error de creer que finalizar equivale a enviar.

**⚠ Qué confunde**
- 8 pasos sin indicador de avance real ni estimación de esfuerzo restante — y no pesan lo mismo (Cliente es un clic, Alternativas puede ser 20 minutos).
- Borrar una alternativa es inmediato, sin confirmación — puede ser texto que costó tiempo redactar.
- El conflicto de autosave ("se modificó en otra sesión") obliga a elegir entre "recargar" o "conservar mi edición" a ciegas, sin mostrar qué cambió.
- Breve parpadeo en blanco al entrar mientras el store del cliente hidrata.

**Recomendaciones**
- Eliminar: nada estructural — los 8 pasos están bien pensados.
- Simplificar: agrupar los 8 pasos en 3 fases visuales (Configuración → Redacción → Cierre) sin tocar la lógica interna, para bajar la carga de orientación.
- Reorganizar: el orden interno es correcto, sin cambios.
- Agregar: confirmación al borrar contenido no vacío; indicador de avance real ("3 de 7 secciones completas"); un resumen mínimo de qué cambió antes de forzar la elección en un conflicto de autosave.

**Prioridad:** P0 · **Esfuerzo:** M–L según ítem · **Impacto:** Alto — pantalla de mayor tiempo de uso, la fricción se multiplica por cada propuesta

---

## 12 — Preview de versión

**Propósito:** vista de solo lectura de una versión emitida (inmutable) antes de generar el PDF.

**✓ Qué funciona**
- Separación correcta entre versión emitida e inmutable y edición en curso — el cliente nunca recibe cambios a mitad de camino.
- Acciones Generar/Descargar con estados de carga y error inline.

**⚠ Qué confunde**
- No existe ninguna acción de "enviar" — el asesor genera y descarga el PDF y después debe salir del producto (mail, WhatsApp) para hacérselo llegar al cliente.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: acción de enviar/compartir la propuesta directamente desde esta pantalla — hoy el recorrido se corta justo antes del momento de mayor valor.

**Prioridad:** P1 · **Esfuerzo:** L · **Impacto:** Alto — cierra el loop comercial completo

---

## 13 — Biblioteca

**Propósito:** contenido reutilizable (narrativas, beneficios, plantillas) para agilizar la redacción.

**✓ Qué funciona**
- Nada todavía — es una pantalla decorativa por diseño intencional (confirmado como pendiente para un sprint futuro).

**⚠ Qué confunde**
- Es indistinguible de una pantalla terminada: buscador que no busca, badges que no filtran, tarjetas de "Favoritos" de demo fijas. Un asesor que interactúa y no pasa nada no sabe si es un bug o si el feature no existe — mismo problema de confianza que el botón de tres puntos del dashboard, pero a nivel de sección completa.

**Recomendaciones**
- Eliminar: los elementos que simulan interactividad sin tenerla (buscador, badges) mientras no estén conectados.
- Simplificar / Reorganizar: —
- Agregar: un estado explícito de "Próximamente" — mismo patrón ya usado en Planes — en vez de simular una pantalla funcional vacía.

**Prioridad:** P0 · **Esfuerzo:** S · **Impacto:** Alto — costo de arreglo mínimo frente al daño de confianza que genera

---

## 14 — Mi Marca

**Propósito:** configurar identidad comercial (logo, firma, colores, datos de contacto) usada en los documentos generados.

**✓ Qué funciona**
- Buen agrupamiento en tres bloques temáticos (identidad, imágenes, paleta).
- Preview local de logo/firma antes de guardar.
- Un solo submit para todo el formulario — reduce clics frente a guardar por sección.

**⚠ Qué confunde**
- El banner de éxito queda pegado en pantalla hasta la próxima interacción, en vez de expirar — puede leerse como desactualizado si el usuario vuelve más tarde a la misma sesión.

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: preview en vivo de cómo se ve la marca aplicada a una propuesta real — hoy se configura a ciegas hasta generar un PDF de verdad.

**Prioridad:** P2 · **Esfuerzo:** M · **Impacto:** Medio

---

## 15 — Membresía

**Propósito:** ver el estado de la suscripción y período vigente.

**✓ Qué funciona**
- Los 9 estados posibles de membresía están bien mapeados a mensajes legibles.
- Enlaces contextuales según el estado, más un mail de soporte siempre presente.

**⚠ Qué confunde**
- Es 100% de solo lectura: no hay cambio de plan, actualización de medio de pago, historial de facturas ni cancelación self-service — todo camino termina en "escribir a soporte".

**Recomendaciones**
- Eliminar / Simplificar / Reorganizar: —
- Agregar: como mínimo, historial de pagos/facturas (el dato ya existe en el sistema). A mediano plazo, cambio de plan y medio de pago self-service.

**Prioridad:** P1 · **Esfuerzo:** L · **Impacto:** Medio-alto — reduce carga de soporte y sube autonomía percibida

---

## Hallazgos transversales

Lectura del producto completo contra las dimensiones solicitadas. No repite lo ya dicho por pantalla — señala patrones que solo se ven mirando el conjunto.

- **Onboarding:** no hay checklist de primeros pasos. El orden lógico de setup real (Marca → Clientes → Primera propuesta) no está sugerido en ningún lado; el usuario lo tiene que descubrir solo.
- **Consistencia funcional:** el punto más débil del producto: dos flujos de creación de propuesta, un botón sin acción, un link mal etiquetado, una sección que aparenta funcionar sin hacerlo.
- **Affordances:** problema central de esta auditoría: varios elementos parecen interactivos (menú de tres puntos, buscador y badges de Biblioteca) y no lo son. Rompe más confianza que no tener el elemento.
- **Discoverability:** "Ver mis propuestas" y "enviar propuesta al cliente" — probablemente las dos necesidades más frecuentes de un usuario recurrente — no tienen ruta propia hoy.
- **Confirmaciones:** ausentes en las dos acciones verdaderamente destructivas del producto: archivar propuesta y borrar una alternativa/beneficio con contenido. Es el hallazgo transversal más urgente.
- **Estados vacíos:** bien resueltos con `EmptyState` + CTA en Clientes y Dashboard; mal resuelto en Biblioteca, que es un vacío disfrazado de contenido real.
- **Estados de carga:** inconsistentes: solo el detalle de propuesta tiene skeleton. El resto renderiza server-side sin ningún indicador intermedio.
- **Estados de error:** sólidos en formularios (Zod inline, banners de servidor). Débiles en Solicitar Activación, donde un error real de sistema queda silenciado detrás del mensaje de éxito genérico.
- **Carga cognitiva:** el wizard es el punto más alto del producto — mitigable agrupando los 8 pasos en 3 fases sin tocar la lógica, tal como se detalla en la pantalla 11.
- **Cantidad de clics / decisiones:** no hay exceso de clics como problema principal — el problema es la redundancia (dos caminos para crear una propuesta) y la falta de ayuda en decisiones de alto compromiso (elegir plan sin comparación asistida).
- **Accesibilidad:** no verificable sin auditoría visual/DOM en vivo (contraste, foco, lectores de pantalla). Señal de riesgo desde el código: selectores de color nativos y zonas de arrastrar-y-soltar de archivos suelen carecer de etiquetas accesibles si no se revisaron explícitamente. Recomendado como ítem de backlog dedicado, no cubierto por esta auditoría de flujo.
- **Responsive / notebook / monitor grande:** la sidebar colapsable y el scroll horizontal en preview sugieren que se pensó en pantallas chicas. En monitores grandes (≥1440px), varias pantallas de ancho fijo (formularios, planes) probablemente dejen espacio vacío sin aprovechar a los costados — vale una revisión puntual de `max-width`.

---

## Backlog priorizado

Ordenado por el impacto en confianza y continuidad del trabajo del usuario, no por facilidad técnica de implementación.

### P0 — Riesgo de confianza o pérdida de trabajo

| # | Ítem | Pantalla | Impacto esperado | Esfuerzo |
|---|---|---|---|---|
| 1 | Confirmación antes de archivar una propuesta | Detalle de propuesta | Previene pérdida de visibilidad sobre trabajo comercial real | S |
| 2 | Confirmación antes de borrar una alternativa/beneficio con contenido | Wizard | Previene pérdida de texto redactado | S |
| 3 | Corregir o quitar el menú de tres puntos sin acción | Panel de Control | Elimina un affordance roto que erosiona confianza en toda la app | S |
| 4 | Corregir el link de la tarjeta "Configuración" | Panel de Control | Restaura el modelo mental del usuario | S |
| 5 | Marcar Biblioteca como "Próximamente" o retirarla del menú | Biblioteca | Evita que una sección vacía se lea como una sección rota | S |
| 6 | Unificar los dos flujos de creación de propuesta en uno solo | Panel de Control / Nueva propuesta | Elimina comportamiento divergente y duplicación de mantenimiento | M |

### P1 — Cierra huecos funcionales de alto valor

| # | Ítem | Pantalla | Impacto esperado | Esfuerzo |
|---|---|---|---|---|
| 7 | Listado real de "Mis propuestas" con búsqueda y paginación | Panel de Control | Cubre la necesidad #1 de un usuario recurrente, hoy sin ruta | M |
| 8 | Acción de enviar/compartir la propuesta desde el preview | Preview de versión | Cierra el loop comercial completo dentro del producto | L |
| 9 | Expectativa de tiempo tras el checkout | Resultado de suscripción | Reduce ansiedad en el momento de mayor incertidumbre del usuario | S |
| 10 | Mostrar quién invitó en la pantalla de activación | Activación de cuenta | Sube confianza en la primera impresión del producto | S |
| 11 | Distinguir errores reales de "sin invitación" en Solicitar Activación | Solicitar activación | Evita fallos silenciosos sin vía de recuperación | S |
| 12 | Activar/desactivar cliente | Clientes | Permite gestionar cartera sin perder historial | S |
| 13 | Canal de soporte explícito en acceso restringido | Login | Evita que un usuario legítimo bloqueado sienta que el producto está roto | S |
| 14 | Historial de facturas en Membresía | Membresía | Reduce fricción y carga de soporte por consultas de facturación | L |

### P2 — Mejoras de calidad, no urgentes

| # | Ítem | Pantalla | Impacto esperado | Esfuerzo |
|---|---|---|---|---|
| 15 | Agrupar el wizard en 3 fases visuales + indicador de avance real | Wizard | Baja la carga cognitiva percibida sin tocar la lógica interna | M |
| 16 | Reintento inline cuando el link de recuperación venció | Recupero de contraseña | Ahorra una pantalla y dos clics en un flujo de baja frecuencia | S |
| 17 | Destacar plan recomendado + FAQ inline | Planes | Mejora conversión en una decisión de alto compromiso | M |
| 18 | Preview en vivo de la marca aplicada | Mi Marca | Elimina la configuración "a ciegas" de identidad visual | M |
| 19 | Búsqueda global en la barra superior | Navegación | Escalabilidad a medida que crece el volumen de datos | M |
| 20 | Auditoría de accesibilidad dedicada (contraste, foco, labels) | Transversal | No cubierto por esta auditoría de flujo — requiere inspección visual/DOM | M |
| 21 | Revisión de uso de espacio en monitores grandes | Transversal | Evita desperdicio de espacio en pantallas ≥1440px | S |
