// Seed the demo-club tenant with REAL sports imagery across every visual
// surface, so the demo doesn't ship random landscape photos. Idempotent:
// rerunning won't duplicate galleries/sponsors (uses code/name uniqueness
// or upserts).
//
//   cd apps/app && node scripts/seed-demo-images.mjs
//
// PHOTOS:
//   Curated Unsplash CDN URLs grouped under the CURATED constant below.
//   Each entry is a photo-ID — easy to swap if a photo gets removed.
//   If a URL 404s the seeder logs a warning and continues; the surface
//   will show a broken image until you swap the ID and rerun.
//
// LOGOS:
//   Org + sponsor logos are SVG generated inline (no external dependency).

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

// ─────────────────────────────────────────────────────────────────────
// CURATED PHOTO LIST
// Each value is an Unsplash photo ID. Swap any ID by browsing unsplash.com
// → copy URL → paste the part after `photo-` here, and rerun the script.
// ─────────────────────────────────────────────────────────────────────

const CURATED = {
  // Player portraits — soccer/football athletes. 15 entries to cover the
  // full roster + bench seeded by demo.sql.
  players: [
    "1517466787929-bc90951d0974", // jersey backside
    "1574629810360-7efbbe195018", // player portrait outdoor
    "1551958219-acbc608c6377", // football kit close-up
    "1526232761682-d26e03ac148e", // player with ball
    "1571019613454-1cb2f99b2d8b", // gym athlete portrait
    "1576091160550-2173dba999ef", // young footballer
    "1552674605-db6ffd4facb5", // football closeup
    "1486286701208-1d58e9338013", // training portrait
    "1577223625816-7546f13df25d", // goalkeeper action
    "1517649763962-0c623066013b", // training drill
    "1599058917765-a780eda07a3e", // soccer cleats running
    "1543351611-58f69d7c1781", // referee/sport portrait
    "1522778526097-ce0a22ceb253", // match celebration
    "1518604666860-9ed391f76460", // youth training
    "1591197172062-c718f82aba20", // jersey kit display
  ],

  // Stadium hero — aerial / dramatic stadium shot.
  stadium: "1577223625816-7546f13df25d",

  // Welcome-page hero — full-bleed photo behind the club logo + tagline.
  // Picked for match-day atmosphere; swap if the gradient overlay needs
  // a different base.
  welcomeHero: "1675474463858-54ea69949dfe",

  // News article covers — one per article slug. Order matches demo.sql
  // chunk 10A: season-launch, academy-open-day, community-csr,
  // new-jersey-launch, draft-piece.
  news: [
    "1522778526097-ce0a22ceb253", // season launch — match celebration
    "1518604666860-9ed391f76460", // academy open day — youth training
    "1543351611-58f69d7c1781", // community CSR — neighbourhood pitch
    "1591197172062-c718f82aba20", // new jersey launch — kit on display
    "1517649763962-0c623066013b", // upcoming/draft — training drill
  ],

  // Gallery covers + 6 items each. Three galleries: Match Day, Training,
  // Behind the Scenes.
  galleries: [
    {
      key: "matchday",
      cover: "1522778526097-ce0a22ceb253",
      items: [
        "1574629810360-7efbbe195018",
        "1543351611-58f69d7c1781",
        "1577223625816-7546f13df25d",
        "1526232761682-d26e03ac148e",
        "1551958219-acbc608c6377",
        "1591197172062-c718f82aba20",
        "1677752793570-acb0b3c54542",
        "1675474463858-54ea69949dfe",
        "1658262537524-bcb660b5371e",
      ],
    },
    {
      key: "training",
      cover: "1517649763962-0c623066013b",
      items: [
        "1571019613454-1cb2f99b2d8b",
        "1486286701208-1d58e9338013",
        "1576091160550-2173dba999ef",
        "1518604666860-9ed391f76460",
        "1599058917765-a780eda07a3e",
        "1517466787929-bc90951d0974",
        "1526232761682-d26e03ac148e",
        "1574629810360-7efbbe195018",
        "1552674605-db6ffd4facb5",
      ],
    },
    {
      key: "behindscenes",
      cover: "1517466787929-bc90951d0974",
      items: [
        "1552674605-db6ffd4facb5",
        "1591197172062-c718f82aba20",
        "1517649763962-0c623066013b",
        "1574629810360-7efbbe195018",
        "1522778526097-ce0a22ceb253",
        "1518604666860-9ed391f76460",
        "1650826201320-c35f1a461390",
        "1643700700063-5e28d813d88e",
        "1576091160550-2173dba999ef",
      ],
    },
  ],

  // Hospitality package covers — stadium-themed, not generic restaurant
  // shots. Each one is unambiguously about football/match-day hospitality
  // rather than a hotel lobby. Sourced from Unsplash with HEAD-probe at
  // seed time; swap any line if a photo looks off.
  hospitality: [
    "1677752793570-acb0b3c54542", // packed crowd at a soccer match — matchday dining vibe
    "1658262537524-bcb660b5371e", // stadium overview — box / suite view
    "1650826201320-c35f1a461390", // tiered premium seats with red/blue chairs
    "1643700700063-5e28d813d88e", // stadium with scoreboard — elevated VIP angle
  ],

  // Merchandise — each product gets 2-3 photos for the gallery. First entry
  // is the cover. Order matches the products inserted by demo.sql chunk 5.
  products: {
    jersey: [
      "1593032465175-481ac7f401a0", // green football jersey hero
      "1517649763962-0c623066013b", // worn in training
      "1591197172062-c718f82aba20", // kit display detail
    ],
    // TODO: swap to a scarf-specific photo once we find one with a stable ID.
    scarf: [
      "1551958219-acbc608c6377", // kit close-up (placeholder for scarf)
      "1522778526097-ce0a22ceb253", // worn at a match
    ],
    cap: [
      "1588850561407-ed78c282e89b", // sport cap front
      "1574629810360-7efbbe195018", // worn lifestyle
    ],
    mug: [
      "1517256064527-09c73fc73e38", // coffee mug hero
      "1551958219-acbc608c6377", // styling shot
    ],
    bottle: [
      "1602143407151-7111542de6e8", // sports water bottle
      "1571019613454-1cb2f99b2d8b", // in use at the gym
    ],
  },

  // Facilities — 4 entries matching demo.sql chunk 6:
  // Pitch A (main 11v11), Pitch B (7v7 training), Gym, Pool.
  facilities: {
    pitch_main: "1577223625816-7546f13df25d", // football pitch hero
    pitch_training: "1518604666860-9ed391f76460", // training pitch
    gym: "1534438327276-14e5300c3a48", // indoor gym
    pool: "1576013551627-0cc20b96c2a7", // swimming pool
  },

  // Staff portraits — professional headshots. 10 entries matching
  // demo.sql chunk 8A.
  staff: [
    "1560250097-0b93528c311a", // ceo
    "1573496359142-b8d87734a5a2", // marketing lead
    "1519085360753-af0119f7cbe7", // finance
    "1500648767791-00dcc994a43e", // sports
    "1580489944761-15a19d654956", // hr
    "1494790108377-be9c29b29330", // legal
    "1438761681033-6461ffad8d80", // csr
    "1531123897727-8f129e1688ce", // it
    "1551836022-d5d88e9218df", // academy
    "1573496359142-b8d87734a5a2", // events (reused — swap if you want)
  ],

  // Public page heroes — about, history, sponsors.
  pages: {
    about: "1577223625816-7546f13df25d", // stadium exterior
    history: "1577223625816-7546f13df25d", // trophy/history vibe
    sponsors: "1522778526097-ce0a22ceb253", // brand/celebration
  },
};

// ─────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────

function unsplashUrl(id, w, h) {
  // `auto=format&fit=crop&q=80` is Unsplash's standard CDN transform.
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

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
  // Football-crest style: shield silhouette with double border, a stylised
  // football icon, the club initials on a ribbon, and the founding year
  // banner. Renders crisp at any size.
  const dark = shade(bgColor, -28);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">
  <defs>
    <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${fgColor}"/>
      <stop offset="100%" stop-color="${shade(fgColor, -8)}"/>
    </linearGradient>
  </defs>

  <!-- Outer shield silhouette -->
  <path d="M100 8 L184 28 L184 110 C184 158 148 196 100 212 C52 196 16 158 16 110 L16 28 Z"
        fill="url(#shield)"
        stroke="${fgColor}" stroke-width="4" stroke-opacity="0.85"/>
  <!-- Inner border -->
  <path d="M100 18 L174 36 L174 108 C174 152 142 186 100 200 C58 186 26 152 26 108 L26 36 Z"
        fill="none" stroke="${fgColor}" stroke-width="1.5" stroke-opacity="0.45"/>

  <!-- Top ribbon with initials -->
  <path d="M30 46 L170 46 L162 70 L38 70 Z"
        fill="${fgColor}" fill-opacity="0.95"/>
  <text x="100" y="64" font-family="'Arial Black', Helvetica, sans-serif"
        font-weight="900" font-size="20" text-anchor="middle"
        fill="${dark}" letter-spacing="6">${initials}</text>

  <!-- Football icon (centred) -->
  <g transform="translate(100 124)">
    <circle r="28" fill="${fgColor}" stroke="${dark}" stroke-width="2"/>
    <polygon points="0,-14 13,-4 8,11 -8,11 -13,-4"
             fill="${dark}"/>
    <line x1="0" y1="-14" x2="0" y2="-28" stroke="${dark}" stroke-width="1.5"/>
    <line x1="13" y1="-4" x2="26" y2="-9" stroke="${dark}" stroke-width="1.5"/>
    <line x1="-13" y1="-4" x2="-26" y2="-9" stroke="${dark}" stroke-width="1.5"/>
    <line x1="8" y1="11" x2="16" y2="22" stroke="${dark}" stroke-width="1.5"/>
    <line x1="-8" y1="11" x2="-16" y2="22" stroke="${dark}" stroke-width="1.5"/>
  </g>

  <!-- Year banner -->
  <rect x="58" y="172" width="84" height="20" rx="3"
        fill="${fgColor}" fill-opacity="0.95"/>
  <text x="100" y="187" font-family="Georgia, serif" font-weight="700"
        font-size="13" text-anchor="middle" fill="${dark}" letter-spacing="2">EST. 2024</text>

  <!-- Decorative side accents -->
  <circle cx="40" cy="124" r="3" fill="${fgColor}" fill-opacity="0.55"/>
  <circle cx="160" cy="124" r="3" fill="${fgColor}" fill-opacity="0.55"/>
</svg>`;
}

function svgSponsorLogo(name, bgColor) {
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
  const r = (n >> 16) & 0xff,
    g = (n >> 8) & 0xff,
    b = n & 0xff;
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
}

// Try to download. On failure return null so the caller can decide to
// skip rather than abort the whole script.
async function tryDownload(url, label) {
  try {
    return await downloadJpeg(url);
  } catch (e) {
    console.warn(`  ! ${label} failed: ${e.message} — skipping`);
    return null;
  }
}

// Collect every Unsplash photo ID we plan to use, HEAD each, and warn on
// any that 404. Caller still proceeds — this is diagnostic only.
async function probeCuratedIds() {
  const ids = new Set();
  for (const id of CURATED.players) ids.add(id);
  for (const id of CURATED.news) ids.add(id);
  for (const g of CURATED.galleries) {
    ids.add(g.cover);
    for (const it of g.items) ids.add(it);
  }
  for (const id of CURATED.hospitality) ids.add(id);
  for (const id of CURATED.staff) ids.add(id);
  for (const arr of Object.values(CURATED.products)) {
    for (const id of arr) ids.add(id);
  }
  for (const id of Object.values(CURATED.facilities)) ids.add(id);
  for (const id of Object.values(CURATED.pages)) ids.add(id);
  ids.add(CURATED.stadium);
  ids.add(CURATED.welcomeHero);

  console.log(`Probing ${ids.size} unique photo IDs…`);
  const dead = [];
  await Promise.all(
    [...ids].map(async (id) => {
      try {
        const res = await fetch(
          `https://images.unsplash.com/photo-${id}?w=100&q=10`,
          { method: "HEAD", redirect: "follow" },
        );
        if (!res.ok) dead.push({ id, status: res.status });
      } catch (e) {
        dead.push({ id, status: e.message });
      }
    }),
  );
  if (dead.length === 0) {
    console.log(`  ✓ all ${ids.size} IDs alive`);
  } else {
    console.warn(`  ! ${dead.length} dead photo IDs — swap in CURATED:`);
    for (const d of dead) console.warn(`    - ${d.id} (${d.status})`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────

async function main() {
  await probeCuratedIds();

  await pg.connect();
  const { rows: [org] } = await pg.query(
    "select id, name_ar, name_en, primary_color from organizations where slug='demo-club'",
  );
  if (!org) throw new Error("demo-club tenant not found");
  console.log("Seeding images for:", org.name_en, `(${org.id})`);
  const orgId = org.id;
  const primary = org.primary_color || "#0f6e3f";

  // ─── 1. Org logo + welcome-page hero ───────────────────────────
  {
    const initials = "DSC";
    const svg = svgClubLogo(initials, primary, "#ffffff");
    const path = `${orgId}/logo.svg`;
    await uploadFile("org-branding", path, Buffer.from(svg, "utf8"), "image/svg+xml");
    await pg.query("update organizations set logo_path=$1 where id=$2", [path, orgId]);
    console.log("  ✓ org logo");

    // Welcome-page hero — full-bleed background behind the logo block.
    const heroBuf = await tryDownload(
      unsplashUrl(CURATED.welcomeHero, 2400, 1200),
      `welcome hero`,
    );
    if (heroBuf) {
      const heroPath = `${orgId}/welcome-hero-${Date.now()}.jpg`;
      await uploadFile("org-branding", heroPath, heroBuf, "image/jpeg");
      await pg.query(
        "update organizations set welcome_hero_image_path=$1 where id=$2",
        [heroPath, orgId],
      );
      console.log("  ✓ welcome hero");
    }
  }

  // ─── 2. News covers ─────────────────────────────────────────────
  {
    const { rows: articles } = await pg.query(
      "select id, slug from news_articles where org_id=$1 order by created_at",
      [orgId],
    );
    for (const [i, a] of articles.entries()) {
      const photoId = CURATED.news[i % CURATED.news.length];
      const url = unsplashUrl(photoId, 1600, 1000);
      await pg.query(
        "update news_articles set cover_image_path=$1 where id=$2",
        [url, a.id],
      );
    }
    console.log(`  ✓ ${articles.length} news covers`);
  }

  // ─── 3. Roster photos ────────────────────────────────────────────
  {
    const { rows: players } = await pg.query(
      "select id, jersey_number from roster_entries where org_id=$1 order by jersey_number nulls last",
      [orgId],
    );
    for (const [i, p] of players.entries()) {
      const photoId = CURATED.players[i % CURATED.players.length];
      const url = unsplashUrl(photoId, 600, 800);
      await pg.query("update roster_entries set photo_path=$1 where id=$2", [
        url,
        p.id,
      ]);
    }
    console.log(`  ✓ ${players.length} player photos`);
  }

  // ─── 4. Sponsors (logos generated inline) ────────────────────────
  {
    const sponsors = [
      { name_en: "Aramco", name_ar: "أرامكو", tier: "strategic", color: "#0f6e3f" },
      { name_en: "STC", name_ar: "الاتصالات السعودية", tier: "main", color: "#5e0d8b" },
      { name_en: "Almarai", name_ar: "المراعي", tier: "main", color: "#005baa" },
      { name_en: "SABIC", name_ar: "سابك", tier: "official", color: "#0072ce" },
      { name_en: "Saudia", name_ar: "السعودية", tier: "official", color: "#15487d" },
      { name_en: "Tabuk Cement", name_ar: "أسمنت تبوك", tier: "supporter", color: "#7a7a7a" },
    ];
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

  // ─── 5. Galleries (cover + 6 items each) ─────────────────────────
  {
    const galleries = [
      {
        title_ar: "يوم المباراة",
        title_en: "Match Day",
        description_ar: "أجواء المدرجات والمشجعين قبل المباراة وبعدها.",
        description_en: "Stands, fans, and atmosphere before and after the match.",
        photos: CURATED.galleries[0],
      },
      {
        title_ar: "التدريبات",
        title_en: "Training Camp",
        description_ar: "من ملاعب التدريب اليومية إلى المعسكرات الخارجية.",
        description_en: "Daily drills to overseas training camps.",
        photos: CURATED.galleries[1],
      },
      {
        title_ar: "خلف الكواليس",
        title_en: "Behind the Scenes",
        description_ar: "اللحظات التي لا تظهر في البث المباشر.",
        description_en: "Moments you won't see on the broadcast.",
        photos: CURATED.galleries[2],
      },
    ];
    await pg.query("delete from media_galleries where org_id=$1", [orgId]);
    for (const [gi, g] of galleries.entries()) {
      const coverBuf = await tryDownload(
        unsplashUrl(g.photos.cover, 1600, 1200),
        `gallery ${g.title_en} cover`,
      );
      if (!coverBuf) continue;
      const coverPath = `${orgId}/gallery-${gi}-cover.jpg`;
      await uploadFile("media-galleries", coverPath, coverBuf, "image/jpeg");
      const { rows: [created] } = await pg.query(
        `insert into media_galleries (org_id, title_ar, title_en, description_ar, description_en, cover_image_path, published_at, display_order)
         values ($1, $2, $3, $4, $5, $6, now(), $7) returning id`,
        [orgId, g.title_ar, g.title_en, g.description_ar, g.description_en, coverPath, gi],
      );
      const galleryId = created.id;
      for (let i = 0; i < g.photos.items.length; i++) {
        const itemBuf = await tryDownload(
          unsplashUrl(g.photos.items[i], 1400, 1050),
          `gallery ${g.title_en} item ${i}`,
        );
        if (!itemBuf) continue;
        const itemPath = `${orgId}/gallery-${gi}-${i}.jpg`;
        await uploadFile("media-galleries", itemPath, itemBuf, "image/jpeg");
        await pg.query(
          `insert into media_gallery_items (gallery_id, org_id, image_path, caption_ar, caption_en, display_order)
           values ($1, $2, $3, $4, $5, $6)`,
          [galleryId, orgId, itemPath, null, null, i],
        );
      }
      console.log(`    · ${g.title_en} (+${g.photos.items.length} items)`);
    }
    console.log(`  ✓ ${galleries.length} galleries`);
  }

  // ─── 6. Hospitality covers ───────────────────────────────────────
  {
    const { rows: packages } = await pg.query(
      "select id, name_en from hospitality_packages where org_id=$1 order by display_order",
      [orgId],
    );
    for (const [i, p] of packages.entries()) {
      const photoId = CURATED.hospitality[i % CURATED.hospitality.length];
      const buf = await tryDownload(
        unsplashUrl(photoId, 1600, 900),
        `hospitality ${p.name_en}`,
      );
      if (!buf) continue;
      const path = `${orgId}/${i}-${Date.now()}.jpg`;
      await uploadFile("hospitality-covers", path, buf, "image/jpeg");
      await pg.query(
        "update hospitality_packages set cover_image_path=$1 where id=$2",
        [path, p.id],
      );
    }
    console.log(`  ✓ ${packages.length} hospitality covers`);
  }

  // ─── 7. Products (merchandise) — multi-image gallery ────────────
  // Each product in demo.sql chunk 5 → an array of curated photos.
  // First image becomes the cover (image_path); all uploaded paths land in
  // image_paths so the public detail page can render a thumbnail strip.
  {
    const productPhotosByName = {
      "Official home jersey 25/26": CURATED.products.jersey,
      "Supporter scarf": CURATED.products.scarf,
      "Club cap": CURATED.products.cap,
      "Coffee mug": CURATED.products.mug,
      "Sports water bottle": CURATED.products.bottle,
    };
    const { rows: products } = await pg.query(
      "select id, name_en from products where org_id=$1",
      [orgId],
    );
    let totalImages = 0;
    let productsTouched = 0;
    for (const p of products) {
      const photoIds = productPhotosByName[p.name_en];
      if (!photoIds || photoIds.length === 0) continue;
      const uploadedPaths = [];
      for (const [i, photoId] of photoIds.entries()) {
        const buf = await tryDownload(
          unsplashUrl(photoId, 1200, 1200),
          `product ${p.name_en} image ${i + 1}`,
        );
        if (!buf) continue;
        const path = `${orgId}/${p.id}-${Date.now()}-${i}.jpg`;
        await uploadFile("product-images", path, buf, "image/jpeg");
        uploadedPaths.push(path);
        totalImages++;
      }
      if (uploadedPaths.length === 0) continue;
      await pg.query(
        "update products set image_path=$1, image_paths=$2::jsonb where id=$3",
        [uploadedPaths[0], JSON.stringify(uploadedPaths), p.id],
      );
      productsTouched++;
    }
    console.log(`  ✓ ${totalImages} product images across ${productsTouched} products`);
  }

  // ─── 8. Facilities ───────────────────────────────────────────────
  // Maps by name_en from demo.sql chunk 6.
  {
    const facilityPhotoByName = {
      "Pitch A - Main": CURATED.facilities.pitch_main,
      "Pitch B - Training": CURATED.facilities.pitch_training,
      "Gym": CURATED.facilities.gym,
      "Pool": CURATED.facilities.pool,
    };
    const { rows: facilities } = await pg.query(
      "select id, name_en from facilities where org_id=$1",
      [orgId],
    );
    let n = 0;
    for (const f of facilities) {
      const photoId = facilityPhotoByName[f.name_en];
      if (!photoId) continue;
      const buf = await tryDownload(
        unsplashUrl(photoId, 1600, 1000),
        `facility ${f.name_en}`,
      );
      if (!buf) continue;
      const path = `${orgId}/${f.id}-${Date.now()}.jpg`;
      await uploadFile("facility-images", path, buf, "image/jpeg");
      await pg.query("update facilities set image_path=$1 where id=$2", [path, f.id]);
      n++;
    }
    console.log(`  ✓ ${n} facility images`);
  }

  // ─── 9. Staff portraits ──────────────────────────────────────────
  {
    const { rows: staff } = await pg.query(
      "select id, full_name_en from staff_profiles where org_id=$1 order by created_at",
      [orgId],
    );
    for (const [i, s] of staff.entries()) {
      const photoId = CURATED.staff[i % CURATED.staff.length];
      const url = unsplashUrl(photoId, 600, 800);
      await pg.query("update staff_profiles set photo_path=$1 where id=$2", [
        url,
        s.id,
      ]);
    }
    console.log(`  ✓ ${staff.length} staff portraits`);
  }

  // ─── 10. Public page heroes ──────────────────────────────────────
  {
    const pageHero = {
      about: CURATED.pages.about,
      history: CURATED.pages.history,
      sponsors: CURATED.pages.sponsors,
    };
    let n = 0;
    for (const [slug, photoId] of Object.entries(pageHero)) {
      const url = unsplashUrl(photoId, 2000, 1000);
      const { rowCount } = await pg.query(
        "update public_pages set hero_image_path=$1 where org_id=$2 and slug=$3",
        [url, orgId, slug],
      );
      if (rowCount) n++;
    }
    console.log(`  ✓ ${n} page heroes`);
  }

  // ─── 11. Stadium info ────────────────────────────────────────────
  {
    const photoUrl = unsplashUrl(CURATED.stadium, 2400, 1200);
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
