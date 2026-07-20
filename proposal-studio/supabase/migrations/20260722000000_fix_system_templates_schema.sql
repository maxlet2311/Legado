-- Corrige `template_json` de las 4 plantillas de sistema sembradas en
-- 20260715170019_seed_system_templates.sql con el esquema viejo
-- (`{"sections": [...]}`, una lista de nombres de sección sin usar en ningún
-- lado del código). El esquema real esperado hoy por
-- `applyTemplateToNewProposalAction` / `src/lib/templates/sanitize.ts`
-- (`TemplateJson`) es distinto: `proposal_type`, `primary_objective`,
-- `product`, `currency`, `narrative`, `alternatives`, `benefits`,
-- `comparison`, `is_example_values`. Aplicar cualquiera de las 4 plantillas
-- de sistema rompía hoy porque `content.proposal_type` / `content.alternatives`
-- llegaban `undefined` al RPC `create_draft_proposal` y al `.map` posterior.
--
-- Las plantillas de sistema nunca tuvieron contenido narrativo real bajo el
-- esquema viejo (solo una lista de secciones) — no hay datos que perder al
-- migrar, solo se reemplaza la forma del JSON por una vacía pero válida en el
-- esquema actual, que el asesor completa igual que hoy al aplicar cualquier
-- plantilla. Es idempotente: siempre fija el mismo valor final, no inserta filas.

update public.proposal_templates
set template_json = jsonb_build_object(
  'proposal_type', proposal_type,
  'primary_objective', 'protect_family',
  'product', null,
  'currency', 'ARS',
  'narrative', null,
  'alternatives', '[]'::jsonb,
  'benefits', '[]'::jsonb,
  'comparison', null,
  'is_example_values', false
)
where is_system = true
  and title = 'Protección Familiar Integral'
  and (template_json->>'proposal_type') is null;

update public.proposal_templates
set template_json = jsonb_build_object(
  'proposal_type', proposal_type,
  'primary_objective', 'build_savings',
  'product', null,
  'currency', 'ARS',
  'narrative', null,
  'alternatives', '[]'::jsonb,
  'benefits', '[]'::jsonb,
  'comparison', null,
  'is_example_values', false
)
where is_system = true
  and title = 'Plan de Ahorro Programado'
  and (template_json->>'proposal_type') is null;

update public.proposal_templates
set template_json = jsonb_build_object(
  'proposal_type', proposal_type,
  'primary_objective', 'retirement',
  'product', null,
  'currency', 'ARS',
  'narrative', null,
  'alternatives', '[]'::jsonb,
  'benefits', '[]'::jsonb,
  'comparison', null,
  'is_example_values', false
)
where is_system = true
  and title = 'Retiro Complementario'
  and (template_json->>'proposal_type') is null;

update public.proposal_templates
set template_json = jsonb_build_object(
  'proposal_type', proposal_type,
  'primary_objective', 'business_protection',
  'product', null,
  'currency', 'ARS',
  'narrative', null,
  'alternatives', '[]'::jsonb,
  'benefits', '[]'::jsonb,
  'comparison', null,
  'is_example_values', false
)
where is_system = true
  and title = 'Protección Corporativa'
  and (template_json->>'proposal_type') is null;
