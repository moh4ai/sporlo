import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

// Cmd+K search results — wraps the public.search_global RPC.
//
// The RPC is SECURITY INVOKER, so each row is filtered by the underlying
// table's tenant RLS policy: members/plans/products/etc. all carry their
// own `org_id = current_org_id()` check. The route itself does no extra
// tenant gating; sign-in is enough.

export type SearchKind =
  | "member"
  | "plan"
  | "product"
  | "fixture"
  | "news_article"
  | "staff"
  | "facility"
  | "squad";

export type SearchResult = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  rank: number;
};

const KIND_HREF: Record<SearchKind, (id: string) => string> = {
  member: (id) => `/memberships/members/${id}`,
  plan: () => `/memberships`,
  product: (id) => `/store/${id}`,
  fixture: (id) => `/events/${id}`,
  news_article: (id) => `/media/news`,
  staff: () => `/hr`,
  facility: (id) => `/facilities/${id}`,
  squad: (id) => `/team/${id}`,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const locale = (url.searchParams.get("locale") ?? "ar") === "en" ? "en" : "ar";

  if (q.length < 2) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("search_global", {
    q,
    max_per_kind: 5,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    kind: SearchKind;
    id: string;
    title_ar: string | null;
    title_en: string | null;
    subtitle: string | null;
    rank: number;
  }>;

  const results: SearchResult[] = rows.map((r) => {
    const title =
      (locale === "ar" ? r.title_ar : r.title_en) ?? r.title_en ?? r.title_ar ?? "—";
    return {
      kind: r.kind,
      id: r.id,
      title,
      subtitle: r.subtitle,
      href: `/${locale}${KIND_HREF[r.kind](r.id)}`,
      rank: r.rank,
    };
  });

  return NextResponse.json({ results }, { status: 200 });
}
