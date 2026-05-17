import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// Cookie-backed Supabase client for server components, route handlers, and
// server actions. Reads + writes the session cookies on this request.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a server component (no setCookie permission) — safe
            // to ignore; the middleware will refresh cookies on the next nav.
          }
        },
      },
    },
  );
}

// Service-role client. Bypasses RLS — only call from trusted server contexts
// (the onboarding action, the Super Admin app, audit-log writers).
export function createServiceRoleClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
