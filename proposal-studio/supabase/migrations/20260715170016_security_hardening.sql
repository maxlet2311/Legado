-- Corrige hallazgos del linter de seguridad tras las migraciones de Sprint 2.

create schema if not exists extensions;
alter extension vector set schema extensions;

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
