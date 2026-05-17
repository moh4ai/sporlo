// Generators for the standard RLS policy pair on a tenant-scoped table. The
// SQL in supabase/migrations/0001_init.sql is hand-written for the Day 2
// tables; use these helpers when adding new tenant tables in Phase 1+.

export interface TenantPolicyOptions {
  table: string;
  schema?: string;
  orgIdColumn?: string;
}

export function tenantIsolationPolicy({
  table,
  schema = "public",
  orgIdColumn = "org_id",
}: TenantPolicyOptions): string {
  const qualified = `${schema}.${table}`;
  return [
    `alter table ${qualified} enable row level security;`,
    `create policy ${table}_tenant on ${qualified}`,
    `  for all using (${orgIdColumn} = public.current_org_id())`,
    `  with check (${orgIdColumn} = public.current_org_id());`,
    `create policy ${table}_super_admin on ${qualified}`,
    `  for all using (public.is_super_admin()) with check (public.is_super_admin());`,
  ].join("\n");
}

// Read-only reference table (e.g. kpi_categories) — any authenticated user reads,
// only super_admin writes.
export function referenceTablePolicy({
  table,
  schema = "public",
}: Omit<TenantPolicyOptions, "orgIdColumn">): string {
  const qualified = `${schema}.${table}`;
  return [
    `alter table ${qualified} enable row level security;`,
    `create policy ${table}_read on ${qualified}`,
    `  for select using (auth.role() = 'authenticated');`,
    `create policy ${table}_super_admin_write on ${qualified}`,
    `  for all using (public.is_super_admin()) with check (public.is_super_admin());`,
  ].join("\n");
}
