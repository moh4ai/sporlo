import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
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

const baumans = localFont({
  src: "../../../public/fonts/Baumans.ttf",
  variable: "--font-baumans",
  display: "swap",
  weight: "400",
});

const rubik = localFont({
  src: "../../../public/fonts/Rubik-VF.ttf",
  variable: "--font-rubik",
  display: "swap",
  weight: "300 900",
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
      className={`${manrope.variable} ${baumans.variable} ${rubik.variable}`}
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
