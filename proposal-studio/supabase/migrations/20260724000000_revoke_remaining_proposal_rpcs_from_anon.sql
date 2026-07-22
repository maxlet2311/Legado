-- RC1: cierra el gap detectado en la auditoría de seguridad —
-- 20260721020000_revoke_proposal_rpcs_from_anon.sql revocó EXECUTE de `anon`
-- para 9 RPCs de propuestas, pero estas 10 quedaron afuera y hoy siguen
-- teniendo EXECUTE otorgado a `anon` por el grant default de Supabase al
-- crear la función (confirmado con has_function_privilege contra la base
-- local). No son explotables hoy -- todas revisan `auth.uid() is null` antes
-- de hacer nada -- pero es una dependencia frágil de defensa en profundidad:
-- si alguna pierde ese chequeo en un cambio futuro, o si una función nueva
-- copia el patrón sin agregarse a un revoke explícito, quedaría abierta a
-- cualquiera con la clave anon pública. Se revoca acá por completitud,
-- consistente con el patrón ya establecido para el resto de las RPCs.
revoke execute on function public.archive_proposal(uuid) from public, anon;
revoke execute on function public.update_proposal_meta(uuid, varchar) from public, anon;
revoke execute on function public.delete_proposal_alternative(uuid, uuid) from public, anon;
revoke execute on function public.delete_proposal_benefit(uuid, uuid) from public, anon;
revoke execute on function public.reorder_proposal_alternatives(uuid, uuid[]) from public, anon;
revoke execute on function public.reorder_proposal_benefits(uuid, uuid[]) from public, anon;
revoke execute on function public.bump_revision() from public, anon;
revoke execute on function public.check_and_record_ai_usage(uuid, varchar) from public, anon;
revoke execute on function public.generate_proposal_number() from public, anon;
revoke execute on function public.record_proposal_version_artifact(uuid, text, varchar, integer, varchar, varchar, varchar) from public, anon;

grant execute on function public.archive_proposal(uuid) to authenticated;
grant execute on function public.update_proposal_meta(uuid, varchar) to authenticated;
grant execute on function public.delete_proposal_alternative(uuid, uuid) to authenticated;
grant execute on function public.delete_proposal_benefit(uuid, uuid) to authenticated;
grant execute on function public.reorder_proposal_alternatives(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_proposal_benefits(uuid, uuid[]) to authenticated;
grant execute on function public.check_and_record_ai_usage(uuid, varchar) to authenticated;
grant execute on function public.record_proposal_version_artifact(uuid, text, varchar, integer, varchar, varchar, varchar) to authenticated;

-- `bump_revision` (trigger, sin argumentos) y `generate_proposal_number`
-- (helper interno usado solo desde otras funciones SECURITY DEFINER) no
-- necesitan grant a `authenticated`: el trigger corre por el mecanismo de
-- disparo de Postgres sin importar los grants de la función, y el helper
-- solo se invoca vía llamada interna SQL desde funciones ya definer, nunca
-- directo por RPC desde el cliente.
