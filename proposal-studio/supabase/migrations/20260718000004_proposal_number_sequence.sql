-- Etapa 8 (reproducibilidad): secuencia y función usadas por
-- create_draft_proposal (20260718000005) para generar el número de propuesta
-- (formato PROP-YYYY-NNNNNN). Existen en remoto desde el inicio del proyecto
-- pero nunca quedaron versionadas.

create sequence if not exists public.proposal_number_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  no cycle;

create or replace function public.generate_proposal_number()
returns character varying
language sql
set search_path to 'public', 'pg_temp'
as $function$
  select 'PROP-' || extract(year from now())::int || '-' || lpad(nextval('public.proposal_number_seq')::text, 6, '0');
$function$;

revoke execute on function public.generate_proposal_number() from public;
grant execute on function public.generate_proposal_number() to authenticated;
