-- Sprint 0 → Phase 1 pre-flight cross-cutting prep.
-- Apply via the Supabase SQL editor at:
--   https://supabase.com/dashboard/project/sveqkaemfnvlqfgkbryu/sql/new
-- Idempotent where possible. Safe to re-run.

-- ─────────────────────────────────────────────
-- 1. kpi_events.criterion_code → nullable
--    Some events (subscription_frozen, coupon_redeemed, order_fulfilled, etc.)
--    don't map cleanly to a Ministry criterion yet but should still record.
-- ─────────────────────────────────────────────

alter table public.kpi_events
  alter column criterion_code drop not null;

-- The FK constraint already allows NULLs since column is nullable.

-- ─────────────────────────────────────────────
-- 2. record_audit RPC — every Server Action calls this for any destructive op
-- ─────────────────────────────────────────────

create or replace function public.record_audit(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_user_id uuid;
  v_org_id uuid;
  v_role text;
begin
  v_user_id := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
  v_org_id := public.current_org_id();
  v_role := public.current_role_claim();

  insert into public.audit_logs (
    actor_user_id, actor_role, org_id, action, target_type, target_id, payload_jsonb
  ) values (
    v_user_id, v_role, v_org_id, p_action, p_target_type, p_target_id, p_payload
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_audit(text, text, uuid, jsonb) to authenticated;

-- ─────────────────────────────────────────────
-- 3. current_branch_id() helper — analogous to current_org_id()
--    Used for branch-scoped reads in future modules (facilities, events).
-- ─────────────────────────────────────────────

create or replace function public.current_branch_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'branch_id', '')::uuid
$$;
