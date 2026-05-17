"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button, Card, Input } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SignInForm() {
  const t = useTranslations("signIn");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(t("errorGeneric"));
      return;
    }
    router.replace("/clubs");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-card-lg border border-spo-line bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Image
          src="/brand/sporlo-logo-green.png"
          alt="Sporlo HQ"
          width={28}
          height={28}
          priority
        />
        <span
          className="text-xl text-spo-green-deep"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sporlo HQ
        </span>
      </div>

      <h1 className="text-xl font-semibold text-spo-ink">{t("headline")}</h1>

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
          autoComplete="current-password"
          dir="ltr"
        />
      </label>

      {error && <p className="text-sm text-spo-danger">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {t("submit")}
      </Button>

      <Card variant="warm" className="space-y-1">
        <p className="text-sm font-medium text-spo-ink-2">
          {t("instructionsTitle")}
        </p>
        <p className="text-xs text-spo-muted">{t("instructionsBody")}</p>
      </Card>
    </form>
  );
}
