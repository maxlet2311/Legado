-- C2: una propuesta con status = 'completed' pasa a ser inmutable en su
-- contenido comercial. Decisión de producto aprobada: narrativa, resumen
-- ejecutivo, mensaje final, alternativas, beneficios, comparaciones y los
-- campos estructurales de la propuesta (cliente, título, tipo, objetivo,
-- producto, moneda, notas internas) no pueden modificarse una vez
-- finalizada -- ni desde la UI, ni desde un Server Action, ni desde un
-- acceso directo a Supabase con una sesión normal. Para editar
-- comercialmente una propuesta finalizada, el mecanismo existente
-- ("Duplicar propuesta", `duplicateProposalAction` -> `create_draft_proposal`
-- con `p_duplicated_from_id`) crea una nueva propuesta en borrador
-- trazable hacia el original; la propuesta original nunca se toca.
--
-- La garantía se implementa con triggers `BEFORE INSERT OR UPDATE OR
-- DELETE`/`BEFORE UPDATE` en vez de repetir el chequeo en cada RPC: es un
-- único punto de control, se aplica sin importar qué código dispare la
-- escritura (RPC actual, uno nuevo que se agregue después, o incluso un
-- acceso directo con `security definer` que bypasee RLS), y no depende de
-- que la UI deshabilite un botón.
--
-- Explícitamente NO bloqueados (acciones administrativas/de formato, no
-- contenido comercial): status (permite completar/archivar), commercial_status
-- (pipeline de venta, eje independiente), orientation/theme/font_family/
-- pdf_format/margin_size/show_*/watermark_text/*_color_override (preferencias
-- de formato del documento), duplication_reviewed/duplicated_from_id
-- (metadata de duplicación), emit_proposal_version (ya es un snapshot
-- inmutable de por sí, funciona sobre cualquier status por diseño).

create or replace function public.guard_completed_proposal_fields()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if old.status = 'completed' and (
    new.client_id is distinct from old.client_id or
    new.title is distinct from old.title or
    new.proposal_type is distinct from old.proposal_type or
    new.primary_objective is distinct from old.primary_objective or
    new.product is distinct from old.product or
    new.currency is distinct from old.currency or
    new.internal_notes is distinct from old.internal_notes
  ) then
    raise exception 'Esta propuesta está finalizada: no se puede modificar su contenido comercial. Usá "Duplicar propuesta" para crear una nueva revisión editable.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_completed_proposal_fields on public.proposals;
create trigger guard_completed_proposal_fields
  before update on public.proposals
  for each row execute function public.guard_completed_proposal_fields();

create or replace function public.guard_completed_proposal_child_write()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_proposal_id uuid := coalesce(new.proposal_id, old.proposal_id);
  v_status varchar;
begin
  select status into v_status from public.proposals where id = v_proposal_id;

  if v_status = 'completed' then
    raise exception 'Esta propuesta está finalizada: no se puede modificar su contenido comercial. Usá "Duplicar propuesta" para crear una nueva revisión editable.' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_completed_write on public.proposal_narratives;
create trigger guard_completed_write
  before insert or update or delete on public.proposal_narratives
  for each row execute function public.guard_completed_proposal_child_write();

drop trigger if exists guard_completed_write on public.proposal_alternatives;
create trigger guard_completed_write
  before insert or update or delete on public.proposal_alternatives
  for each row execute function public.guard_completed_proposal_child_write();

drop trigger if exists guard_completed_write on public.proposal_benefits;
create trigger guard_completed_write
  before insert or update or delete on public.proposal_benefits
  for each row execute function public.guard_completed_proposal_child_write();

drop trigger if exists guard_completed_write on public.proposal_comparisons;
create trigger guard_completed_write
  before insert or update or delete on public.proposal_comparisons
  for each row execute function public.guard_completed_proposal_child_write();

comment on function public.guard_completed_proposal_fields() is
  'C2: bloquea cambios a campos comerciales/estructurales de proposals (client_id/title/proposal_type/primary_objective/product/currency/internal_notes) una vez status=completed. No bloquea status/commercial_status/orientation/formato/duplicación.';
comment on function public.guard_completed_proposal_child_write() is
  'C2: bloquea INSERT/UPDATE/DELETE en proposal_narratives/alternatives/benefits/comparisons cuando la propuesta dueña ya tiene status=completed. Punto de control único, independiente de qué RPC dispare la escritura.';
