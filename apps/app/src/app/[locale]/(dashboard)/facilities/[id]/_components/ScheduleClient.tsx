"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyTableRow,
  FormGroup,
  Input,
  Modal,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Textarea,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  cancelBooking,
  createBooking,
  createMaintenance,
  deleteMaintenance,
} from "../../actions";

export type BookingRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  booked_by_name: string | null;
  booked_by_email: string | null;
  status: "held" | "confirmed" | "cancelled" | "completed";
  notes: string | null;
};

export type MaintenanceRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export function ScheduleClient({
  facilityId,
  bookings,
  maintenance,
  principal,
  locale,
}: {
  facilityId: string;
  bookings: BookingRow[];
  maintenance: MaintenanceRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("facilities");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canUpdate = useMemo(
    () => canPerform(principal, "update", "facilities"),
    [principal],
  );

  const [bookingOpen, setBookingOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRow | null>(null);
  const [cancellingMaintenance, setCancellingMaintenance] = useState<MaintenanceRow | null>(null);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-spo-ink">
            {t("detail.bookings")}
          </h3>
          {canUpdate && (
            <Button onClick={() => setBookingOpen(true)}>
              {t("detail.newBooking")}
            </Button>
          )}
        </div>
        <Table>
          <THead>
            <TR>
              <TH>{t("booking.startsAt")}</TH>
              <TH>{t("booking.endsAt")}</TH>
              <TH>{t("booking.name")}</TH>
              <TH>{t("common.cancel")}</TH>
            </TR>
          </THead>
          <TBody>
            {bookings.length === 0 ? (
              <EmptyTableRow colSpan={4}>{t("detail.emptyBookings")}</EmptyTableRow>
            ) : (
              bookings.map((b) => (
                <TR key={b.id}>
                  <TD className="text-xs text-spo-muted">{dateFmt.format(new Date(b.starts_at))}</TD>
                  <TD className="text-xs text-spo-muted">{dateFmt.format(new Date(b.ends_at))}</TD>
                  <TD>
                    {b.booked_by_name ?? "—"}
                    {b.status === "cancelled" && (
                      <Badge tone="neutral" className="ms-2">cancelled</Badge>
                    )}
                  </TD>
                  <TD>
                    {b.status !== "cancelled" && canUpdate && (
                      <button
                        type="button"
                        onClick={() => setCancellingBooking(b)}
                        className="text-sm text-spo-danger hover:underline"
                      >
                        {t("common.cancel")}
                      </button>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-spo-ink">
            {t("detail.maintenance")}
          </h3>
          {canUpdate && (
            <Button onClick={() => setMaintenanceOpen(true)} variant="secondary">
              {t("detail.newMaintenance")}
            </Button>
          )}
        </div>
        <Table>
          <THead>
            <TR>
              <TH>{t("maintenance.startsAt")}</TH>
              <TH>{t("maintenance.endsAt")}</TH>
              <TH>{t("maintenance.reason")}</TH>
              <TH>{t("common.delete")}</TH>
            </TR>
          </THead>
          <TBody>
            {maintenance.length === 0 ? (
              <EmptyTableRow colSpan={4}>{t("detail.emptyMaintenance")}</EmptyTableRow>
            ) : (
              maintenance.map((m) => (
                <TR key={m.id}>
                  <TD className="text-xs text-spo-muted">{dateFmt.format(new Date(m.starts_at))}</TD>
                  <TD className="text-xs text-spo-muted">{dateFmt.format(new Date(m.ends_at))}</TD>
                  <TD>{m.reason ?? "—"}</TD>
                  <TD>
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => setCancellingMaintenance(m)}
                        className="text-sm text-spo-danger hover:underline"
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {bookingOpen && (
        <BookingFormModal
          facilityId={facilityId}
          onClose={() => setBookingOpen(false)}
          onDone={() => {
            setBookingOpen(false);
            refresh();
          }}
        />
      )}

      {maintenanceOpen && (
        <MaintenanceFormModal
          facilityId={facilityId}
          onClose={() => setMaintenanceOpen(false)}
          onDone={() => {
            setMaintenanceOpen(false);
            refresh();
          }}
        />
      )}

      <ConfirmModal
        open={!!cancellingBooking}
        title={t("common.cancel")}
        description=""
        confirmLabel={t("common.cancel")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setCancellingBooking(null)}
        onConfirm={async () => {
          if (!cancellingBooking) return;
          const res = await cancelBooking({ id: cancellingBooking.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.bookingCancelled") });
            setCancellingBooking(null);
            refresh();
          } else {
            toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
          }
        }}
      />

      <ConfirmModal
        open={!!cancellingMaintenance}
        title={t("common.delete")}
        description={cancellingMaintenance?.reason ?? ""}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setCancellingMaintenance(null)}
        onConfirm={async () => {
          if (!cancellingMaintenance) return;
          const res = await deleteMaintenance({ id: cancellingMaintenance.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.maintenanceRemoved") });
            setCancellingMaintenance(null);
            refresh();
          } else {
            toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
          }
        }}
      />
    </div>
  );
}

function defaultRange(): { starts: string; ends: string } {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 24);
  const end = new Date(now);
  end.setHours(end.getHours() + 2);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { starts: toLocal(now), ends: toLocal(end) };
}

function BookingFormModal({
  facilityId,
  onClose,
  onDone,
}: {
  facilityId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("facilities");
  const toast = useToast();
  const init = defaultRange();
  const [starts, setStarts] = useState(init.starts);
  const [ends, setEnds] = useState(init.ends);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await createBooking({
      facility_id: facilityId,
      starts_at: new Date(starts).toISOString(),
      ends_at: new Date(ends).toISOString(),
      booked_by_name: name,
      booked_by_email: email,
      booked_by_phone: phone,
      notes,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.bookingCreated") });
      onDone();
    } else {
      if (res.error === "time-conflict") setErr(t("errors.timeConflict"));
      else if (res.error === "maintenance-conflict") setErr(t("errors.maintenanceConflict"));
      else if (res.error === "invalid-range") setErr(t("errors.invalidRange"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("booking.title")}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("booking.startsAt")} required>
            <Input
              type="datetime-local"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("booking.endsAt")} required>
            <Input
              type="datetime-local"
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
        </div>
        <FormGroup label={t("booking.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("booking.email")}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("booking.phone")}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("booking.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormGroup>
        {err && <p className="text-sm text-spo-danger">{err}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("booking.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MaintenanceFormModal({
  facilityId,
  onClose,
  onDone,
}: {
  facilityId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("facilities");
  const toast = useToast();
  const init = defaultRange();
  const [starts, setStarts] = useState(init.starts);
  const [ends, setEnds] = useState(init.ends);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await createMaintenance({
      facility_id: facilityId,
      starts_at: new Date(starts).toISOString(),
      ends_at: new Date(ends).toISOString(),
      reason,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.maintenanceScheduled") });
      onDone();
    } else {
      if (res.error === "booking-conflict") setErr(t("errors.bookingConflict"));
      else if (res.error === "invalid-range") setErr(t("errors.invalidRange"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("maintenance.title")}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("maintenance.startsAt")} required>
            <Input
              type="datetime-local"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("maintenance.endsAt")} required>
            <Input
              type="datetime-local"
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
        </div>
        <FormGroup label={t("maintenance.reason")}>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormGroup>
        {err && <p className="text-sm text-spo-danger">{err}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("maintenance.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
