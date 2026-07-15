# Proposal Studio™
## 03_DESIGN_SYSTEM.md

Versión: 1.0
Estado: Draft

---

# Objetivo

Este documento define las reglas visuales y de experiencia de usuario de Proposal Studio.

Todo componente desarrollado deberá respetar estas especificaciones.

No se permiten decisiones de diseño improvisadas.

---

# Filosofía de diseño

Proposal Studio no debe sentirse como un software de seguros.

Debe sentirse como un producto SaaS premium.

Inspiraciones principales:

- Apple
- Linear
- Stripe Dashboard
- Notion
- Arc Browser
- Vercel

La experiencia debe transmitir:

- claridad
- profesionalismo
- tranquilidad
- confianza
- simplicidad
- control

Nunca debe transmitir:

- complejidad
- burocracia
- software corporativo antiguo
- exceso de información
- sensación financiera o bursátil

---

# Principios de diseño

## Claridad antes que cantidad

Siempre mostrar la información mínima necesaria.

---

## Mucho espacio en blanco

El aire forma parte del diseño.

Nunca intentar llenar espacios vacíos.

---

## Jerarquía visual

Cada pantalla debe tener un único punto focal.

El usuario siempre debe saber cuál es la acción principal.

---

## Consistencia

Un mismo componente nunca debe verse diferente en otra pantalla.

---

## Progresividad

La información aparece cuando es necesaria.

Nunca mostrar configuraciones avanzadas antes de tiempo.

---

# Paleta de colores

> [!IMPORTANT]
> **Paleta de Colores Oficial (Stitch Export):**
> La paleta de colores oficial y definitiva de Proposal Studio™ es la especificada en el **export final de Stitch** (ubicado en [stitch_premium_proposal_engine](file:///c:/Users/maxle.GMPUPPY/OneDrive/IA/CLIENTES/ARIEL%20MARCOS/proposal-studio/stitch-export/stitch_premium_proposal_engine/)). Esta paleta prevalece y tiene precedencia absoluta sobre cualquier especificación o paleta previa descrita a continuación.

## Colores base

Background

#F8F9FB

Surface

#FFFFFF

Border

#E5E7EB

Text Primary

#111827

Text Secondary

#6B7280

Success

#22C55E

Warning

#F59E0B

Error

#EF4444

Info

#3B82F6

---

# Paletas por tipo de propuesta

## Personas

Primary

Verde Oliva

#596B4D

Secondary

Crema

#F6F2E9

Accent

Ocre

#C49752

---

## Empresas

Primary

Azul Francia

#2457A7

Secondary

Azul profundo

#162A46

Accent

Dorado

#C7A45B

La selección del tipo de cliente cambia automáticamente la identidad visual de la propuesta.

Nunca modifica el diseño del sistema.

---

# Tipografía

Fuente principal

Inter

Alternativa

SF Pro Display

---

# Escala tipográfica

Display

48 px

H1

36 px

H2

30 px

H3

24 px

H4

20 px

Body Large

18 px

Body

16 px

Small

14 px

Caption

12 px

---

# Peso tipográfico

Display

700

Títulos

600

Texto

400

Caption

400

Nunca utilizar más de tres pesos diferentes en una misma pantalla.

---

# Grid

Desktop

12 columnas

Máximo ancho

1440 px

Contenido

1280 px

Padding lateral

32 px

Gap

24 px

---

# Espaciado

Unidad base

8 px

Espaciados permitidos

8

16

24

32

48

64

96

Nunca utilizar valores arbitrarios.

---

# Bordes

Radio XS

6 px

Radio SM

8 px

Radio MD

12 px

Radio LG

16 px

Radio XL

24 px

No utilizar bordes completamente redondos salvo en avatares.

---

# Sombras

Muy sutiles.

Nunca utilizar sombras oscuras.

Priorizar profundidad mediante contraste y espacio.

---

# Iconografía

Biblioteca

Lucide React

Reglas

Nunca utilizar emojis.

Nunca mezclar bibliotecas.

Todo icono debe tener el mismo tamaño visual.

---

# Botones

## Primario

Color principal

Texto blanco

Radio MD

Altura 48 px

---

## Secundario

Fondo blanco

Borde gris

Texto oscuro

---

## Ghost

Sin fondo

Sin borde

Solo texto

---

## Danger

Rojo

Solo para acciones destructivas.

---

# Inputs

Altura

48 px

Radio

12 px

Borde gris

Focus

Color primario

Nunca utilizar placeholders como reemplazo del label.

Todo campo debe tener label.

---

# Select

Mismo estilo que Input.

---

# Checkbox

Minimalista.

No utilizar estilos por defecto del navegador.

---

# Radio

Cards seleccionables.

No utilizar radio buttons clásicos cuando existan pocas opciones importantes.

---

# Cards

Toda información importante vive dentro de Cards.

Características

Background blanco

Border gris

Padding generoso

Radio 16 px

Sombras mínimas

---

# Tablas

Minimalistas.

Mucho espacio.

Separadores suaves.

No utilizar grillas pesadas.

La comparativa debe poder leerse en menos de diez segundos.

---

# Sidebar

Ancho

280 px

Background blanco

Separador derecho gris

Siempre visible en desktop.

Colapsable.

---

# Header

Altura

72 px

Debe contener únicamente:

- título
- breadcrumbs
- acciones principales
- perfil

Nunca sobrecargar el Header.

---

# Wizard

Toda creación de propuestas utiliza Wizard.

Debe mostrar:

- progreso
- fase actual
- porcentaje
- botón anterior
- botón siguiente

El usuario siempre debe conocer dónde se encuentra.

---

# Animaciones

Duración

150–250 ms

Curvas suaves.

No utilizar animaciones llamativas.

La interfaz debe sentirse rápida.

---

# Estados

Todo componente debe definir:

Default

Hover

Focus

Active

Disabled

Loading

Error

Success

---

# Responsive

Desktop First.

Breakpoint principal

1024 px

Tablet

768 px

Mobile

480 px

En dispositivos pequeños:

Sidebar colapsable.

Comparativas adaptadas.

Cards apiladas.

Nunca scroll horizontal.

---

# Accesibilidad

Contraste mínimo WCAG AA.

Todos los botones accesibles mediante teclado.

Focus visible.

Labels obligatorios.

Iconos acompañados por texto cuando representen acciones importantes.

---

# Vista previa PDF

La vista previa debe representar exactamente el resultado exportado.

No puede existir ninguna diferencia visual entre Preview y PDF.

---

# Componentes reutilizables

El sistema debe construirse utilizando componentes reutilizables.

Componentes mínimos:

- Button
- Input
- Select
- Checkbox
- RadioCard
- Card
- Badge
- Alert
- Modal
- Sidebar
- Header
- Stepper
- ProposalCard
- BenefitCard
- ComparisonTable
- PDFPreview
- CTASection
- SummarySection

Ninguna pantalla puede implementar componentes propios cuando ya exista uno reutilizable.

---

# Prohibiciones

No utilizar:

- Bootstrap
- estilos inline
- colores hardcodeados
- múltiples tipografías
- emojis
- gradientes agresivos
- glassmorphism
- neón
- sombras exageradas
- animaciones innecesarias

Todo el sistema debe transmitir una sensación premium, sobria y atemporal.

---

# Regla final

Si existe una duda de diseño durante el desarrollo, la decisión correcta será siempre la opción más simple, más clara y más consistente con el resto del sistema.

La simplicidad tiene prioridad sobre la espectacularidad.