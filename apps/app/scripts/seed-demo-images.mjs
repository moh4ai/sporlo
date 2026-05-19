// Seed the demo-club tenant with real images across every visual surface
// so the polish pass has something to show. Idempotent: rerunning won't
// duplicate galleries/sponsors (uses code/name uniqueness or upserts).
//
//   cd apps/app && node scripts/seed-demo-images.mjs
//
// Photos: picsum.photos seeded URLs. Logos: SVG generated inline.

import dotenv from "dotenv";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

dotenv.config({ path: new URL("../.env.local", import.meta.url) });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DB_URL) {
  console.error("Missing env vars (SUPABASE_URL / SERVICE_ROLE_KEY / SUPABASE_DB_URL)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const pg = new Client({ connectionString: DB_URL });

const pic = (seed, w = 1200, h = 800) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

async function downloadJpeg(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadFile(bucket, path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
  return path;
}

function svgClubLogo(initials, bgColor, fgColor) {
  // Crest-style: rounded square + initials. Renders crisp at any size.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="${shade(bgColor, -20)}"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="180" height="180" rx="28" fill="url(#g)"/>
  <rect x="10" y="10" width="180" height="180" rx="28" fill="none" stroke="${fgColor}" stroke-width="3" stroke-opacity="0.3"/>
  <text x="100" y="120" font-family="Georgia, serif" font-weight="bold" font-size="78" text-anchor="middle" fill="${fgColor}">${initials}</text>
  <line x1="40" y1="145" x2="160" y2="145" stroke="${fgColor}" stroke-width="2" stroke-opacity="0.6"/>
  <text x="100" y="170" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="${fgColor}" letter-spacing="3">EST. 2024</text>
</svg>`;
}

function svgSponsorLogo(name, bgColor) {
  // Brand wordmark style: full word on coloured background.
  const fg = isLightColor(bgColor) ? "#0f172a" : "#ffffff";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
  <rect width="300" height="100" rx="10" fill="${bgColor}"/>
  <text x="150" y="62" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="32" text-anchor="middle" fill="${fg}" letter-spacing="2">${name.toUpperCase()}</text>
</svg>`;
}

function shade(hex, percent) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + percent));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (n & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
function isLightColor(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
}

async function main() {
  await pg.connect();
  const { rows: [org] } = await pg.query(
    "select id, name_ar, name_en, primary_color from organizations where slug='demo-club'",
  );
  if (!org) throw new Error("demo-club tenant not found");
  console.log("Seeding images for:", org.name_en, `(${org.id})`);
  const orgId = org.id;
  const primary = org.primary_color || "#0f6e3f";

  // ─── 1. Org logo ────────────────────────────────────────────────
  {
    const initials = "DSC";
    const svg = svgClubLogo(initials, primary, "#ffffff");
    const path = `${orgId}/logo.svg`;
    await uploadFile("org-branding", path, Buffer.from(svg, "utf8"), "image/svg+xml");
    await pg.query("update organizations set logo_path=$1 where id=$2", [path, orgId]);
    console.log("  ✓ org logo");
  }

  // ─── 2. News covers (15 articles) ───────────────────────────────
  {
    const { rows: articles } = await pg.query(
      "select id, slug from news_articles where org_id=$1 order by created_at",
      [orgId],
    );
    for (const [i, a] of articles.entries()) {
      const url = pic(`sporlo-news-${i}-${a.slug}`, 1600, 1000);
      await pg.query(
        "update news_articles set cover_image_path=$1 where id=$2",
        [url, a.id],
      );
    }
    console.log(`  ✓ ${articles.length} news covers`);
  }

  // ─── 3. Roster photos (15 players) ──────────────────────────────
  {
    const { rows: players } = await pg.query(
      "select id, jersey_number from roster_entries where org_id=$1 order by jersey_number nulls last",
      [orgId],
    );
    for (const p of players) {
      const url = pic(`sporlo-player-${p.id}`, 600, 800);
      await pg.query("update roster_entries set photo_path=$1 where id=$2", [
        url,
        p.id,
      ]);
    }
    console.log(`  ✓ ${players.length} player photos`);
  }

  // ─── 4. Sponsors (6 across 4 tiers) ─────────────────────────────
  {
    const sponsors = [
      { name_en: "Aramco", name_ar: "أرامكو", tier: "strategic", color: "#0f6e3f" },
      { name_en: "STC", name_ar: "الاتصالات السعودية", tier: "main", color: "#5e0d8b" },
      { name_en: "Almarai", name_ar: "المراعي", tier: "main", color: "#005baa" },
      { name_en: "SABIC", name_ar: "سابك", tier: "official", color: "#0072ce" },
      { name_en: "Saudia", name_ar: "السعودية", tier: "official", color: "#15487d" },
      { name_en: "Tabuk Cement", name_ar: "أسمنت تبوك", tier: "supporter", color: "#7a7a7a" },
    ];
    // Idempotent: delete any prior demo sponsors first
    await pg.query("delete from sponsors where org_id=$1", [orgId]);
    for (const [i, s] of sponsors.entries()) {
      const svg = svgSponsorLogo(s.name_en, s.color);
      const path = `${orgId}/${s.name_en.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.svg`;
      await uploadFile("sponsor-logos", path, Buffer.from(svg, "utf8"), "image/svg+xml");
      await pg.query(
        `insert into sponsors (org_id, name_ar, name_en, tier, logo_path, display_order, active)
         values ($1, $2, $3, $4, $5, $6, true)`,
        [orgId, s.name_ar, s.name_en, s.tier, path, i],
      );
    }
    console.log(`  ✓ ${sponsors.length} sponsors w/ logos`);
  }

  // ─── 5. Galleries (3 published, with 6 items each) ──────────────
  {
    const galleries = [
      {
        title_ar: "يوم المباراة",
        title_en: "Match Day",
        description_ar: "أجواء المدرجات والمشجعين قبل المباراة وبعدها.",
        description_en: "Stands, fans, and atmosphere before and after the match.",
      },
      {
        title_ar: "التدريبات",
        title_en: "Training Camp",
        description_ar: "من ملاعب التدريب اليومية إلى المعسكرات الخارجية.",
        description_en: "Daily drills to overseas training camps.",
      },
      {
        title_ar: "خلف الكواليس",
        title_en: "Behind the Scenes",
        description_ar: "اللحظات التي لا تظهر في البث المباشر.",
        description_en: "Moments you won't see on the broadcast.",
      },
    ];
    // Idempotent: wipe prior demo galleries
    await pg.query("delete from media_galleries where org_id=$1", [orgId]);
    for (const [gi, g] of galleries.entries()) {
      const coverPath = `${orgId}/gallery-${gi}-cover.jpg`;
      const coverBuf = await downloadJpeg(pic(`sporlo-gallery-${gi}-cover`, 1600, 1200));
      await uploadFile("media-galleries", coverPath, coverBuf, "image/jpeg");
      const { rows: [created] } = await pg.query(
        `insert into media_galleries (org_id, title_ar, title_en, description_ar, description_en, cover_image_path, published_at, display_order)
         values ($1, $2, $3, $4, $5, $6, now(), $7) returning id`,
        [orgId, g.title_ar, g.title_en, g.description_ar, g.description_en, coverPath, gi],
      );
      const galleryId = created.id;
      // 6 items per gallery
      for (let i = 0; i < 6; i++) {
        const itemPath = `${orgId}/gallery-${gi}-${i}.jpg`;
        const itemBuf = await downloadJpeg(pic(`sporlo-gallery-${gi}-item-${i}`, 1400, 1050));
        await uploadFile("media-galleries", itemPath, itemBuf, "image/jpeg");
        await pg.query(
          `insert into media_gallery_items (gallery_id, org_id, image_path, caption_ar, caption_en, display_order)
           values ($1, $2, $3, $4, $5, $6)`,
          [galleryId, orgId, itemPath, null, null, i],
        );
      }
      console.log(`    · ${g.title_en} (+6 items)`);
    }
    console.log(`  ✓ ${galleries.length} galleries`);
  }

  // ─── 6. Hospitality covers (4 packages) ─────────────────────────
  {
    const { rows: packages } = await pg.query(
      "select id, name_en from hospitality_packages where org_id=$1 order by display_order",
      [orgId],
    );
    for (const [i, p] of packages.entries()) {
      const path = `${orgId}/${i}-${Date.now()}.jpg`;
      const buf = await downloadJpeg(pic(`sporlo-hosp-${p.id}`, 1600, 900));
      await uploadFile("hospitality-covers", path, buf, "image/jpeg");
      await pg.query(
        "update hospitality_packages set cover_image_path=$1 where id=$2",
        [path, p.id],
      );
    }
    console.log(`  ✓ ${packages.length} hospitality covers`);
  }

  // ─── 7. Stadium info ────────────────────────────────────────────
  {
    const photoUrl = pic("sporlo-stadium-hero", 2400, 1200);
    await pg.query(
      `insert into stadium_info (org_id, name_ar, name_en, address_ar, address_en, city_ar, city_en, capacity, opened_year, photo_path, parking_notes_ar, parking_notes_en, accessibility_notes_ar, accessibility_notes_en, map_lat, map_lng)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       on conflict (org_id) do update set
         name_ar=excluded.name_ar, name_en=excluded.name_en,
         address_ar=excluded.address_ar, address_en=excluded.address_en,
         city_ar=excluded.city_ar, city_en=excluded.city_en,
         capacity=excluded.capacity, opened_year=excluded.opened_year,
         photo_path=excluded.photo_path,
         parking_notes_ar=excluded.parking_notes_ar, parking_notes_en=excluded.parking_notes_en,
         accessibility_notes_ar=excluded.accessibility_notes_ar, accessibility_notes_en=excluded.accessibility_notes_en,
         map_lat=excluded.map_lat, map_lng=excluded.map_lng`,
      [
        orgId,
        "ملعب نادي العرض",
        "Demo Club Stadium",
        "حي الملز، شارع الرياضة",
        "Al-Malaz district, Sports Street",
        "الرياض",
        "Riyadh",
        45000,
        2018,
        photoUrl,
        "مواقف مخصصة لـ 3,500 سيارة على مساحة 80 ألف متر مربع، شاملة مواقف ذوي الاحتياجات الخاصة.",
        "Dedicated parking for 3,500 cars across 80,000 m², including accessible spots near every gate.",
        "كافة المداخل مزودة بمصاعد ومنحدرات. أماكن مخصصة لمستخدمي الكراسي المتحركة في كل مدرج.",
        "All entrances have lifts and ramps. Wheelchair seating in every stand with companion access.",
        24.6877,
        46.7219,
      ],
    );
    console.log("  ✓ stadium info");
  }

  await pg.end();
  console.log("\nAll done. Visit https://demo-club.sporlo.net/en/welcome");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
