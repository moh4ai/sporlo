"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";
import { EVT, recordEvent } from "@sporlo/governance";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  DeliverOrderSchema,
  OrderIntentSchema,
  ProductArchiveSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  ShipOrderSchema,
  StockAdjustSchema,
  VariantCreateSchema,
  VariantDeleteSchema,
  VariantUpdateSchema,
  type DeliverOrderInput,
  type OrderIntentInput,
  type ProductArchiveInput,
  type ProductCreateInput,
  type ProductUpdateInput,
  type ShipOrderInput,
  type StockAdjustInput,
  type VariantCreateInput,
  type VariantDeleteInput,
  type VariantUpdateInput,
} from "./validation";

function permissionError(action: string, resource: string): ActionResult<never> {
  return actionError(`permission-denied:${action}:${resource}`);
}

async function withPrincipal(
  action: Parameters<typeof requirePrincipal>[1],
  resource: Parameters<typeof requirePrincipal>[2],
) {
  const tenant = await getActiveTenant();
  try {
    requirePrincipal(
      { role: tenant.user_role, department: tenant.department },
      action,
      resource,
    );
  } catch (err) {
    if (err instanceof PermissionDeniedError) return { tenant: null, error: err };
    throw err;
  }
  return { tenant, error: null };
}

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────

export async function createProduct(
  input: ProductCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = ProductCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "store");
  if (error) return permissionError("create", "store");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("products")
    .insert({ org_id: tenant!.org_id, ...parsed.data })
    .select("id")
    .single();
  if (insertErr || !data) return actionError(insertErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "product_created",
    p_target_type: "product",
    p_target_id: data.id,
    p_payload: { name: parsed.data.name_en },
  });

  revalidatePath("/[locale]/(dashboard)/store", "page");
  return actionOk({ id: data.id as string });
}

export async function updateProduct(
  input: ProductUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = ProductUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath(`/[locale]/(dashboard)/store/${id}`, "page");
  revalidatePath("/[locale]/(dashboard)/store", "page");
  return actionOk(undefined);
}

export async function archiveProduct(
  input: ProductArchiveInput,
): Promise<ActionResult<void>> {
  const parsed = ProductArchiveSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("products")
    .update({
      active: !parsed.data.archive,
      archived_at: parsed.data.archive ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/store", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Variants
// ─────────────────────────────────────────────

export async function createVariant(
  input: VariantCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = VariantCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("product_variants")
    .insert({
      org_id: tenant!.org_id,
      product_id: parsed.data.product_id,
      sku: parsed.data.sku ?? null,
      size: parsed.data.size ?? null,
      color: parsed.data.color ?? null,
      price_sar: parsed.data.price_sar,
      member_price_sar: parsed.data.member_price_sar ?? null,
      stock: parsed.data.stock,
    })
    .select("id")
    .single();
  if (insertErr || !data) {
    if (insertErr?.code === "23505") return actionError("sku-exists", "sku");
    return actionError(insertErr?.message ?? "insert-failed");
  }

  // Log initial stock as an inventory movement.
  if (parsed.data.stock > 0) {
    await supabase.from("inventory_movements").insert({
      org_id: tenant!.org_id,
      variant_id: data.id,
      delta: parsed.data.stock,
      reason: "initial",
    });
  }

  revalidatePath(`/[locale]/(dashboard)/store/${parsed.data.product_id}`, "page");
  return actionOk({ id: data.id as string });
}

export async function updateVariant(
  input: VariantUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = VariantUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("product_variants")
    .update({
      sku: patch.sku ?? null,
      size: patch.size ?? null,
      color: patch.color ?? null,
      price_sar: patch.price_sar,
      member_price_sar: patch.member_price_sar ?? null,
      stock: patch.stock,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) {
    if (updErr.code === "23505") return actionError("sku-exists", "sku");
    return actionError(updErr.message);
  }

  revalidatePath(`/[locale]/(dashboard)/store/${patch.product_id}`, "page");
  return actionOk(undefined);
}

export async function deleteVariant(
  input: VariantDeleteInput,
): Promise<ActionResult<void>> {
  const parsed = VariantDeleteSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const supabase = await createSupabaseServerClient();
  const { error: delErr } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (delErr) return actionError(delErr.message);
  return actionOk(undefined);
}

export async function adjustStock(
  input: StockAdjustInput,
): Promise<ActionResult<{ new_stock: number }>> {
  const parsed = StockAdjustSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const supabase = await createSupabaseServerClient();
  const { data: v } = await supabase
    .from("product_variants")
    .select("stock, product_id")
    .eq("id", parsed.data.variant_id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!v) return actionError("variant-not-found");

  const next = Math.max(0, Number(v.stock) + parsed.data.delta);
  await supabase
    .from("product_variants")
    .update({ stock: next })
    .eq("id", parsed.data.variant_id);
  await supabase.from("inventory_movements").insert({
    org_id: tenant!.org_id,
    variant_id: parsed.data.variant_id,
    delta: parsed.data.delta,
    reason: parsed.data.delta > 0 ? "restock" : "manual_adjustment",
    note: parsed.data.note ?? null,
  });

  revalidatePath(`/[locale]/(dashboard)/store/${v.product_id}`, "page");
  return actionOk({ new_stock: next });
}

// ─────────────────────────────────────────────
// Public order intent (no auth)
// ─────────────────────────────────────────────

export async function createOrderIntent(
  input: OrderIntentInput,
): Promise<
  ActionResult<{
    order_id: string;
    payment_id: string;
    total_sar: number;
    method: "moyasar" | "manual";
  }>
> {
  const parsed = OrderIntentSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const admin = createServiceRoleClient();

  const variantIds = parsed.data.lines.map((l) => l.variant_id);
  const { data: variants } = await admin
    .from("product_variants")
    .select(
      "id, product_id, price_sar, member_price_sar, stock, active, size, color, product:products(name_ar, name_en, org_id)",
    )
    .in("id", variantIds)
    .eq("org_id", parsed.data.org_id);
  if (!variants || variants.length !== variantIds.length) {
    return actionError("variant-not-found");
  }

  // Stock check.
  for (const line of parsed.data.lines) {
    const v = variants.find((x) => x.id === line.variant_id);
    if (!v || !v.active) return actionError("variant-not-found");
    if (v.stock < line.quantity) return actionError("out-of-stock");
  }

  // Detect member discount: buyer_email matches an active member.
  const { data: member } = await admin
    .from("members")
    .select("id, status, subscription:subscriptions(status, plan:plans(member_only_store_discount_pct))")
    .eq("org_id", parsed.data.org_id)
    .eq("email", parsed.data.buyer_email)
    .maybeSingle();
  let memberDiscountPct = 0;
  let memberId: string | null = null;
  if (member && member.status === "active") {
    memberId = member.id;
    const subs = (Array.isArray(member.subscription) ? member.subscription : [member.subscription]).filter(Boolean);
    const activeSub = subs.find(
      (s: { status?: string }) => s && s.status === "active",
    );
    if (activeSub && "plan" in (activeSub as object)) {
      const plan = (activeSub as { plan?: { member_only_store_discount_pct?: number | string } }).plan;
      memberDiscountPct = plan?.member_only_store_discount_pct
        ? Number(plan.member_only_store_discount_pct)
        : 0;
    }
  }

  // Compute totals.
  let subtotal = 0;
  const itemRows: Array<{
    variant_id: string;
    product_id: string;
    product_name: string;
    variant_label: string | null;
    quantity: number;
    unit_price_sar: number;
    subtotal_sar: number;
  }> = [];
  for (const line of parsed.data.lines) {
    const v = variants.find((x) => x.id === line.variant_id)!;
    const product = Array.isArray(v.product) ? v.product[0] : v.product;
    const basePrice = Number(v.price_sar);
    const memberOverride = v.member_price_sar != null ? Number(v.member_price_sar) : null;
    const unit =
      memberId && memberOverride != null
        ? memberOverride
        : memberId && memberDiscountPct > 0
          ? Math.round(basePrice * (100 - memberDiscountPct)) / 100
          : basePrice;
    const lineSubtotal = unit * line.quantity;
    subtotal += lineSubtotal;
    const variantLabel = [v.size, v.color].filter(Boolean).join(" / ") || null;
    itemRows.push({
      variant_id: v.id,
      product_id: v.product_id,
      product_name:
        product?.name_en ?? product?.name_ar ?? "Item",
      variant_label: variantLabel,
      quantity: line.quantity,
      unit_price_sar: unit,
      subtotal_sar: lineSubtotal,
    });
  }
  const discount = 0;
  const total = Math.max(0, subtotal - discount);

  // Insert payment + order + items.
  const idempotency = `ord-${parsed.data.org_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      org_id: parsed.data.org_id,
      member_id: memberId,
      amount_sar: total,
      currency: "SAR",
      status: "pending",
      provider: parsed.data.payment_method === "moyasar" ? "moyasar" : "manual",
      idempotency_key: idempotency,
    })
    .select("id")
    .single();
  if (payErr || !payment) return actionError(payErr?.message ?? "payment-failed");

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      org_id: parsed.data.org_id,
      buyer_member_id: memberId,
      buyer_email: parsed.data.buyer_email,
      buyer_phone: parsed.data.buyer_phone ?? null,
      shipping_address: parsed.data.shipping_address ?? null,
      subtotal_sar: subtotal,
      discount_sar: discount,
      total_sar: total,
      payment_id: payment.id,
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) return actionError(orderErr?.message ?? "order-failed");

  const rowsToInsert = itemRows.map((r) => ({
    org_id: parsed.data.org_id,
    order_id: order.id,
    product_id: r.product_id,
    variant_id: r.variant_id,
    product_name: r.product_name,
    variant_label: r.variant_label,
    quantity: r.quantity,
    unit_price_sar: r.unit_price_sar,
    subtotal_sar: r.subtotal_sar,
  }));
  const { error: itemsErr } = await admin.from("order_items").insert(rowsToInsert);
  if (itemsErr) return actionError(itemsErr.message);

  await admin.from("audit_logs").insert({
    actor_user_id: null,
    actor_role: "anon",
    org_id: parsed.data.org_id,
    action: "order_intent_created",
    target_type: "order",
    target_id: order.id,
    payload_jsonb: { total_sar: total, member_discount_pct: memberDiscountPct },
  });

  return actionOk({
    order_id: order.id as string,
    payment_id: payment.id as string,
    total_sar: total,
    method: parsed.data.payment_method,
  });
}

// ─────────────────────────────────────────────
// Fulfillment
// ─────────────────────────────────────────────

export async function markOrderShipped(
  input: ShipOrderInput,
): Promise<ActionResult<void>> {
  const parsed = ShipOrderSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!order) return actionError("order-not-found");
  if (order.status !== "paid") return actionError("order-not-paid");

  const now = new Date().toISOString();
  await supabase
    .from("orders")
    .update({ status: "shipped", shipped_at: now })
    .eq("id", order.id);
  await supabase.from("shipments").insert({
    org_id: tenant!.org_id,
    order_id: order.id,
    carrier: parsed.data.carrier ?? null,
    tracking_number: parsed.data.tracking_number ?? null,
  });

  await supabase.rpc("record_audit", {
    p_action: "order_shipped",
    p_target_type: "order",
    p_target_id: order.id,
    p_payload: {
      carrier: parsed.data.carrier ?? null,
      tracking: parsed.data.tracking_number ?? null,
    },
  });

  revalidatePath("/[locale]/(dashboard)/store/orders", "page");
  return actionOk(undefined);
}

export async function markOrderDelivered(
  input: DeliverOrderInput,
): Promise<ActionResult<void>> {
  const parsed = DeliverOrderSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "store");
  if (error) return permissionError("update", "store");

  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!order) return actionError("order-not-found");
  if (order.status !== "shipped") return actionError("order-not-shipped");

  const now = new Date().toISOString();
  await supabase
    .from("orders")
    .update({ status: "delivered", delivered_at: now })
    .eq("id", order.id);
  await supabase
    .from("shipments")
    .update({ delivered_at: now })
    .eq("order_id", order.id)
    .is("delivered_at", null);

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.ORDER_FULFILLED,
    qualitative_payload: { order_id: order.id },
  });

  await supabase.rpc("record_audit", {
    p_action: "order_delivered",
    p_target_type: "order",
    p_target_id: order.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/store/orders", "page");
  return actionOk(undefined);
}
