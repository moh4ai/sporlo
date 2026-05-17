"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

export function AdminSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items: { key: string; href: string }[] = [
    { key: "clubs", href: "/clubs" },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-e border-spo-line bg-white md:flex md:flex-col">
      <div className="flex items-center gap-2 border-b border-spo-line px-5 py-4">
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
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
            return (
              <li key={it.key}>
                <Link
                  href={it.href}
                  className={
                    "block rounded-xl px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-spo-green-soft font-medium text-spo-green-deep"
                      : "text-spo-ink-2 hover:bg-spo-paper")
                  }
                >
                  {t(it.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
