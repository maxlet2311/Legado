# Proposal Studio™
## 04_DATA_MODEL.md

Versión: 3.0  
Estado: Frozen  
Fecha: Julio 2026

---

# Objetivo

Este documento define la arquitectura conceptual y relacional de datos definitiva para Proposal Studio™. Su fin es servir como la única especificación oficial del modelo de datos para el equipo de desarrollo, herramientas automatizadas de IA y agentes de codificación.

Este modelo está diseñado para garantizar la mantenibilidad, escalabilidad empresarial (multi-marca y multi-inquilino) y un alto rendimiento de consultas en Supabase y Next.js, logrando un equilibrio idóneo entre normalización estricta y flexibilidad documental.

---

# Principios de Diseño

El diseño de la base de datos se fundamenta en los siguientes principios de ingeniería:

## 1. Fuente Única de la Verdad (SSOT)
Cada dato de negocio editable (alternativas comerciales, beneficios, narrativas, estructura) reside en un único registro estructurado y tipado. No se duplica información durante el proceso de edición interactiva del borrador.

## 2. Inmutabilidad y Congelación de Historial (Snapshotting)
Dado que las propuestas comerciales exportadas son documentos formales de oferta legal, no deben verse afectadas si el asesor altera posteriormente sus colores de marca, datos de contacto o logotipos. Para garantizar la inmutabilidad visual absoluta, la exportación y congelación del documento genera un snapshot persistente y cerrado.

## 3. Optimización RLS sin Subconsultas Recursivas
Row Level Security (RLS) en Supabase puede degradar el rendimiento al usar joins recursivos en cascada para evaluar permisos. Para optimizar el tiempo de respuesta, se denormaliza la clave de propiedad `user_id` en todas las tablas dependientes directas de una propuesta, permitiendo políticas de validación inmediata (`WHERE user_id = auth.uid()`).

## 4. Separación de Estructura Visual y Contenido de Estrategia
La estructura física de la página y su ordenación (`proposal_sections`) se desacopla por completo del contenido estratégico de la propuesta (`proposal_narratives`), de las cotizaciones técnicas (`proposal_alternatives`) y de los beneficios activados (`proposal_benefits`).

---

# Convenciones y Nomenclatura

* **Esquema de Base de Datos:** PostgreSQL.
* **Nombres de tablas:** Plural, minúsculas, formato `snake_case` (ej. `proposals`, `proposal_narratives`).
* **Nombres de columnas:** Singular, minúsculas, formato `snake_case` (ej. `proposal_number`, `is_recommended`).
* **Claves primarias:** Clave única auto-generada mediante el tipo `UUID` y valor por defecto `gen_random_uuid()` para todos los registros.
* **Claves foráneas:** Siguen el estándar `tabla_destino_singular_id` (ej. `proposal_id`, `client_id`).

---

# Preparación para Organizaciones (V4 Multi-Tenant)

Para evitar la sobreingeniería en la Fase 1 del producto (diseñado inicialmente para asesores independientes), no se implementa una tabla de organizaciones (`organizations`). 

Sin embargo, el esquema queda preparado para soportar multi-tenant de forma nativa: las tablas `profiles`, `brands`, `clients` y `proposals` incorporarán en el futuro una clave foránea opcional `organization_id` (apuntando a una futura tabla `organizations`). RLS se podrá actualizar inmediatamente a nivel de organización sin alterar la estructura básica de datos ni los flujos del editor.

---

# Catálogos y Enumeraciones

Para maximizar el rendimiento y evitar joins innecesarios con fines academicistas, las enumeraciones y tipos se implementan mediante tipos estándar de texto (`varchar` o `text`) validados mediante restricciones de control de dominio (check constraints) en base de datos o lógica fuerte en el backend (TypeScript).

---

# Definición de Entidades

---

## 1. profiles
Extiende la tabla del sistema de autenticación de Supabase (`auth.users`) almacenando la información pública e identidad del asesor.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, References `auth.users(id) ON DELETE CASCADE` | Identificador único del perfil del asesor. |
| `user_id` | UUID | Unique, References `auth.users(id) ON DELETE CASCADE` | Clave foránea redundante de control de autenticación. |
| `full_name` | varchar | Not Null | Nombre completo del asesor comercial. |
| `role` | varchar | Not Null, Default: `'advisor'` | Rol del usuario en el sistema. Valores: `'admin'`, `'advisor'`. |
| `is_active` | boolean | Not Null, Default: `true` | Determina si el asesor tiene acceso al sistema comercial. |
| `created_at` | timestamptz | Not Null, Auto | Fecha y hora de registro. |
| `updated_at` | timestamptz | Not Null, Auto | Fecha y hora de última modificación. |

---

## 2. brands
Almacena la identidad visual corporativa, colores y datos de firma/contacto comercial de los asesores.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de la marca. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Propietario de la identidad visual de marca. |
| `commercial_name` | varchar | Not Null | Nombre comercial del broker u oficina de seguros. |
| `advisor_name` | varchar | Not Null | Nombre visible del asesor que firma la propuesta. |
| `license_number`| varchar | Nullable | Matrícula profesional habilitante ante el ente regulador. |
| `logo_url` | text | Nullable | URL de almacenamiento del logotipo del broker. |
| `primary_color` | varchar | Not Null, Default: `'#596B4D'` | Color primario del documento (formato HEX). |
| `secondary_color`| varchar | Not Null, Default: `'#F6F2E9'` | Color secundario del documento (formato HEX). |
| `accent_color` | varchar | Not Null, Default: `'#C49752'` | Color de acento para botones y alertas (formato HEX). |
| `email` | varchar | Not Null | Email comercial de atención. |
| `phone` | varchar | Nullable | Teléfono comercial de contacto. |
| `whatsapp` | varchar | Nullable | Número de WhatsApp para enlaces directos de chat. |
| `website` | varchar | Nullable | URL de la web comercial. |
| `address` | text | Nullable | Dirección física de las oficinas del broker. |
| `footer_text` | text | Nullable | Texto legal o institucional fijo para pie de página. |
| `signature_image`| text | Nullable | URL del archivo de la firma de puño y letra digitalizada. |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de modificación. |

---

## 3. clients
Almacena la información de los destinatarios. Diseñado con flexibilidad para futuras extensiones CRM.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único del cliente. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Asesor que gestiona la ficha del cliente. |
| `full_name` | varchar | Not Null | Nombre completo del contacto o cliente individual. |
| `company_name` | varchar | Nullable | Razón social o marca comercial (si aplica). |
| `client_type` | varchar | Not Null, Check Constraint | Tipo de cliente. Valores: `'individual'`, `'company'`. |
| `email` | varchar | Not Null | Email principal de contacto. |
| `phone` | varchar | Nullable | Teléfono móvil o directo. |
| `birth_date` | date | Nullable | Fecha de nacimiento (crucial para suscripción de riesgos). |
| `occupation` | varchar | Nullable | Ocupación laboral o actividad productiva principal. |
| `notes` | text | Nullable | Observaciones internas privadas del asesor. |
| `external_reference` | varchar | Nullable, Indexed | Identificador del cliente en sistemas CRM externos. |
| `status` | varchar | Not Null, Default: `'active'` | Estado. Valores: `'active'` (activo), `'inactive'` (inactivo). |
| `metadata` | jsonb | Not Null, Default: `'{}'` | Bolsa estructurada para almacenar campos dinámicos específicos del CRM. |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de modificación. |

---

## 4. proposals
Entidad principal. Centraliza los datos del documento y sus configuraciones visuales integradas para su generación.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de la propuesta. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Creador de la propuesta comercial. |
| `client_id` | UUID | Not Null, References `clients(id) ON DELETE RESTRICT` | Destinatario (borrado restringido si existen propuestas asociadas). |
| `brand_id` | UUID | Nullable, References `brands(id) ON DELETE SET NULL` | Identidad de marca activa asociada a esta propuesta. |
| `proposal_number`| varchar | Not Null, Unique, Indexed | Número correlativo único legible (ej. `PROP-2026-042`). |
| `title` | varchar | Not Null | Título del documento de cara al cliente. |
| `primary_objective`| varchar| Not Null, Check Constraint | Meta principal. Valores: `'protect_family'`, `'build_savings'`, `'retirement'`, `'business_protection'`, `'partners_protection'`, `'employee_retention'`, `'custom'`. |
| `proposal_type` | varchar | Not Null | Clasificación. Valores: `'individual'`, `'corporate'`. |
| `currency` | varchar | Not Null, Check Constraint | Moneda base de la propuesta. Valores: `'ARS'`, `'USD'`, `'EUR'`. |
| `status` | varchar | Not Null, Default: `'draft'` | Estado. Valores: `'draft'`, `'completed'`, `'exported'`, `'archived'`. |
| `version` | integer | Not Null, Default: `1` | Número correlativo de la versión de edición activa. |
| `last_opened_at` | timestamptz | Not Null, Auto | Fecha del último acceso de lectura/edición en plataforma. |
| `last_exported_at`| timestamptz| Nullable | Fecha de la última generación exitosa del PDF. |
| `expires_at` | timestamptz | Nullable | Límite temporal de vigencia comercial de la propuesta. |
| `share_token` | UUID | Not Null, Unique, Default | Token único para enlaces públicos de acceso para clientes. |
| **Configuraciones de Renderizado** | | *(Campos integrados de la antigua `proposal_settings`)* | |
| `orientation` | varchar | Not Null, Default: `'portrait'` | Orientación física del PDF. Valores: `'portrait'`, `'landscape'`. |
| `theme` | varchar | Not Null, Default: `'classic'` | Plantilla visual estética. Valores: `'classic'`, `'modern'`, `'minimalist'`. |
| `font_family` | varchar | Not Null, Default: `'Inter'` | Familia tipográfica. Valores: `'Inter'`, `'Outfit'`, `'SF Pro'`. |
| `pdf_format` | varchar | Not Null, Default: `'A4'` | Dimensiones físicas de la página. Valores: `'A4'`, `'Letter'`. |
| `margin_size` | varchar | Not Null, Default: `'medium'` | Tamaño de márgenes. Valores: `'small'`, `'medium'`, `'large'`. |
| `show_cover` | boolean | Not Null, Default: `true` | Determina si se renderiza la página de portada en el PDF. |
| `show_summary` | boolean | Not Null, Default: `true` | Muestra el resumen ejecutivo e introducción. |
| `show_footer` | boolean | Not Null, Default: `true` | Renderiza pie de página con datos comerciales de marca. |
| `show_page_numbers`| boolean | Not Null, Default: `true` | Inserta numeración de página. |
| `show_legal_note` | boolean | Not Null, Default: `true` | Agrega cláusula legal de exclusión en pie o página final. |
| `show_watermark` | boolean | Not Null, Default: `false` | Activa la marca de agua flotante de fondo. |
| `watermark_text` | varchar | Nullable | Texto del watermark de fondo (ej. `"BORRADOR"`). |
| `primary_color_override` | varchar | Nullable | Sobrescritura HEX opcional del color principal. |
| `secondary_color_override`| varchar | Nullable | Sobrescritura HEX opcional del color secundario. |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de modificación. |

---

## 5. proposal_narratives
Almacena la argumentación consultiva e inteligente que redacta el asesor o el motor de Inteligencia Artificial. Mapea una relación de tipo 1:1 estricta con `proposals`. Esta estructura normalizada garantiza que la IA pueda leer o escribir con tipo de datos estricto campos específicos.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de la narrativa. |
| `proposal_id` | UUID | Unique, References `proposals(id) ON DELETE CASCADE` | Enlace unívoco con la propuesta origen. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Copia de control para optimizar RLS. |
| `executive_summary` | text | Nullable | Introducción comercial / Resumen de valor dirigido al cliente. |
| `current_situation` | text | Nullable | Situación de partida detectada en la entrevista de diagnóstico. |
| `detected_risks` | text | Nullable | Riesgos activos identificados (ej. falta de cobertura, desprotección familiar). |
| `opportunities` | text | Nullable | Oportunidades detectadas (ej. exenciones impositivas, optimización de aportes). |
| `objectives` | text | Nullable | Metas comerciales buscadas por el cliente a corto y largo plazo. |
| `recommended_strategy`| text | Nullable | Justificación conceptual de la solución que se propone en el documento. |
| `expected_result` | text | Nullable | Impacto proyectado tras la implementación de la estrategia recomendada. |
| `final_message` | text | Nullable | Cierre / Mensaje institucional del asesor para incentivar la toma de decisión. |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de modificación. |

---

## 6. proposal_sections
Estructura la composición, orden de páginas y visibilidad de las diferentes hojas que componen la propuesta. **No almacena el contenido del documento**, sino únicamente su metadato estructural (con excepción de secciones personalizadas creadas libremente por el PAS).

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de la sección. |
| `proposal_id` | UUID | References `proposals(id) ON DELETE CASCADE` | Enlace a la propuesta. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Copia de control para optimizar RLS. |
| `section_type` | varchar | Not Null, Check Constraint | Tipo de sección. Valores: `'cover'`, `'executive_summary'`, `'diagnosis'`, `'strategy'`, `'alternatives'`, `'comparison'`, `'benefits'`, `'legal_notes'`, `'call_to_action'`, `'custom'`. |
| `title` | varchar | Not Null | Título que figurará en el encabezado de página del PDF. |
| `custom_content` | text | Nullable | Almacena texto Markdown o HTML únicamente si `section_type` es `'custom'`. Nulo en secciones estándar. |
| `display_order` | integer | Not Null | Secuencia ordinal de impresión/orden en pantalla (1-indexed). |
| `is_visible` | boolean | Not Null, Default: `true` | Control de visibilidad del PAS sobre la sección en el PDF. |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de modificación. |

---

## 7. proposal_alternatives
Representa las diferentes opciones o cotizaciones técnicas que se comparan en la propuesta. El sistema soporta de 1 a 6 alternativas ordenadas.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de la alternativa. |
| `proposal_id` | UUID | References `proposals(id) ON DELETE CASCADE` | Enlace a la propuesta. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Copia de control para optimizar RLS. |
| `title` | varchar | Not Null | Nombre de la opción (ej. `'Plan Gold'`, `'Plan de Ahorro Máximo'`). |
| `category` | varchar | Not Null, Check Constraint | Tipo comercial. Valores: `'protection'`, `'savings'`, `'life_with_savings'`, `'retirement'`, `'business'`. |
| `quotation_number` | varchar | Nullable | Número de cotización interno asignado por la aseguradora origen. |
| `insurance_company` | varchar | Not Null | Nombre de la compañía de seguros proveedora del plan. |
| `product_name` | varchar | Not Null | Nombre comercial del producto de seguro. |
| `currency` | varchar | Not Null, Check Constraint | Moneda de la cotización. Valores: `'ARS'`, `'USD'`, `'EUR'`. |
| `monthly_premium` | numeric(12,2) | Nullable | Importe de la prima de pago mensual. |
| `annual_premium` | numeric(12,2) | Nullable | Importe anualizado neto de la alternativa. |
| `insured_amount` | numeric(12,2) | Nullable | Capital asegurado principal del contrato de seguro. |
| `is_recommended` | boolean | Not Null, Default: `false` | Determina si esta alternativa se destaca en la propuesta. |
| `recommended_reason` | text | Nullable | Texto argumentativo que explica por qué esta opción es la recomendada. |
| `financial_details` | jsonb | Not Null, Default: `'{}'` | Datos específicos estructurados de proyecciones financieras (valores de rescate, proyecciones de fondo, tasas estimadas). |
| `description` | text | Nullable | Resumen detallado de coberturas adicionales del plan. |
| `highlight_label` | varchar | Nullable | Etiqueta para destacar (ej. `'Mejor relación precio/cobertura'`). |
| `is_visible` | boolean | Not Null, Default: `true` | Visibilidad de la alternativa en la tabla comparativa final. |
| `display_order` | integer | Not Null | Orden de renderizado y visualización (de izquierda a derecha). |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de modificación. |

---

## 8. proposal_benefits
Contiene los beneficios específicos vinculados a la propuesta comercial.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único del beneficio de propuesta. |
| `proposal_id` | UUID | References `proposals(id) ON DELETE CASCADE` | Enlace a la propuesta asociada. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Copia de control para optimizar RLS. |
| `title` | varchar | Not Null | Nombre del beneficio (ej. `'Protección por Incapacidad'`). |
| `description` | text | Not Null | Detalle comprensible del beneficio de cara al asegurado. |
| `icon` | varchar | Not Null | Identificador clave de la biblioteca de iconos (ej. `'heart'`, `'shield'`). |
| `category` | varchar | Not Null, Check Constraint | Valores: `'family'`, `'retirement'`, `'tax'`, `'business'`, `'legal'`, `'financial'`, `'health'`, `'succession'`. |
| `display_order` | integer | Not Null | Orden secuencial de presentación del bloque de beneficios. |
| `is_enabled` | boolean | Not Null, Default: `true` | Define si el beneficio se muestra activo en el PDF. |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de modificación. |

---

## 9. proposal_files
Registra los documentos PDF y vistas previas físicas almacenadas en Supabase Storage vinculadas a las propuestas del sistema.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único del registro de archivo. |
| `proposal_id` | UUID | References `proposals(id) ON DELETE CASCADE` | Enlace a la propuesta de origen. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Copia de control para optimizar RLS. |
| `file_type` | varchar | Not Null, Check Constraint | Tipo de archivo. Valores: `'pdf'`, `'preview'`. |
| `storage_path` | text | Not Null | Ruta de almacenamiento físico en el bucket correspondiente de Supabase Storage. |
| `file_size` | integer | Not Null | Tamaño físico del archivo expresado en Bytes. |
| `mime_type` | varchar | Not Null | Tipo MIME del archivo (ej. `'application/pdf'`). |
| `checksum` | varchar | Not Null | Hash SHA-256 del contenido binario para auditar y garantizar la integridad física. |
| `file_name` | varchar | Not Null | Nombre del archivo descargable (ej. `'Propuesta_AM_Seguros.pdf'`). |
| `metadata` | jsonb | Not Null, Default: `'{}'` | Almacena configuraciones del motor de impresión (páginas, versiones de render). |
| `generated_at` | timestamptz | Not Null, Auto | Marca de tiempo exacta del proceso de compilación física del PDF. |

---

## 10. proposal_versions
Historial inmutable de estados de edición de propuestas (Snapshots). Registra las versiones definitivas consolidadas ante cambios mayores o exportaciones formales.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único del snapshot de versión. |
| `proposal_id` | UUID | References `proposals(id) ON DELETE CASCADE` | Enlace a la propuesta. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Copia de control para optimizar RLS. |
| `version_number` | integer | Not Null | Número secuencial correlativo de la versión. |
| `content_json` | jsonb | Not Null | Snapshot relacional completo estructurado (el estado crudo guardado en las tablas). |
| `render_json` | jsonb | Not Null | Representación inmutable procesada y con estilos finales utilizada para renderizar el PDF. |
| `created_by` | UUID | Nullable, References `profiles(id) ON DELETE SET NULL` | Asesor comercial que guardó o generó la versión. |
| `created_at` | timestamptz | Not Null, Auto | Fecha de creación del snapshot de versión. |

---

## 11. proposal_events
Bitácora de auditoría detallada y rastro de actividades relacionadas con el ciclo de vida y la interacción con la propuesta comercial (inclusive lectura de clientes).

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de log de eventos. |
| `proposal_id` | UUID | References `proposals(id) ON DELETE CASCADE` | Enlace a la propuesta asociada. |
| `user_id` | UUID | Nullable, References `profiles(id) ON DELETE SET NULL` | Usuario ejecutor. Nulo si el evento lo realiza el cliente externo (ej. abrir un link). |
| `event_type` | varchar | Not Null, Check Constraint | Acción registrada. Valores: `'created'`, `'updated'`, `'exported'`, `'viewed'` (por cliente), `'status_changed'`, `'shared'`. |
| `payload` | jsonb | Not Null, Default: `'{}'` | Detalle en estructura clave-valor del cambio (ej. campo editado, plataforma). |
| `ip_address` | varchar | Nullable | Dirección IP origen de la solicitud de red. |
| `user_agent` | text | Nullable | Información técnica del cliente web / Navegador de la consulta. |
| `created_at` | timestamptz | Not Null, Auto | Marca de tiempo exacta del evento. |

---

## 12. proposal_templates
Estructura y datos relacionales por defecto de las plantillas base del sistema para iniciar rápidamente la creación de propuestas comerciales del PAS.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de la plantilla base. |
| `title` | varchar | Not Null | Nombre de la plantilla (ej. `'Protección Familiar Integral'`). |
| `description` | text | Nullable | Resumen de los casos de uso recomendados de la plantilla. |
| `proposal_type` | varchar | Not Null | Ámbito de uso. Valores: `'individual'`, `'corporate'`. |
| `preview_image` | text | Nullable | URL de la captura visual o imagen descriptiva de la plantilla. |
| `template_json` | jsonb | Not Null | Datos de estructuración relacional pre-cargados por defecto (secciones, beneficios). |
| `category` | varchar | Not Null, Check Constraint | Temática. Valores: `'family'`, `'savings'`, `'retirement'`, `'business'`. |
| `is_system` | boolean | Not Null, Default: `false` | Define si es plantilla global del sistema (`true`) o plantilla privada del usuario (`false`). |
| `user_id` | UUID | Nullable, References `profiles(id) ON DELETE CASCADE` | Asesor creador del template (nulo en plantillas globales de sistema). |
| `is_default` | boolean | Not Null, Default: `false` | Marca si es la plantilla sugerida por defecto al crear una propuesta nueva. |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de última modificación. |

---

## 13. library_items
Biblioteca de contenidos reutilizables e independientes propiedad del asesor. Facilita la inserción de textos recurrentes y estructurados en las propuestas activas.

| Columna | Tipo de Datos | Restricciones / Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Identificador único de la pieza. |
| `user_id` | UUID | Not Null, References `profiles(id) ON DELETE CASCADE` | Asesor propietario del contenido en biblioteca. |
| `category` | varchar | Not Null, Check Constraint | Valores: `'executive_summary'`, `'strategy'`, `'benefit'`, `'CTA'`, `'legal_note'`, `'proposal_section'`. |
| `title` | varchar | Not Null | Título descriptivo interno del ítem en la biblioteca. |
| `content` | text | Not Null | Texto enriquecido o plano a insertar en la sección correspondiente. |
| `tags` | text[] | Not Null, Default: `'{}'` | Arreglo de términos de búsqueda / indexación temática. |
| `is_favorite` | boolean | Not Null, Default: `false` | Determina si se destaca para accesos directos en el menú del editor. |
| `embedding` | vector(1536) | Nullable, Extensión `pgvector` | Vector de características semánticas para el motor de IA (V2). |
| `created_at` | timestamptz | Not Null, Auto | Registro de creación. |
| `updated_at` | timestamptz | Not Null, Auto | Registro de última modificación. |

---

# Integridad de Datos e Inmutabilidad Histórica

El modelo de base de datos implementa restricciones firmes a nivel de motor PostgreSQL para evitar inconsistencias relacionales:

1. **Cascada de Eliminación (`ON DELETE CASCADE`):** Si una propuesta en la tabla `proposals` es eliminada, todos sus metadatos, alternativas de cotización, secciones físicas, archivos registrados, versiones y logs de eventos de auditoría se eliminan en cascada automática. Esto mantiene la base de datos limpia de registros huérfanos.
2. **Restricción de Borrado Comercial (`ON DELETE RESTRICT`):** No se permite la eliminación de un registro de cliente de la tabla `clients` si este cuenta con al menos una propuesta comercial registrada en `proposals`. Esto garantiza la persistencia e inmutabilidad del histórico de ventas del broker.
3. **Fidelidad del Historial de Ventas (Inmutabilidad Visual):** Cuando el cliente o el PAS vuelven a descargar una propuesta generada hace meses, la aplicación no consulta las tablas relacionales de datos vivos (ya que los precios de alternativas, coberturas o la marca del asesor pudieron haber cambiado). En su lugar, el sistema lee directamente el snapshot inalterable guardado en la columna `render_json` dentro de `proposal_versions`.

---

# Control y Directrices de Acceso Seguro (RLS)

Toda la base de datos en Supabase opera con Row Level Security (RLS) activado para aislar los datos entre asesores independientes. Las directrices y políticas lógicas son las siguientes:

### 1. Aislamiento del Perfil del Asesor (`profiles`, `brands`)
* Un usuario autenticado únicamente puede acceder (leer/modificar) a su propio perfil comercial de asesor.
* Un asesor solo puede acceder a las configuraciones de marca (`brands`) cuya clave foránea `user_id` corresponda con su propio identificador de sesión activa (`auth.uid()`).

### 2. Aislamiento Comercial de Clientes (`clients`)
* Un asesor comercial únicamente puede consultar, crear o modificar registros de clientes vinculados de manera directa a su cuenta (`user_id = auth.uid()`).

### 3. Aislamiento de Propuestas e Integración de Clientes (`proposals`)
* Un asesor comercial posee derechos completos de lectura y escritura (CRUD) sobre sus propuestas (`user_id = auth.uid()`).
* **Acceso Público para Clientes:** Para que un cliente pueda visualizar en el portal web una propuesta comercial compartida sin requerir credenciales de login, se define una política pública de lectura restringida: permite a usuarios anónimos realizar operaciones `SELECT` únicamente si la propuesta cuenta con estado `'completed'`, `'exported'` o `'archived'` (no `'draft'`) y si la consulta proporciona exactamente el token público `share_token` correspondiente.

### 4. Aislamiento Simplificado en Tablas Dependientes
* Debido a la desnormalización consciente de `user_id` en las tablas dependientes (`proposal_sections`, `proposal_alternatives`, `proposal_benefits`, `proposal_files`, `proposal_versions`), el motor evalúa las políticas de seguridad RLS de forma directa (`user_id = auth.uid()`). Esto elimina la necesidad de subconsultas condicionales anidadas (`WHERE EXISTS ...`), optimizando el rendimiento de base de datos.

### 5. Coexistencia de Plantillas (`proposal_templates`)
* Un asesor puede leer cualquier plantilla corporativa global generada por la plataforma (`is_system = true`), así como las plantillas privadas creadas por él mismo (`user_id = auth.uid()`).
* El asesor únicamente puede modificar, crear o eliminar sus propias plantillas privadas de usuario.

### 6. Biblioteca de Contenidos y Auditoría (`library_items`, `proposal_events`)
* Los contenidos reutilizables de la biblioteca son estrictamente personales (`user_id = auth.uid()`).
* Los logs de auditoría de propuestas comerciales solo son legibles para el asesor propietario de la propuesta consultada.

---

# Estrategia de Indexación de Rendimiento

Para garantizar respuestas de consulta en milisegundos en Next.js y en el panel del PAS, se especifican las siguientes pautas de creación de índices:

1. **Indexación de Claves Foráneas (FK):** PostgreSQL no crea índices automáticos en las claves foráneas. Para evitar búsquedas de barrido de tabla completa (`Table Scans`) durante eliminaciones o consultas conjuntas, se deben estructurar índices en cada columna de clave foránea (`proposal_id`, `client_id`, `brand_id`, `user_id`).
2. **Índice Compuesto de Dashboard de Propuestas:** Optimiza la consulta principal de la pantalla de inicio del asesor, filtrando y ordenando propuestas del PAS activo: indexar la combinación de columnas `(user_id, status)` en la tabla `proposals`.
3. **Índice Compuesto de Búsqueda de Clientes:** Acelera la búsqueda predictiva del autocompletado en el wizard: indexar la combinación `(user_id, full_name)` en la tabla `clients`.
4. **Índice de Ordenación de Layout:** Evita la reordenación en caliente durante el renderizado del documento PDF: estructurar índices en `(proposal_id, display_order)` en las tablas `proposal_sections`, `proposal_alternatives` y `proposal_benefits`.

---

# Arquitectura de Datos para Inteligencia Artificial (V2)

El diseño del modelo asegura que en el futuro un agente inteligente (basado en LLM) pueda interpretar, generar o auditar propuestas con simplicidad y precisión matemática:

1. **Lectura y Escritura Estructurada de Estrategia:** Gracias a la tabla normalizada `proposal_narratives`, la IA no tiene que analizar bloques masivos de texto JSON o HTML. Puede leer con precisión los riesgos detectados en `detected_risks`, refinar la estrategia en `recommended_strategy` o proponer resultados esperados en `expected_result` usando campos de base de datos claros y aislados.
2. **Búsqueda Semántica de Biblioteca (pgvector):** La columna `embedding` (tipo de dato vector de 1536 dimensiones) en `library_items` permite al modelo de IA realizar búsquedas semánticas mediante distancia coseno. Si el PAS introduce un objetivo comercial para un cliente, la IA puede buscar instantáneamente narrativas afines o cláusulas de asesoría anteriores con mayor cercanía conceptual, acelerando la generación del borrador inicial en menos de cinco minutos.
3. **Entrada Limpia para Modelos de Generación:** La estructura separada del documento le permite a los agentes de IA recibir únicamente la información de negocio relevante (datos del cliente, narrativa de la estrategia y listado de alternativas técnicas) sin contaminar el contexto del prompt con parámetros de renderizado visual (márgenes, tipografías o estados de numeración de páginas).