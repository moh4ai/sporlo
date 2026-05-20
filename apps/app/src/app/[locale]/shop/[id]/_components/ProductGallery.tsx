"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Modal } from "@sporlo/ui";

export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const t = useTranslations("store.shop.gallery");
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Keep `active` in range if the parent ever changes the list.
  useEffect(() => {
    if (active >= images.length) setActive(0);
  }, [images.length, active]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        setActive((i) => (i + 1) % images.length);
      } else if (e.key === "ArrowLeft") {
        setActive((i) => (i - 1 + images.length) % images.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-card border border-spo-line bg-spo-paper-warm" />
    );
  }

  const current = images[active] ?? images[0]!;

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label={t("openLightbox")}
          className="block aspect-square w-full overflow-hidden rounded-card border border-spo-line bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </button>
        {images.length > 1 && (
          <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6">
            {images.map((url, i) => (
              <li key={url + i}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`${alt} ${i + 1}`}
                  aria-pressed={i === active}
                  className={
                    "block aspect-square w-full overflow-hidden rounded-md border bg-white transition-all " +
                    (i === active
                      ? "border-spo-green ring-2 ring-spo-green"
                      : "border-spo-line hover:border-spo-green/50")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={lightbox}
        onClose={() => setLightbox(false)}
        className="max-w-4xl w-auto bg-transparent p-0 shadow-none"
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            className="max-h-[85vh] w-auto rounded-card-lg bg-spo-ink object-contain"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActive((i) => (i - 1 + images.length) % images.length)
                }
                aria-label={t("prev")}
                className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-spo-ink shadow-[var(--shadow-2)] hover:bg-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setActive((i) => (i + 1) % images.length)}
                aria-label={t("next")}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-spo-ink shadow-[var(--shadow-2)] hover:bg-white"
              >
                ›
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
