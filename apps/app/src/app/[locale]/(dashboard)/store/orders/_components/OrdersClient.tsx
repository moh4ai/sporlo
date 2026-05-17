"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  EmptyTableRow,
  FormGroup,
  Input,
  Modal,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { markOrderDelivered, markOrderShipped } from "../../actions";

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
const STATUS_TONES: Record<OrderStatus, "amber" | "blue" | "green" | "neutral" | "danger" | "purple"> = {
  pending: "amber",
  paid: "blue",
  shipped: "purple",
  delivered: "green",
  cancelled: "neutral",
  refunded: "danger",
};

export type OrderRow = {
  id: string;
  buyer_email: string;
  total_sar: number;
  status: OrderStatus;
  item_count: number;
  created_at: string;
};

export function OrdersClient({
  orders,
  principal,
  locale,
}: {
  orders: OrderRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("store");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canUpdate = useMemo(() => canPerform(principal, "update", "store"), [principal]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [shipping, setShipping] = useState<OrderRow | null>(null);

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
  );
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const rows = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  async function deliver(o: OrderRow) {
    const res = await markOrderDelivered({ id: o.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.orderDelivered") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("orders.title")}</h2>
          <p className="text-sm text-spo-muted">{t("orders.subtitle")}</p>
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="max-w-xs"
        >
          <option value="all">All</option>
          <option value="pending">{t("orders.statuses.pending")}</option>
          <option value="paid">{t("orders.statuses.paid")}</option>
          <option value="shipped">{t("orders.statuses.shipped")}</option>
          <option value="delivered">{t("orders.statuses.delivered")}</option>
          <option value="cancelled">{t("orders.statuses.cancelled")}</option>
          <option value="refunded">{t("orders.statuses.refunded")}</option>
        </Select>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("orders.headers.buyer")}</TH>
            <TH>{t("orders.headers.items")}</TH>
            <TH>{t("orders.headers.total")}</TH>
            <TH>{t("orders.headers.status")}</TH>
            <TH>{t("orders.headers.createdAt")}</TH>
            <TH>{t("orders.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("orders.empty")}</EmptyTableRow>
          ) : (
            rows.map((o) => (
              <TR key={o.id}>
                <TD dir="ltr">{o.buyer_email}</TD>
                <TD>{o.item_count}</TD>
                <TD>{sarFmt.format(o.total_sar)}</TD>
                <TD>
                  <Badge tone={STATUS_TONES[o.status]}>
                    {t(`orders.statuses.${o.status}`)}
                  </Badge>
                </TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(o.created_at))}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && o.status === "paid" && (
                    <button
                      type="button"
                      onClick={() => setShipping(o)}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("orders.actions.ship")}
                    </button>
                  )}
                  {canUpdate && o.status === "shipped" && (
                    <button
                      type="button"
                      onClick={() => deliver(o)}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("orders.actions.deliver")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {shipping && (
        <ShipModal
          order={shipping}
          onClose={() => setShipping(null)}
          onDone={() => {
            setShipping(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function ShipModal({
  order,
  onClose,
  onDone,
}: {
  order: OrderRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("store");
  const toast = useToast();
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await markOrderShipped({
      id: order.id,
      carrier,
      tracking_number: tracking,
    });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.orderShipped") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("orders.shipForm.title")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("orders.shipForm.carrier")}>
          <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </FormGroup>
        <FormGroup label={t("orders.shipForm.tracking")}>
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} dir="ltr" />
        </FormGroup>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={busy}>
            {t("orders.actions.ship")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
