"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { visibleModules, type Principal } from "@sporlo/auth";

import { Link, usePathname } from "@/i18n/navigation";

export function Sidebar({ principal }: { principal: Principal }) {
  const t = useTranslations("modules");
  const pathname = usePathname();
  const modules = visibleModules(principal);

  return (
    <aside className="hidden w-64 shrink-0 border-e border-spo-line bg-white md:flex md:flex-col">
      <div className="flex items-center gap-2 border-b border-spo-line px-5 py-4">
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
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {modules.map((mod) => {
            const active = pathname === `/${mod}`;
            return (
              <li key={mod}>
                <Link
                  href={`/${mod}`}
                  className={
                    "block rounded-xl px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-spo-green-soft font-medium text-spo-green-deep"
                      : "text-spo-ink-2 hover:bg-spo-paper")
                  }
                >
                  {t(mod)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
