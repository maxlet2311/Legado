# Proposal Studio™
## 09_TECH_ARCHITECTURE.md

Versión: 1.0
Estado: Frozen

---

# Objetivo

Este documento define la arquitectura técnica oficial de Proposal Studio™.

Su propósito es establecer una base sólida, escalable y mantenible para el desarrollo del producto.

Toda decisión técnica deberá respetar esta arquitectura.

Las decisiones funcionales pertenecen a los documentos ubicados en `/docs`.

Las decisiones visuales pertenecen a `/stitch-export`.

Este documento define únicamente la implementación tecnológica.

---

# Principios

Toda decisión técnica deberá cumplir los siguientes principios.

## Simplicidad

Elegir siempre la solución más simple que resuelva correctamente el problema.

---

## Escalabilidad

La arquitectura debe soportar crecimiento funcional sin requerir reestructuración.

---

## Mantenibilidad

Todo módulo debe tener una única responsabilidad.

---

## Reutilización

Nunca implementar dos veces el mismo componente.

---

## Performance

Optimizar la experiencia del usuario antes que la complejidad técnica.

---

## Tipado

Todo el proyecto utiliza TypeScript estricto.

No se permite código JavaScript.

---

# Stack tecnológico

## Frontend

- Next.js 15
- React 19
- TypeScript 5
- App Router

---

## UI

- Tailwind CSS v4
- shadcn/ui
- Radix UI
- Lucide React

---

## Backend

- Supabase

Servicios utilizados:

- Authentication
- PostgreSQL
- Storage
- Row Level Security
- Edge Functions (V2)
- Realtime (V2)

---

## Formularios

- React Hook Form
- Zod

Toda validación debe existir tanto en cliente como servidor.

---

## Estado

Estado local:

React State

Estado global:

Zustand

No utilizar Context API para estado de negocio.

Context solo para providers.

---

## Fetching

Server Components por defecto.

Client Components únicamente cuando exista interacción.

No utilizar fetch desde el cliente cuando pueda resolverse en el servidor.

---

## Estilos

Tailwind CSS

Todos los colores provienen de Design Tokens.

Nunca utilizar colores hardcodeados.

---

## Iconografía

Lucide React

No utilizar Material Icons.

No utilizar emojis.

---

# Arquitectura de carpetas

```
app/
```

Contiene únicamente rutas.

No contiene lógica de negocio.

---

```
components/
```

Componentes reutilizables.

Subcarpetas:

- ui
- layout
- dashboard
- wizard
- proposal
- branding
- library

---

```
lib/
```

Lógica compartida.

Subcarpetas:

- auth
- database
- pdf
- proposal
- branding
- business-rules
- utils
- validations

---

```
hooks/
```

Custom Hooks.

---

```
types/
```

Tipos compartidos.

---

```
styles/
```

Variables globales.

---

```
public/
```

Assets.

---

```
docs/
```

Documentación oficial.

Nunca modificar desde el código.

---

```
stitch-export/
```

Referencia visual oficial.

Nunca utilizar como código de producción.

---

# Arquitectura de componentes

Cada componente debe tener una única responsabilidad.

Ejemplo:

```
components/

Button/

Button.tsx

Button.test.tsx

Button.types.ts

index.ts
```

No utilizar archivos gigantes.

---

# Server Components

Utilizar por defecto.

Toda página debe comenzar siendo Server Component.

Solo convertir a Client Component cuando exista:

- interacción
- estado local
- eventos
- drag & drop
- upload
- editor

---

# Client Components

Solo para:

- formularios
- wizard
- uploads
- branding
- preview interactiva

---

# Estado global

Zustand únicamente para:

- wizard
- branding
- usuario autenticado
- preview

No almacenar datos permanentes.

La fuente oficial siempre será Supabase.

---

# Modelo de datos

Toda persistencia sigue exactamente lo definido en:

04_DATA_MODEL.md

Nunca modificar el modelo desde componentes.

---

# Reglas de negocio

Toda lógica comercial pertenece exclusivamente a:

05_BUSINESS_RULES.md

No escribir reglas dentro de componentes React.

---

# Generación del PDF

El motor de PDF constituye un módulo independiente.

Ubicación:

```
lib/pdf/
```

El flujo es:

Proposal

↓

Render JSON

↓

PDF

↓

Storage

↓

Proposal Version

---

## Tecnología

React PDF

Si durante el desarrollo React PDF no permite reproducir fielmente el diseño aprobado, el proyecto migrará a Puppeteer.

La fidelidad visual tiene prioridad sobre la tecnología utilizada.

---

# Branding

Todo branding se obtiene desde:

Brand

↓

Proposal Settings

↓

Render Engine

Nunca desde componentes individuales.

---

# Autenticación

Proveedor:

Supabase Auth.

La sesión se valida exclusivamente desde el servidor.

No almacenar tokens manualmente.

---

# Storage

Buckets oficiales.

brand-assets

proposal-files

proposal-previews

signatures

Nunca almacenar archivos dentro de la base de datos.

---

# Seguridad

Toda tabla utiliza:

Row Level Security.

Todo acceso pasa por Supabase.

No exponer Service Role Key al cliente.

---

# Validaciones

Cliente:

React Hook Form

Servidor:

Zod

Base de datos:

Constraints PostgreSQL

Toda información debe validarse en las tres capas.

---

# Errores

Todo error debe clasificarse.

Tipos.

- Validation Error
- Authentication Error
- Authorization Error
- Database Error
- Network Error
- Unknown Error

Nunca mostrar errores técnicos al usuario.

---

# Logging

Toda acción importante genera un Proposal Event.

Ejemplos.

- login
- proposal_created
- proposal_updated
- pdf_generated
- proposal_exported

---

# Performance

Objetivos.

Primer render.

< 1 segundo

Cambio de paso del Wizard.

< 100 ms

Preview.

< 300 ms

Exportación PDF.

< 2 segundos

---

# Testing

Toda lógica crítica deberá poseer pruebas.

Prioridades.

- Business Rules
- PDF Engine
- Proposal Builder

No es obligatorio testear componentes visuales simples.

---

# Accesibilidad

Cumplimiento mínimo.

WCAG AA.

Todo formulario:

- labels
- foco visible
- navegación por teclado

---

# Internacionalización

Versión 1.

Español.

La arquitectura debe permitir incorporar múltiples idiomas sin modificar componentes.

Todo texto visible deberá centralizarse.

---

# Convenciones

Idioma del código.

Inglés.

Idioma de la interfaz.

Español.

---

## Archivos

PascalCase.

---

## Componentes

PascalCase.

---

## Variables

camelCase.

---

## Constantes

UPPER_SNAKE_CASE.

---

## Base de datos

snake_case.

---

# Dependencias

Agregar una nueva librería únicamente cuando:

- resuelva un problema real;
- sea ampliamente mantenida;
- reduzca código;
- no exista una solución nativa equivalente.

---

# Principio de desarrollo

La documentación constituye la fuente oficial del comportamiento.

El código implementa la documentación.

Nunca ocurre al revés.

---

# Fuente oficial de verdad

En caso de conflicto:

1. Product Spec
2. Business Rules
3. Data Model
4. PDF Engine
5. Branding System
6. Design System
7. Stitch Export

El código siempre deberá adaptarse a estas fuentes.

---

# Regla final

Proposal Studio™ se construirá como un producto SaaS enterprise.

Toda decisión técnica deberá priorizar:

- simplicidad;
- consistencia;
- reutilización;
- rendimiento;
- mantenibilidad.

Si existen varias soluciones técnicamente correctas, se elegirá siempre la más simple de mantener durante los próximos cinco años.