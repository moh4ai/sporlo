import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// Browser / server-component client using the anon key. RLS applies.
export function createBrowserSupabaseClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

// Service-role client. Bypasses RLS — only use from trusted server code (route
// handlers, server actions, Super Admin tools, audit-log writers).
export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// JWT-bound client for a specific user. Tests use this to assert RLS isolation.
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );
}
