import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { OrdersClient, type OrderRow } from "./_components/OrdersClient";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, buyer_email, total_sar, status, created_at, items:order_items(id)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows: OrderRow[] = (data ?? []).map((o) => ({
    id: o.id,
    buyer_email: o.buyer_email,
    total_sar: Number(o.total_sar),
    status: o.status,
    item_count: Array.isArray(o.items) ? o.items.length : 0,
    created_at: o.created_at,
  }));

  return (
    <OrdersClient
      orders={rows}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
