"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Button,
  Card,
  FormGroup,
  Input,
  Select,
  Switch,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

import {
  setNotificationPref,
  signOutEverywhere,
  updatePrefs,
  updateProfile,
} from "../actions";

export type ProfileRow = {
  full_name_ar: string | null;
  full_name_en: string | null;
  email: string | null;
  phone: string | null;
};

export type InitialPrefs = {
  preferred_locale: "ar" | "en";
  date_format: "iso" | "long" | "short" | "hijri";
  high_contrast: boolean;
  reduced_motion: boolean;
};

export type NotificationPrefRow = {
  event_type: string;
  channel: "email" | "in_app";
  enabled: boolean;
};

export function SettingsClient({
  profile,
  initialPrefs,
  notificationPrefs,
  events,
  channels,
}: {
  profile: ProfileRow;
  initialPrefs: InitialPrefs;
  notificationPrefs: NotificationPrefRow[];
  events: string[];
  channels: ("email" | "in_app")[];
}) {
  const t = useTranslations("settings");

  return (
    <div className="space-y-6">
      <ProfileSection profile={profile} t={t} />
      <LocalisationSection initial={initialPrefs} t={t} />
      <NotificationsSection
        events={events}
        channels={channels}
        rows={notificationPrefs}
        t={t}
      />
      <AppearanceSection initial={initialPrefs} t={t} />
      <SessionsSection t={t} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────

function ProfileSection({
  profile,
  t,
}: {
  profile: ProfileRow;
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [nameAr, setNameAr] = useState(profile.full_name_ar ?? "");
  const [nameEn, setNameEn] = useState(profile.full_name_en ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await updateProfile({
      full_name_ar: nameAr,
      full_name_en: nameEn,
      phone,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.saved") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-spo-ink">{t("sections.profile")}</h2>
          <p className="text-sm text-spo-muted">{t("sections.profileHint")}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fields.fullNameAr")}>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("fields.fullNameEn")}>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fields.email")}>
            <Input value={profile.email ?? ""} dir="ltr" disabled />
          </FormGroup>
          <FormGroup label={t("fields.phone")}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("actions.saving") : t("actions.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Localisation
// ─────────────────────────────────────────────

function LocalisationSection({
  initial,
  t,
}: {
  initial: InitialPrefs;
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [locale, setLocale] = useState<"ar" | "en">(initial.preferred_locale);
  const [dateFormat, setDateFormat] = useState<InitialPrefs["date_format"]>(
    initial.date_format,
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await updatePrefs({
      preferred_locale: locale,
      date_format: dateFormat,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.saved") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-spo-ink">{t("sections.localisation")}</h2>
          <p className="text-sm text-spo-muted">{t("sections.localisationHint")}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fields.preferredLocale")}>
            <Select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "ar" | "en")}
            >
              <option value="ar">{t("locales.ar")}</option>
              <option value="en">{t("locales.en")}</option>
            </Select>
          </FormGroup>

          <FormGroup label={t("fields.dateFormat")}>
            <Select
              value={dateFormat}
              onChange={(e) =>
                setDateFormat(e.target.value as InitialPrefs["date_format"])
              }
            >
              <option value="iso">{t("dateFormats.iso")}</option>
              <option value="long">{t("dateFormats.long")}</option>
              <option value="short">{t("dateFormats.short")}</option>
              <option value="hijri">{t("dateFormats.hijri")}</option>
            </Select>
          </FormGroup>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("actions.saving") : t("actions.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────

function NotificationsSection({
  events,
  channels,
  rows,
  t,
}: {
  events: string[];
  channels: ("email" | "in_app")[];
  rows: NotificationPrefRow[];
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [state, setState] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    for (const r of rows) {
      next[`${r.event_type}:${r.channel}`] = r.enabled;
    }
    return next;
  });

  async function toggle(event_type: string, channel: "email" | "in_app") {
    const key = `${event_type}:${channel}`;
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    const res = await setNotificationPref({ event_type, channel, enabled: next });
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      // Roll back the optimistic flip.
      setState((s) => ({ ...s, [key]: !next }));
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Card>
      <div className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-spo-ink">{t("sections.notifications")}</h2>
          <p className="text-sm text-spo-muted">{t("sections.notificationsHint")}</p>
        </header>

        <div className="overflow-hidden rounded-card border border-spo-line">
          <table className="w-full text-sm">
            <thead className="bg-spo-paper text-xs uppercase tracking-wider text-spo-muted">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("sections.notifications")}</th>
                {channels.map((c) => (
                  <th key={c} className="px-3 py-2 text-center font-medium">
                    {t(`channels.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev, idx) => (
                <tr
                  key={ev}
                  className={idx % 2 === 1 ? "bg-spo-paper/40" : undefined}
                >
                  <td className="px-3 py-2 text-spo-ink-2">{t(`events.${ev}`)}</td>
                  {channels.map((c) => {
                    const key = `${ev}:${c}`;
                    return (
                      <td key={c} className="px-3 py-2 text-center">
                        <Switch
                          checked={state[key] ?? true}
                          onChange={() => toggle(ev, c)}
                          label=""
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Appearance
// ─────────────────────────────────────────────

function AppearanceSection({
  initial,
  t,
}: {
  initial: InitialPrefs;
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [highContrast, setHighContrast] = useState(initial.high_contrast);
  const [reducedMotion, setReducedMotion] = useState(initial.reduced_motion);
  const [pending, setPending] = useState(false);

  async function flipHighContrast(next: boolean) {
    setHighContrast(next);
    // Apply optimistically to <html> so the change is instant. The server
    // round-trip persists it across reloads.
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-contrast",
        next ? "high" : "normal",
      );
    }
    setPending(true);
    const res = await updatePrefs({ high_contrast: next });
    setPending(false);
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      setHighContrast(!next);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute(
          "data-contrast",
          !next ? "high" : "normal",
        );
      }
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function flipReducedMotion(next: boolean) {
    setReducedMotion(next);
    setPending(true);
    const res = await updatePrefs({ reduced_motion: next });
    setPending(false);
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      setReducedMotion(!next);
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Card>
      <div className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-spo-ink">{t("sections.appearance")}</h2>
          <p className="text-sm text-spo-muted">{t("sections.appearanceHint")}</p>
        </header>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-spo-ink-2">{t("fields.highContrast")}</div>
              <p className="text-xs text-spo-muted">{t("fields.highContrastHint")}</p>
            </div>
            <Switch
              checked={highContrast}
              onChange={flipHighContrast}
              label=""
              disabled={pending}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-spo-line pt-3">
            <div>
              <div className="text-sm text-spo-ink-2">{t("fields.reducedMotion")}</div>
              <p className="text-xs text-spo-muted">{t("fields.reducedMotionHint")}</p>
            </div>
            <Switch
              checked={reducedMotion}
              onChange={flipReducedMotion}
              label=""
              disabled={pending}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────

function SessionsSection({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function signOutAll() {
    setSubmitting(true);
    const res = await signOutEverywhere();
    if (!res.ok) {
      setSubmitting(false);
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
      return;
    }
    // Refresh the browser client so it drops the in-memory tokens too.
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Server already invalidated globally — even if the client signOut
      // throws (e.g. no local session), we still want to redirect.
    }
    toast.push({ tone: "success", title: t("toast.signedOut") });
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <Card>
      <div className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-spo-ink">{t("sections.sessions")}</h2>
          <p className="text-sm text-spo-muted">{t("sections.sessionsHint")}</p>
        </header>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="danger"
            onClick={signOutAll}
            disabled={submitting}
          >
            {submitting ? t("actions.signingOut") : t("actions.signOutEverywhere")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
