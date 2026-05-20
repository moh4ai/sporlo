"use client";

import { useTranslations } from "next-intl";

import { useCart } from "@/lib/cart";

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h12l-.9 9.2A2 2 0 0 1 13.1 18H6.9a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M7 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function CartIconButton({
  className,
}: {
  className?: string;
}) {
  const t = useTranslations("store.shop.miniCart");
  const { count, mounted, openMiniCart } = useCart();

  return (
    <button
      type="button"
      onClick={openMiniCart}
      aria-label={t("title")}
      className={
        "relative inline-flex size-9 items-center justify-center rounded-md text-spo-ink-2 transition-colors hover:bg-spo-paper " +
        (className ?? "")
      }
    >
      <BagIcon className="size-5" />
      {mounted && count > 0 && (
        <span className="absolute -end-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-pill bg-spo-green px-1.5 text-[10px] font-semibold leading-5 text-white">
          {count}
        </span>
      )}
    </button>
  );
}
