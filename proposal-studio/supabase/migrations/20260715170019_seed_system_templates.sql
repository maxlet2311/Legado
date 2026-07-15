-- Plantillas de sistema mínimas, basadas en el recorrido narrativo obligatorio
-- (05_BUSINESS_RULES.md: comprender, riesgos, oportunidades, estrategia,
-- comparar, invitar a avanzar) y en las categorías válidas de proposal_templates.

insert into public.proposal_templates (title, description, proposal_type, category, template_json, is_system, is_default)
select 'Protección Familiar Integral',
       'Punto de partida para propuestas de protección familiar: vida, invalidez y protección de ingresos.',
       'individual', 'family',
       '{"sections": ["executive_summary", "diagnosis", "strategy", "alternatives", "comparison", "benefits", "call_to_action"]}'::jsonb,
       true, true
where not exists (
  select 1 from public.proposal_templates where title = 'Protección Familiar Integral' and is_system = true
);

insert into public.proposal_templates (title, description, proposal_type, category, template_json, is_system, is_default)
select 'Plan de Ahorro Programado',
       'Punto de partida para propuestas orientadas a construir patrimonio y disciplina financiera.',
       'individual', 'savings',
       '{"sections": ["executive_summary", "diagnosis", "strategy", "alternatives", "comparison", "benefits", "call_to_action"]}'::jsonb,
       true, false
where not exists (
  select 1 from public.proposal_templates where title = 'Plan de Ahorro Programado' and is_system = true
);

insert into public.proposal_templates (title, description, proposal_type, category, template_json, is_system, is_default)
select 'Retiro Complementario',
       'Punto de partida para propuestas de planificación de retiro e independencia económica.',
       'individual', 'retirement',
       '{"sections": ["executive_summary", "diagnosis", "strategy", "alternatives", "comparison", "benefits", "call_to_action"]}'::jsonb,
       true, false
where not exists (
  select 1 from public.proposal_templates where title = 'Retiro Complementario' and is_system = true
);

insert into public.proposal_templates (title, description, proposal_type, category, template_json, is_system, is_default)
select 'Protección Corporativa',
       'Punto de partida para propuestas de persona clave, socios o beneficios corporativos.',
       'corporate', 'business',
       '{"sections": ["executive_summary", "diagnosis", "strategy", "alternatives", "comparison", "benefits", "call_to_action"]}'::jsonb,
       true, false
where not exists (
  select 1 from public.proposal_templates where title = 'Protección Corporativa' and is_system = true
);
