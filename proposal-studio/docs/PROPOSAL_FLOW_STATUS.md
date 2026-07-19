# Estado del flujo principal — Proposal Studio (post Etapa 7)

Flujo: crear cliente → crear propuesta → completar wizard → generar escenarios/alternativas → guardar
versiones → generar PDF → descargar/compartir. Ver metodología y detalle de hallazgos en
`docs/PROPOSAL_FLOW_AUDIT.md`.

## Pantallas completas y funcionales

- `/clients` — alta, listado paginado, edición.
- `/dashboard` — acceso, alta de propuesta.
- `/proposals/new`, wizard "Cliente" — selección de cliente para una propuesta nueva.
- `/proposal/[id]/edit` — los 7 pasos del wizard (Información, Diagnóstico, Alternativas, Recomendación,
  Beneficios, Comparativa, Resumen), autosave con resolución de conflicto, recuperación de borrador.
- `/proposal/[id]` — detalle, historial de versiones, emisión de nueva versión.
- `/proposal/[id]/versions/[versionId]/preview` — vista previa fiel al PDF final.
- API de generación de PDF y descarga (`/api/proposal-versions/[versionId]/{pdf,download}`).
- `/branding` — logo, colores, firma, consumidos de verdad en el PDF.

## Bugs corregidos en esta etapa

1. Ventajas/Desventajas/Notas de alternativas no aparecían en el PDF pese a guardarse (pérdida silenciosa de
   contenido) — corregido en `src/components/document/alternatives-section.tsx`.
2. Guardado de líneas vacías (`[""]`) en vez de `[]` para esas mismas listas — corregido con `.transform()`
   en `src/lib/wizard/schemas.ts`.
3. Ruta `/preview` huérfana y rota (placeholder deshabilitado, sin enlaces) — eliminada.

## Pendientes reales (no bloquean el flujo principal, documentados para priorización futura)

- ~~**Drift de esquema**: `create_draft_proposal`, `update_proposal_meta`, `archive_proposal` sin
  migración~~ — **resuelto en la Etapa 8** (`docs/SCHEMA_DRIFT_REPORT.md`,
  `supabase/migrations/20260718000004_proposal_number_sequence.sql` y
  `20260718000005_proposal_event_atomic_rpcs.sql`).
- Campo "Resumen ejecutivo" (detalle de propuesta) y "mensaje final" (cierre del PDF) sin UI de captura en el
  wizard — las columnas existen, el render las soporta, pero quedan siempre vacías/genéricas.
- Alternativa recomendada (`is_recommended`, `recommended_reason`, `highlight_label`, `annual_premium`,
  `insured_amount`): renderizadas en el PDF si están presentes, pero sin campos en el wizard para setearlas.
- `/library`: sin conexión a datos reales (`proposal_templates`, `library_items`); fuera del flujo principal
  auditado.
- Validación de comparativa (columna/fila sin título): mensaje de error correcto y específico, pero no se
  muestra inline junto a la celda — solo en el indicador de autosave del paso.

## Cobertura de esta auditoría

Lectura completa de código en las rutas y librerías del flujo del asesor, con verificación cruzada contra la
base de datos real para las funciones RPC del camino crítico. No incluyó recorrido manual en navegador
(sin entorno de browser disponible en esta sesión) — pendiente como QA funcional manual antes de considerar el
flujo "listo para uso comercial" en el sentido estricto del objetivo de la etapa.

## Resultados de QA (2026-07-18)

- `npx tsc --noEmit`: sin errores.
- `npm run lint`: sin errores ni warnings.
- `npm test`: 116/116 pasando.
- `npm run build`: compila; todas las rutas del flujo generadas correctamente, `/preview` ya no existe.

Sin migraciones nuevas, sin cambios de RLS, sin commit, sin push, sin deploy.
