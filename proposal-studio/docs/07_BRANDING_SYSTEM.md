# Proposal Studio™
## 07_BRANDING_SYSTEM.md

Versión: 1.0
Estado: Frozen

---

# Objetivo

Este documento define el sistema de branding de Proposal Studio™.

Su propósito es permitir que cada Productor Asesor de Seguros, Broker o Agencia utilice su propia identidad visual sin afectar la calidad, consistencia y experiencia del producto.

El branding nunca modifica la interfaz de Proposal Studio.

El branding únicamente modifica la propuesta generada para el cliente.

---

# Filosofía

Proposal Studio no pretende imponer una marca.

Potencia la marca del asesor.

El cliente debe recordar al productor.

No al software.

Proposal Studio debe permanecer invisible durante toda la experiencia.

---

# Principios

Toda identidad visual debe cumplir los siguientes principios.

## Profesionalismo

Toda propuesta debe transmitir confianza.

Nunca improvisación.

---

## Consistencia

Toda propuesta debe mantener el mismo lenguaje visual desde la primera hasta la última página.

---

## Flexibilidad

Cada usuario puede utilizar su propia identidad.

Sin modificar la estructura del documento.

---

## Simplicidad

Nunca permitir configuraciones que deterioren la calidad visual.

---

## Calidad

El sistema debe proteger automáticamente la estética del documento.

---

# Arquitectura del Branding

La identidad visual se construye mediante cinco capas.

Marca

↓

Paleta

↓

Tipografía

↓

Componentes

↓

Documento

El usuario únicamente personaliza las dos primeras.

El resto permanece controlado por Proposal Studio.

---

# Componentes personalizables

Cada usuario puede configurar.

- Nombre comercial
- Nombre del asesor
- Matrícula
- Logo
- Firma
- Fotografía (opcional)
- Email
- Teléfono
- WhatsApp
- Sitio web
- Dirección
- Redes sociales
- Footer

---

# Componentes protegidos

El usuario NO puede modificar.

- Tipografía
- Márgenes
- Grid
- Tamaños
- Espaciados
- Cards
- Botones
- Tablas
- Jerarquía visual
- Layout
- Sistema de iconos

Estos elementos pertenecen al Design System.

---

# Logos

## Formatos permitidos

SVG

PNG

WebP

---

## Resolución mínima

600 px

---

## Fondo

Preferentemente transparente.

---

## Reglas

Nunca deformar.

Nunca recortar.

Nunca aplicar filtros.

Nunca modificar colores.

Mantener siempre la proporción original.

---

# Firma

Opcional.

Puede utilizarse al finalizar la propuesta.

Formatos permitidos.

PNG

SVG

Fondo transparente.

---

# Fotografía del asesor

Opcional.

Solo puede utilizarse en:

- portada
- sección final

Nunca dentro del cuerpo de la propuesta.

---

# Paleta

Toda marca define tres colores.

Primary

Secondary

Accent

Proposal Studio genera automáticamente las variaciones necesarias.

El usuario nunca define:

Hover

Focus

Disabled

Borders

Backgrounds

Estos colores son calculados automáticamente.

---

# Validación automática

El sistema debe impedir configuraciones que reduzcan la legibilidad.

Validaciones.

Contraste insuficiente.

Colores demasiado similares.

Texto ilegible.

Accent excesivamente brillante.

Fondos oscuros con poco contraste.

En estos casos Proposal Studio ajustará automáticamente los colores derivados.

Nunca el color principal.

---

# Temas

Versión inicial.

Personas

Empresas

Cada tema modifica únicamente:

- colores
- ilustraciones
- acentos

Nunca modifica el layout.

---

# Portada

Elementos configurables.

Logo

Cliente

Título

Subtítulo

Asesor

Fecha

Imagen opcional

Todo lo demás permanece fijo.

---

# Footer

Elementos configurables.

Nombre

Matrícula

WhatsApp

Email

Sitio web

Dirección

Redes sociales

No pueden agregarse componentes personalizados.

---

# Iconografía

La iconografía pertenece al sistema.

No al usuario.

Biblioteca oficial.

Lucide React.

Nunca utilizar logos como iconos.

Nunca utilizar emojis.

---

# Imágenes

Las imágenes utilizadas en propuestas deben transmitir.

- tranquilidad
- profesionalismo
- planificación
- confianza
- futuro
- continuidad

Evitar.

- oficinas genéricas
- personas sonriendo mirando cámara
- imágenes de stock evidentes
- gráficos bursátiles
- dinero
- manos estrechándose
- familias artificiales

La estética debe sentirse editorial.

No publicitaria.

---

# Fotografía

Estilo.

Editorial.

Luz natural.

Colores suaves.

Composición limpia.

Mucho espacio negativo.

---

# Ilustraciones

Cuando existan.

Minimalistas.

Líneas limpias.

Sin exceso de detalles.

---

# Personalización del PDF

Cada propuesta puede configurar.

Mostrar portada.

Mostrar fotografía.

Mostrar firma.

Mostrar footer.

Mostrar numeración.

Mostrar nota legal.

Estas opciones pertenecen a proposal_settings.

---

# Branding dinámico

La propuesta adapta automáticamente su identidad según.

Tipo de cliente.

Objetivo principal.

Tema seleccionado.

Sin modificar la estructura del documento.

---

# Coherencia visual

Todos los componentes deben respetar.

- la misma paleta;
- la misma tipografía;
- la misma escala;
- el mismo espaciado;
- el mismo lenguaje visual.

No se permiten excepciones.

---

# Protección de marca

Proposal Studio debe impedir configuraciones que degraden la calidad del documento.

Ejemplos.

Logos pixelados.

Contraste insuficiente.

Colores ilegibles.

Combinaciones excesivamente saturadas.

Imágenes deformadas.

---

# Branding del producto

Proposal Studio no incorpora su logotipo dentro de los documentos exportados.

No existen marcas de agua.

No existen referencias visibles al software.

La propuesta pertenece completamente al asesor.

---

# Preparado para futuras versiones

La arquitectura queda preparada para incorporar.

- múltiples marcas por usuario;
- agencias;
- organizaciones;
- sub-marcas;
- temas personalizados;
- branding automático por compañía aseguradora;
- branding por tipo de producto.

Sin modificar el sistema actual.

---

# Regla de oro

El branding debe potenciar la identidad del asesor sin comprometer la calidad editorial del documento.

Cuando exista un conflicto entre personalización y calidad visual, Proposal Studio priorizará siempre la calidad del documento.