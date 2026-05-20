import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope, Tajawal } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { ToastProvider } from "@sporlo/ui";

import { AxeReporter } from "@/components/AxeReporter";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { routing, type Locale } from "@/i18n/routing";
import { CartProvider } from "@/lib/cart";
import "../globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Bebas Neue — single-weight condensed display font, widely used in sports
// branding. Drives `--font-display` for English headlines + the wordmark.
const bebas = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas",
  weight: "400",
  display: "swap",
});

// Tajawal — clean Arabic body+display family used by Saudi sports media.
// Drives `--font-ar` for the entire Arabic locale (display and body).
const tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-tajawal",
  weight: ["300", "400", "500", "700", "800", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0f6e3f",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL("https://app.sporlo.net"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en" },
    },
    icons: { icon: "/favicon.ico" },
    manifest: "/manifest.webmanifest",
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale as Locale);

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${manrope.variable} ${bebas.variable} ${tajawal.variable}`}
    >
      <body className="min-h-screen bg-spo-paper text-spo-ink antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>
            <CartProvider>{children}</CartProvider>
          </ToastProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
        <AxeReporter />
      </body>
    </html>
  );
}
