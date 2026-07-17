-- Etapa 5, sección 14: Auth Hook "Before User Created". Impide que Google
-- OAuth (o cualquier otro proveedor) cree un usuario de Supabase Auth sin
-- autorización comercial previa.
--
-- Contrato exacto de Supabase para este hook (Postgres Hooks):
--   function(event jsonb) returns jsonb
--   - event->'user'->>'email' es el email del usuario a crear.
--   - devolver '{}'::jsonb permite la creación.
--   - devolver {"error": {"http_code": 403, "message": "..."}} la rechaza.
--
-- security definer para poder leer account_activation_invitations y
-- memberships (RLS deny-by-default para anon/authenticated) sin necesidad de
-- otorgarle privilegios amplios de tabla al rol supabase_auth_admin.
--
-- Activación (no aplicable desde este repositorio, requiere el dashboard):
--   Supabase Dashboard > Authentication > Hooks (Auth Hooks) > "Before User
--   Created" > seleccionar esta función. Mientras no se active ahí, esta
--   función existe pero Supabase Auth nunca la invoca — la protección real
--   mientras tanto es la barrera compensatoria en `/auth/callback`
--   (src/app/auth/callback/route.ts), que elimina cualquier cuenta creada
--   sin autorización.

create or replace function public.before_user_created_check_membership(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_email varchar;
  v_has_pending_invitation boolean;
  v_has_eligible_membership boolean;
begin
  v_email := lower(trim(event -> 'user' ->> 'email'));

  if v_email is null or v_email = '' then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'No autorizado.')
    );
  end if;

  select exists (
    select 1 from public.account_activation_invitations
    where email = v_email and status = 'pending' and expires_at > now()
  ) into v_has_pending_invitation;

  select exists (
    select 1 from public.memberships
    where email = v_email and user_id is null and status in ('authorized', 'active')
  ) into v_has_eligible_membership;

  if v_has_pending_invitation or v_has_eligible_membership then
    return '{}'::jsonb;
  end if;

  -- Mensaje neutral: no revela si el email tiene o no una membresía/invitación.
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'No es posible crear una cuenta sin una invitación o membresía habilitada.')
  );
end;
$function$;

comment on function public.before_user_created_check_membership(jsonb) is
  'Auth Hook "Before User Created". Debe registrarse manualmente en el dashboard de Supabase (Authentication > Hooks) — no se activa por el solo hecho de existir esta función. Ver comentario de la migración para el contrato exacto.';

revoke all on function public.before_user_created_check_membership(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created_check_membership(jsonb) to supabase_auth_admin;
