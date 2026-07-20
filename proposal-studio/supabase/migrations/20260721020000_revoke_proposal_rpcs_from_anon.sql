-- El advisor de seguridad de Supabase detectó, después de
-- 20260721010000_harden_proposals_state_writes.sql, que `anon` conservaba
-- EXECUTE en varias RPCs de proposals (privilegio de default de schema que
-- "revoke ... from public" no elimina, y que CREATE OR REPLACE no resetea).
-- Ninguna de estas funciones debe ser invocable sin sesión: todas exigen
-- auth.uid() internamente y ya rechazan a un llamador anónimo, pero conviene
-- cerrar también el grant (defensa en profundidad, cierra el WARN del
-- linter `anon_security_definer_function_executable`).
revoke execute on function public.create_draft_proposal(uuid, character varying, character varying, character varying, character varying, uuid) from anon;
revoke execute on function public.update_proposal_details(uuid, uuid, varchar, varchar, varchar, varchar, varchar, text, integer) from anon;
revoke execute on function public.finalize_proposal(uuid) from anon;
revoke execute on function public.mark_duplication_reviewed(uuid) from anon;
revoke execute on function public.get_live_document_content(uuid) from anon;
revoke execute on function public.emit_proposal_version(uuid) from anon;
revoke execute on function public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, integer) from anon;
revoke execute on function public.upsert_proposal_comparison(uuid, jsonb, jsonb, integer) from anon;
revoke execute on function public.upsert_proposal_alternative(uuid, uuid, varchar, text, varchar, varchar, varchar, varchar, numeric, jsonb, integer, integer) from anon;
revoke execute on function public.upsert_proposal_benefit(uuid, uuid, varchar, text, varchar, varchar, integer, integer) from anon;
