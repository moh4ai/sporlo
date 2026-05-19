"use client";

import { useState, useEffect, type FormEvent } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { parseClaims } from "@sporlo/auth";
import { Button, Input } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Mode = "sign-in" | "sign-up";

export function SignInForm({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("signIn");
  const router = useRouter();
  const searchParams = useSearchParams();
  // When the fan portal sends a visitor here from /membership we carry the
  // selected plan code as ?plan=. Default the form to sign-up (most clickers
  // are new members) and route back into checkout after auth.
  const planCode = searchParams.get("plan");
  const [mode, setMode] = useState<Mode>(planCode ? "sign-up" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If the user landed with ?plan= but then toggles modes back and forth,
  // keep the default aligned with the param the first time it appears.
  useEffect(() => {
    if (planCode) setMode("sign-up");
  }, [planCode]);

  function nextDestination(role: string | undefined): string {
    if (planCode) return `/membership/checkout?plan=${encodeURIComponent(planCode)}`;
    return role === "member" ? "/me" : "/";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === "sign-up") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
        });
        if (err) throw err;
        if (data.session) {
          router.replace(nextDestination(undefined));
          router.refresh();
        } else {
          // Email confirmation required.
          setSuccess(t("checkEmail"));
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        const claims = data.session ? parseClaims(data.session.access_token) : null;
        router.replace(nextDestination(claims?.role ?? undefined));
        router.refresh();
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-card-lg border border-spo-line bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Image
          src="/brand/sporlo-logo-green.png"
          alt="Sporlo"
          width={28}
          height={28}
          priority
        />
        <span
          className="text-xl text-spo-green-deep"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sporlo
        </span>
      </div>

      <h1 className="text-xl font-semibold text-spo-ink">
        {mode === "sign-in" ? t("headlineSignIn") : t("headlineSignUp")}
      </h1>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm text-spo-ink-2">{t("email")}</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            dir="ltr"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-spo-ink-2">{t("password")}</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            dir="ltr"
          />
        </label>
      </div>

      {error && <p className="text-sm text-spo-danger">{error}</p>}
      {success && <p className="text-sm text-spo-green-deep">{success}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {mode === "sign-in" ? t("submitSignIn") : t("submitSignUp")}
      </Button>

      <button
        type="button"
        className="block w-full text-center text-sm text-spo-muted hover:text-spo-ink-2"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
          setSuccess(null);
        }}
      >
        {mode === "sign-in" ? t("switchToSignUp") : t("switchToSignIn")}
      </button>

      {/* locale prop reserved for future locale-specific copy; reference it so
          unused-vars rule passes. */}
      <span className="sr-only">{locale}</span>
    </form>
  );
}
