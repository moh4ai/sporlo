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
  FixtureCreateSchema,
  FixtureIdSchema,
  FixtureUpdateSchema,
  MatchEventRecordSchema,
  PricingSetSchema,
  PublicTicketIntentSchema,
  ScanTicketSchema,
  SectionCreateSchema,
  SectionDeleteSchema,
  type FixtureCreateInput,
  type FixtureUpdateInput,
  type MatchEventRecordInput,
  type PricingSetInput,
  type PublicTicketIntentInput,
  type ScanTicketInput,
  type SectionCreateInput,
  type SectionDeleteInput,
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
// Fixtures
// ─────────────────────────────────────────────

export async function createFixture(
  input: FixtureCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = FixtureCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "events");
  if (error) return permissionError("create", "events");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("fixtures")
    .insert({ org_id: tenant!.org_id, ...parsed.data })
    .select("id")
    .single();
  if (insertErr || !data) return actionError(insertErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "fixture_created",
    p_target_type: "fixture",
    p_target_id: data.id,
    p_payload: { opponent: parsed.data.opponent_en },
  });

  revalidatePath("/[locale]/(dashboard)/events", "page");
  return actionOk({ id: data.id as string });
}

export async function updateFixture(
  input: FixtureUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = FixtureUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "events");
  if (error) return permissionError("update", "events");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("fixtures")
    .update(patch)
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "fixture_updated",
    p_target_type: "fixture",
    p_target_id: id,
    p_payload: {},
  });

  // If status transitioned to "completed", emit event_held.
  if (patch.status === "completed") {
    await recordEvent({
      client: supabase,
      org_id: tenant!.org_id,
      definition: EVT.EVENT_HELD,
      qualitative_payload: { fixture_id: id },
    });
  }

  revalidatePath(`/[locale]/(dashboard)/events/${id}`, "page");
  revalidatePath("/[locale]/(dashboard)/events", "page");
  return actionOk(undefined);
}

export async function archiveFixture(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = FixtureIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "events");
  if (error) return permissionError("delete", "events");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("fixtures")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "fixture_cancelled",
    p_target_type: "fixture",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/events", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Sections + seats + pricing
// ─────────────────────────────────────────────

function rowLabel(idx: number): string {
  // 0 → "A", 25 → "Z", 26 → "AA", 27 → "AB"…
  let label = "";
  let n = idx;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export async function createSectionWithSeats(
  input: SectionCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = SectionCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "events");
  if (error) return permissionError("update", "events");

  const supabase = await createSupabaseServerClient();
  const { data: section, error: insErr } = await supabase
    .from("venue_sections")
    .insert({
      org_id: tenant!.org_id,
      fixture_id: parsed.data.fixture_id,
      label: parsed.data.label,
      rows_count: parsed.data.rows_count,
      seats_per_row: parsed.data.seats_per_row,
      display_order: parsed.data.display_order,
    })
    .select("id")
    .single();
  if (insErr || !section) {
    if (insErr?.code === "23505") return actionError("label-exists", "label");
    return actionError(insErr?.message ?? "insert-failed");
  }

  // Generate seats. Batch insert.
  const seatRows: Array<{
    org_id: string;
    section_id: string;
    row_label: string;
    seat_number: number;
  }> = [];
  for (let r = 0; r < parsed.data.rows_count; r++) {
    const lbl = rowLabel(r);
    for (let s = 1; s <= parsed.data.seats_per_row; s++) {
      seatRows.push({
        org_id: tenant!.org_id,
        section_id: section.id,
        row_label: lbl,
        seat_number: s,
      });
    }
  }

  // PostgREST has limits on batch size; chunk if needed.
  const CHUNK = 500;
  for (let i = 0; i < seatRows.length; i += CHUNK) {
    const { error: seatsErr } = await supabase
      .from("seats")
      .insert(seatRows.slice(i, i + CHUNK));
    if (seatsErr) return actionError(`seats-insert-failed:${seatsErr.message}`);
  }

  await supabase.rpc("record_audit", {
    p_action: "venue_section_created",
    p_target_type: "venue_section",
    p_target_id: section.id,
    p_payload: { rows: parsed.data.rows_count, seats_per_row: parsed.data.seats_per_row },
  });

  revalidatePath(`/[locale]/(dashboard)/events/${parsed.data.fixture_id}`, "page");
  return actionOk({ id: section.id as string });
}

export async function deleteSection(
  input: SectionDeleteInput,
): Promise<ActionResult<void>> {
  const parsed = SectionDeleteSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "events");
  if (error) return permissionError("update", "events");

  const supabase = await createSupabaseServerClient();
  const { error: delErr } = await supabase
    .from("venue_sections")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (delErr) return actionError(delErr.message);

  await supabase.rpc("record_audit", {
    p_action: "venue_section_deleted",
    p_target_type: "venue_section",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  return actionOk(undefined);
}

export async function setSectionPricing(
  input: PricingSetInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = PricingSetSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "events");
  if (error) return permissionError("update", "events");

  const supabase = await createSupabaseServerClient();
  const { data, error: upsertErr } = await supabase
    .from("pricing_tiers")
    .upsert(
      {
        org_id: tenant!.org_id,
        fixture_id: parsed.data.fixture_id,
        section_id: parsed.data.section_id,
        label: parsed.data.label,
        price_sar: parsed.data.price_sar,
        member_price_sar: parsed.data.member_price_sar ?? null,
      },
      { onConflict: "fixture_id,section_id" },
    )
    .select("id")
    .single();
  if (upsertErr || !data) return actionError(upsertErr?.message ?? "upsert-failed");

  return actionOk({ id: data.id as string });
}

// ─────────────────────────────────────────────
// Public ticket purchase (no auth — uses service role + RLS bypass)
// ─────────────────────────────────────────────

function makeQrCode(): string {
  // 16 random bytes → URL-safe base64 = 22 chars. Enough entropy.
  const arr = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.from(arr)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createTicketIntent(
  input: PublicTicketIntentInput,
): Promise<
  ActionResult<{
    payment_id: string;
    ticket_ids: string[];
    amount_sar: number;
    method: "moyasar" | "manual";
  }>
> {
  const parsed = PublicTicketIntentSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }

  const admin = createServiceRoleClient();

  // Look up fixture (must be scheduled or in_progress).
  const { data: fixture } = await admin
    .from("fixtures")
    .select("id, org_id, status")
    .eq("id", parsed.data.fixture_id)
    .maybeSingle();
  if (!fixture) return actionError("fixture-not-found");
  if (!["scheduled", "in_progress"].includes(fixture.status)) {
    return actionError("fixture-not-open");
  }

  // Pricing for the chosen section.
  const { data: pricing } = await admin
    .from("pricing_tiers")
    .select("price_sar")
    .eq("fixture_id", parsed.data.fixture_id)
    .eq("section_id", parsed.data.section_id)
    .maybeSingle();
  if (!pricing) return actionError("pricing-not-set");
  const pricePer = Number(pricing.price_sar);

  // Find available seats.
  const { data: seats } = await admin
    .from("seats")
    .select("id, row_label, seat_number")
    .eq("section_id", parsed.data.section_id)
    .eq("status", "available")
    .limit(parsed.data.quantity);
  if (!seats || seats.length < parsed.data.quantity) {
    return actionError("not-enough-seats");
  }

  // Hold the seats (best-effort — no row-level lock; race conditions
  // resolved by the next available check on second buyer).
  const seatIds = seats.map((s) => s.id);
  await admin
    .from("seats")
    .update({ status: "held", held_until: new Date(Date.now() + 15 * 60_000).toISOString() })
    .in("id", seatIds);

  // Create the payment.
  const totalAmount = pricePer * parsed.data.quantity;
  const idempotency = `tic-${parsed.data.fixture_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      org_id: fixture.org_id,
      amount_sar: totalAmount,
      currency: "SAR",
      status: "pending",
      provider: parsed.data.payment_method === "moyasar" ? "moyasar" : "manual",
      idempotency_key: idempotency,
    })
    .select("id")
    .single();
  if (payErr || !payment) {
    // Release the held seats.
    await admin.from("seats").update({ status: "available", held_until: null }).in("id", seatIds);
    return actionError(payErr?.message ?? "payment-insert-failed");
  }

  // Create the tickets.
  const ticketRows = seats.map((s) => ({
    org_id: fixture.org_id,
    fixture_id: parsed.data.fixture_id,
    seat_id: s.id,
    buyer_email: parsed.data.buyer_email,
    buyer_phone: parsed.data.buyer_phone ?? null,
    qr_code: makeQrCode(),
    price_sar: pricePer,
    status: "pending",
    payment_id: payment.id,
  }));
  const { data: tickets, error: tixErr } = await admin
    .from("tickets")
    .insert(ticketRows)
    .select("id");
  if (tixErr || !tickets) {
    await admin.from("seats").update({ status: "available", held_until: null }).in("id", seatIds);
    return actionError(tixErr?.message ?? "tickets-insert-failed");
  }

  await admin.from("audit_logs").insert({
    actor_user_id: null,
    actor_role: "anon",
    org_id: fixture.org_id,
    action: "ticket_intent_created",
    target_type: "payment",
    target_id: payment.id,
    payload_jsonb: {
      fixture_id: parsed.data.fixture_id,
      quantity: parsed.data.quantity,
      buyer_email: parsed.data.buyer_email,
    },
  });

  return actionOk({
    payment_id: payment.id,
    ticket_ids: tickets.map((t) => t.id as string),
    amount_sar: totalAmount,
    method: parsed.data.payment_method,
  });
}

// ─────────────────────────────────────────────
// Gate scan
// ─────────────────────────────────────────────

export async function scanTicket(
  input: ScanTicketInput,
): Promise<
  ActionResult<{
    ticket_id: string;
    already_scanned: boolean;
    scanned_at: string;
  }>
> {
  const parsed = ScanTicketSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "events");
  if (error) return permissionError("update", "events");

  const supabase = await createSupabaseServerClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, status, scanned_at, fixture_id")
    .eq("qr_code", parsed.data.qr_code)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();

  if (!ticket) return actionError("ticket-not-found");
  if (ticket.status !== "paid") return actionError("ticket-not-paid");

  if (ticket.scanned_at) {
    return actionOk({
      ticket_id: ticket.id,
      already_scanned: true,
      scanned_at: ticket.scanned_at,
    });
  }

  const now = new Date().toISOString();
  await supabase
    .from("tickets")
    .update({ scanned_at: now, scanned_by: tenant!.user_id })
    .eq("id", ticket.id);

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.ATTENDANCE_RECORDED,
    qualitative_payload: { ticket_id: ticket.id, fixture_id: ticket.fixture_id },
  });
  await supabase.rpc("record_audit", {
    p_action: "ticket_scanned",
    p_target_type: "ticket",
    p_target_id: ticket.id,
    p_payload: {},
  });

  return actionOk({ ticket_id: ticket.id, already_scanned: false, scanned_at: now });
}

// ─────────────────────────────────────────────
// Match events
// ─────────────────────────────────────────────

export async function recordMatchEvent(
  input: MatchEventRecordInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = MatchEventRecordSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "events");
  if (error) return permissionError("update", "events");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("match_events")
    .upsert(
      {
        org_id: tenant!.org_id,
        fixture_id: parsed.data.fixture_id,
        minute: parsed.data.minute,
        type: parsed.data.type,
        team: parsed.data.team,
        player_name: parsed.data.player_name ?? null,
        recorded_offline: parsed.data.recorded_offline,
        recorded_by: tenant!.user_id,
        client_id: parsed.data.client_id,
      },
      { onConflict: "fixture_id,client_id" },
    )
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  revalidatePath(`/[locale]/(dashboard)/events/${parsed.data.fixture_id}/report`, "page");
  return actionOk({ id: data.id as string });
}
