import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";

import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Parse a host like `alhilal.sporlo.net` or `alhilal.localhost:3000` into a
// tenant slug. Returns null when the host is bare (sporlo.net / localhost) or
// when the leading label is a reserved subdomain we shouldn't treat as a tenant.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "app",
  "api",
  "auth",
  "static",
]);

function parseTenantSlug(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]!;
  const parts = hostname.split(".");
  if (parts.length < 2) return null;
  const leading = parts[0]!.toLowerCase();
  if (RESERVED_SUBDOMAINS.has(leading)) return null;
  // Dev convenience: `localhost` alone has parts.length === 1 (handled above);
  // `something.localhost` is treated as a tenant subdomain.
  return leading || null;
}

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  // Resolve tenant slug from host (prod) or ?org= query (dev fallback).
  const url = new URL(request.url);
  const slugFromHost = parseTenantSlug(request.headers.get("host"));
  const slugFromQuery = url.searchParams.get("org");
  const tenantSlug = slugFromHost ?? slugFromQuery;

  if (tenantSlug) {
    // Stash on the response so downstream code can read it via cookies.
    // (Setting request headers isn't safe in middleware — they don't propagate
    // to server components reliably in Next 16.)
    response.cookies.set({
      name: "sporlo-tenant-slug",
      value: tenantSlug,
      path: "/",
      sameSite: "lax",
    });
  }

  // Refresh the Supabase session cookies on every request. createServerClient
  // mutates `response` cookies in-place via the setAll callback.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          for (const { name, value, options } of toSet) {
            response.cookies.set({ name, value, ...options });
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response ?? NextResponse.next();
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
