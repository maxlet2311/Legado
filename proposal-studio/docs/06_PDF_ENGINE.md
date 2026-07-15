# Proposal Studio™
## 06_PDF_ENGINE.md

Versión: 1.0
Estado: Frozen

---

# Objetivo

Este documento define el funcionamiento del motor de generación de documentos PDF de Proposal Studio™.

El PDF constituye el entregable final del producto.

Por este motivo, el motor de renderizado debe priorizar:

- claridad;
- consistencia;
- legibilidad;
- calidad editorial;
- velocidad de generación.

Toda propuesta exportada debe representar exactamente la vista previa mostrada al usuario.

---

# Filosofía

Proposal Studio no genera cotizaciones.

Genera documentos de consultoría.

El cliente debe sentir que recibe una estrategia personalizada.

Nunca un formulario.

Nunca un reporte técnico.

Nunca un PDF de aseguradora.

---

# Principios

Todo PDF debe cumplir los siguientes principios.

## Claridad

La información debe comprenderse rápidamente.

---

## Jerarquía

Cada página debe tener un objetivo.

Nunca competir por la atención.

---

## Respiración

Mucho espacio en blanco.

Nunca llenar páginas.

---

## Profesionalismo

Debe parecer un documento realizado por una consultora premium.

No por un software.

---

## Consistencia

Todas las propuestas deben compartir el mismo lenguaje visual.

---

# Formatos soportados

Versión inicial.

- A4 Vertical
- A4 Horizontal

Preparado para futuras versiones:

- Carta
- Legal
- Presentación 16:9

---

# Arquitectura del documento

Toda propuesta se construye mediante secciones independientes.

Cada sección puede:

- mostrarse;
- ocultarse;
- reordenarse.

El motor nunca depende de un orden fijo.

---

# Orden recomendado

1.

Portada

↓

2.

Resumen Ejecutivo

↓

3.

Diagnóstico

↓

4.

Estrategia

↓

5.

Alternativas

↓

6.

Comparativa

↓

7.

Beneficios

↓

8.

Próximos pasos

↓

9.

Nota legal

---

# Portada

Debe incluir:

- logo
- nombre del cliente
- título
- subtítulo
- asesor
- fecha

Nunca debe incluir tablas.

Nunca mostrar datos técnicos.

La portada vende la propuesta.

No el producto.

---

# Resumen Ejecutivo

Constituye la sección más importante del documento.

Debe responder:

¿Qué entendimos?

¿Qué detectamos?

¿Qué proponemos?

¿Por qué?

No debe superar media página.

Debe poder leerse en menos de un minuto.

---

# Diagnóstico

Resume la situación del cliente.

Puede incluir:

- riesgos;
- oportunidades;
- prioridades;
- objetivos.

Debe utilizar lenguaje simple.

Nunca lenguaje técnico asegurador.

---

# Estrategia

Explica la solución recomendada.

No describe pólizas.

Describe una estrategia.

Debe conectar el diagnóstico con las alternativas.

---

# Alternativas

Cada alternativa se presenta como una Card.

Debe contener únicamente la información relevante.

Ejemplos:

- nombre
- prima
- suma asegurada
- fondo estimado
- plazo

Nunca mostrar más información de la necesaria.

---

# Alternativa recomendada

Debe destacarse visualmente.

Elementos permitidos:

- borde destacado
- badge
- etiqueta

Nunca utilizar colores agresivos.

Debe percibirse como una recomendación.

No como una imposición.

---

# Comparativa

La comparativa debe responder una única pregunta.

¿Cuál alternativa se adapta mejor?

Las columnas son configurables.

Las filas también.

Debe poder leerse en menos de diez segundos.

---

# Beneficios

Presentar beneficios como Cards.

Cada Card contiene:

- icono
- título
- descripción breve

No utilizar párrafos extensos.

---

# Próximos pasos

La propuesta finaliza indicando cómo continuar.

Nunca utilizar lenguaje de presión comercial.

Siempre proponer una conversación.

Ejemplos:

- coordinar una reunión;
- resolver dudas;
- revisar alternativas.

---

# Nota legal

Opcional.

Siempre ubicada al final.

Tipografía pequeña.

Nunca competir con el contenido principal.

---

# Numeración

Todas las páginas, excepto la portada, deben numerarse.

Formato:

Página X de Y

---

# Header

Opcional.

Puede incluir:

- logo;
- nombre del cliente;
- título abreviado.

Debe ser discreto.

---

# Footer

Debe incluir:

- asesor;
- matrícula;
- teléfono;
- email;
- sitio web.

Nunca sobrecargar.

---

# Saltos de página

El motor debe evitar:

- títulos aislados;
- tablas partidas;
- Cards divididas;
- comparativas incompletas.

Si una sección no entra completa:

Moverla completa a la siguiente página.

---

# Viudas y huérfanas

Nunca dejar:

- un título al final de página;
- una línea aislada;
- una Card partida.

---

# Espaciado

El espacio forma parte del diseño.

Priorizar:

- márgenes amplios;
- separación entre bloques;
- lectura cómoda.

---

# Tipografía

Utilizar únicamente la tipografía definida en el Design System.

Nunca reemplazarla.

---

# Colores

Utilizar exclusivamente los colores definidos por la marca seleccionada.

No utilizar colores hardcodeados.

---

# Imágenes

Toda imagen debe:

- mantener proporción;
- alta resolución;
- nunca deformarse.

---

# Iconografía

Utilizar exclusivamente Lucide.

Nunca emojis.

---

# Componentes renderizables

El motor únicamente renderiza componentes.

No renderiza HTML arbitrario.

Componentes permitidos:

- Cover
- Summary
- Diagnosis
- Strategy
- AlternativeCard
- ComparisonTable
- BenefitCard
- CTASection
- LegalNote

---

# Configuración

Cada propuesta puede definir:

- orientación;
- tema;
- portada;
- footer;
- numeración;
- nota legal;
- secciones visibles.

Toda configuración pertenece a proposal_settings.

---

# Render Pipeline

Toda exportación sigue exactamente el siguiente flujo.

1.

Cargar Proposal

↓

2.

Cargar configuración

↓

3.

Resolver narrativa

↓

4.

Resolver alternativas

↓

5.

Resolver beneficios

↓

6.

Resolver secciones

↓

7.

Construir documento virtual

↓

8.

Aplicar Design System

↓

9.

Generar Preview

↓

10.

Generar PDF

↓

11.

Guardar render_json

↓

12.

Crear Proposal Version

↓

13.

Registrar Proposal Event

---

# Render JSON

Antes de generar el PDF, el motor crea una representación completa del documento.

render_json contiene:

- estructura;
- estilos;
- orden;
- contenido;
- configuración.

El PDF se genera exclusivamente desde render_json.

Nunca directamente desde las tablas.

---

# Performance

Objetivos.

Vista previa:

< 300 ms

PDF:

< 2 segundos

Documentos grandes:

< 5 segundos

---

# Consistencia

La vista previa y el PDF deben ser visualmente idénticos.

No se aceptan diferencias de:

- márgenes;
- tamaños;
- tipografía;
- espaciado;
- colores.

---

# Versionado

Toda exportación genera una nueva Proposal Version.

Cada versión almacena:

- snapshot_json
- render_json
- fecha
- usuario

Las versiones nunca se modifican.

---

# Auditoría

Toda exportación registra un Proposal Event.

Ejemplos:

- preview_generated
- pdf_generated
- pdf_downloaded
- proposal_exported

---

# Accesibilidad

El PDF debe:

- mantener alto contraste;
- utilizar tamaños legibles;
- evitar bloques excesivamente densos.

---

# Preparado para IA

En futuras versiones la IA podrá:

- reorganizar secciones;
- resumir narrativas;
- optimizar beneficios;
- generar portadas;
- proponer CTAs;
- adaptar el tono según el cliente.

La IA nunca modifica directamente el PDF.

Siempre modifica el contenido antes del renderizado.

---

# Regla de oro

El motor de PDF nunca toma decisiones comerciales.

Únicamente representa visualmente la estrategia construida por Proposal Studio.

La inteligencia pertenece al sistema.

La presentación pertenece al motor de renderizado.