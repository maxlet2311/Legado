# Proposal Studio™
## 10_COMPONENT_LIBRARY.md

Versión: 1.0
Estado: Frozen

---

# Objetivo

Este documento define la biblioteca oficial de componentes de Proposal Studio™.

Todos los componentes del sistema deberán construirse reutilizando esta biblioteca.

Ninguna pantalla podrá implementar componentes propios cuando exista uno equivalente.

El objetivo es garantizar:

- consistencia visual;
- reutilización;
- mantenibilidad;
- escalabilidad.

---

# Filosofía

Proposal Studio no construye pantallas.

Construye experiencias reutilizando componentes.

Cada componente debe resolver un único problema.

Los componentes nunca contienen reglas de negocio.

Las reglas pertenecen a `05_BUSINESS_RULES.md`.

---

# Jerarquía

La biblioteca se organiza en cinco niveles.

Level 1

Foundation

↓

Level 2

UI

↓

Level 3

Patterns

↓

Level 4

Business

↓

Level 5

Layouts

---

# FOUNDATION

Tokens visuales.

Nunca renderizan UI.

## Colors

Design Tokens.

## Typography

Escala tipográfica.

## Shadows

Sombras.

## Radius

Bordes.

## Spacing

Sistema de espacios.

## Motion

Duraciones.

## Icons

Lucide.

---

# UI COMPONENTS

Componentes básicos.

## Button

Variantes.

- Primary
- Secondary
- Ghost
- Danger
- Success
- Icon

---

## Input

Tipos.

- Text
- Number
- Currency
- Email
- Phone
- Search

---

## Textarea

Editor multilinea.

---

## Select

Dropdown reutilizable.

---

## MultiSelect

Selección múltiple.

---

## Switch

Activación.

---

## Checkbox

---

## RadioCard

Reemplaza Radio tradicional.

Se utiliza para seleccionar:

- tipo de cliente
- objetivo
- orientación PDF
- tema

---

## Badge

Variantes.

- Draft
- Completed
- Exported
- Archived
- Featured

---

## Avatar

---

## Tooltip

---

## Popover

---

## DropdownMenu

---

## Dialog

---

## Drawer

---

## Alert

---

## Toast

---

## Skeleton

---

## EmptyState

---

## LoadingOverlay

---

## Separator

---

## BUSINESS COMPONENTS

Estos componentes representan el verdadero valor del producto.

---

## ObjectiveSelector

Selector visual del objetivo principal.

Cards grandes.

Con iconografía.

Con descripción.

Este componente inicia todo el Wizard.

---

## ClientTypeSelector

Permite elegir.

- Persona
- Empresa

Cambia automáticamente el branding.

---

## ProposalProgress

Stepper del Wizard.

Debe mostrar.

- porcentaje
- fase
- pasos restantes

---

## ProposalTimeline

Timeline del proceso comercial.

Preparado para futuras versiones.

---

## ProposalHeader

Cabecera de toda propuesta.

Incluye.

- cliente
- objetivo
- estado
- branding

---

## ExecutiveSummaryCard

Renderiza automáticamente el resumen ejecutivo.

Preparado para IA.

---

## DiagnosisCard

Resume:

- situación
- riesgos
- oportunidades
- prioridades

---

## StrategyEditor

Uno de los componentes principales.

Editor enriquecido.

Preparado para IA.

Funciones futuras.

- mejorar texto
- resumir
- cambiar tono
- generar narrativa

---

## BenefitCard

Card individual de beneficio.

Incluye.

- icono
- título
- descripción

---

## BenefitGrid

Distribución automática de BenefitCards.

---

## AlternativeCard

Uno de los componentes centrales.

Debe mostrar.

- producto
- prima
- fondo
- suma asegurada
- badge recomendado

---

## AlternativeCarousel

Permite comparar alternativas visualmente.

Preparado para mobile.

---

## ComparisonTable

Tabla inteligente.

Columnas configurables.

Responsive.

Exportable.

---

## FinancialMetric

Muestra valores económicos.

Ejemplos.

Prima

Capital

Fondo

Rescate

Aporte

---

## RecommendationBadge

Destaca la alternativa recomendada.

Nunca utilizar colores agresivos.

---

## ProposalCTA

Última sección.

Conecta directamente con WhatsApp.

Preparado para múltiples CTAs.

---

## LegalNote

Nota legal reutilizable.

---

## SignatureBlock

Firma del asesor.

Logo.

Matrícula.

Datos.

---

# BRANDING COMPONENTS

---

## BrandPreview

Vista previa de la marca.

---

## LogoUploader

---

## SignatureUploader

---

## BrandColorPicker

No permite colores inválidos.

Valida contraste.

---

## ThemeSelector

Personas.

Empresas.

---

## FooterEditor

---

## ContactCardEditor

---

# LIBRARY COMPONENTS

---

## LibraryCard

---

## TemplateCard

---

## FavoriteButton

---

## SearchToolbar

---

## FilterBar

---

## CategoryTree

---

## RichTextSnippet

---

# PDF COMPONENTS

Estos componentes son exclusivos del motor de renderizado.

---

## PDFCover

---

## PDFHeader

---

## PDFFooter

---

## PDFSection

---

## PDFPageBreak

Control inteligente de saltos.

---

## PDFTable

---

## PDFImage

---

## PDFQuote

---

## PDFHighlight

---

## PDFRenderer

Renderiza todo el documento.

---

# DASHBOARD COMPONENTS

---

## WelcomeHero

Saludo contextual.

---

## KPIGrid

Tarjetas principales.

---

## ActivityFeed

---

## RecentProposals

---

## QuickActions

---

## InsightsPanel

Preparado para IA.

---

# LAYOUT COMPONENTS

---

## AppShell

Layout principal.

---

## Sidebar

---

## TopNavigation

---

## PageHeader

---

## SectionHeader

---

## ContentContainer

---

## WizardLayout

---

## SplitLayout

Dos columnas.

Wizard.

Preview.

---

## InspectorPanel

Panel lateral.

Preparado para futuras versiones.

---

# COMPONENTES IA (V2)

No se implementan en la versión inicial.

La arquitectura queda preparada.

---

## AIAssistant

---

## AISuggestion

---

## AIRewriteButton

---

## AISummaryGenerator

---

## AIStrategyGenerator

---

## AIBenefitGenerator

---

## AICTAOptimizer

---

# COMPONENTES EXPERIMENTALES

Preparados para futuras versiones.

---

## ConfidenceIndicator

Indicador visual del nivel de calidad de la propuesta.

Analiza.

- narrativa
- beneficios
- CTA
- branding

---

## ProposalScore

Puntaje de calidad.

0-100.

---

## ProposalDiffViewer

Comparación entre versiones.

---

## VersionTimeline

Historial visual.

---

## SmartChecklist

Checklist automática antes de exportar.

Ejemplos.

✓ Cliente completo

✓ Estrategia redactada

✓ CTA configurado

✓ Branding validado

✓ Comparativa lista

---

## ExportReadinessIndicator

Semáforo.

Rojo.

Amarillo.

Verde.

Indica si la propuesta está lista para exportarse.

---

# Convenciones

Todos los componentes.

- PascalCase

Una carpeta por componente.

Cada componente contiene.

Component.tsx

Component.types.ts

Component.test.tsx

index.ts

Cuando corresponda.

Component.stories.tsx

---

# Reglas

Todo componente debe ser.

- reutilizable
- tipado
- documentado
- accesible
- desacoplado

Nunca debe conocer:

- Supabase
- PDF
- IA
- reglas comerciales

Solo renderiza información.

---

# Regla final

Proposal Studio™ se construye a partir de componentes.

Las pantallas no son el centro del sistema.

Los componentes son la verdadera unidad de construcción del producto.

Toda nueva funcionalidad deberá implementarse reutilizando la biblioteca existente antes de crear un componente nuevo.