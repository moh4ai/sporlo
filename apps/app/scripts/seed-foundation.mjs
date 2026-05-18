import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// Hand-parse .env.local so we don't depend on a dotenv package install at
// the workspace root.
const envText = fs.readFileSync(
  path.join(process.cwd(), ".env.local"),
  "utf8",
);
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  // Always overwrite — process.env may carry a stale value from the shell
  // (e.g. from a prior session that exported the pre-rotation password).
  if (m) process.env[m[1]] = m[2];
}

const { Client } = pg;

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
});

await c.connect();

const { rows } = await c.query(
  "select id from organizations where slug='demo-club'",
);
if (!rows[0]) {
  console.log("demo-club not found, skipping seed");
  await c.end();
  process.exit(0);
}
const orgId = rows[0].id;

const titleAr = "مؤسسة النادي للمجتمع";
const titleEn = "Club Foundation";
const bodyAr =
  "تأسست المؤسسة عام 2018 وتعمل على دعم البرامج الرياضية للأطفال والشباب في المجتمعات الأقل حظًا حول المملكة. نعمل مع شراكات حكومية وخاصة لتقديم منح تدريب، تجهيزات رياضية، وبرامج صيفية للناشئين.\n\nالمحاور:\n• الرياضة من أجل الجميع\n• تدريب المدربين المحليين\n• تجهيز ملاعب المدارس\n• برنامج رمضان الرياضي";
const bodyEn =
  "Founded in 2018, the Foundation supports youth sports programs across Saudi Arabia in underserved communities. We partner with government and private sponsors to provide training scholarships, sports equipment, and summer camps for young athletes.\n\nPillars:\n• Sport for all\n• Local coach development\n• School pitch upgrades\n• Ramadan sports program";

const res = await c.query(
  `insert into public.public_pages (org_id, slug, title_ar, title_en, body_ar, body_en, published)
   values ($1, 'foundation', $2, $3, $4, $5, true)
   on conflict (org_id, slug) do update set
     title_ar = excluded.title_ar,
     title_en = excluded.title_en,
     body_ar = excluded.body_ar,
     body_en = excluded.body_en,
     published = true
   returning id`,
  [orgId, titleAr, titleEn, bodyAr, bodyEn],
);
console.log("foundation seed upserted, page id:", res.rows[0]?.id);

// Also seed 2 hospitality packages so the public page renders something.
const packages = [
  {
    name_ar: "كبير الشرف — موسم كامل",
    name_en: "VIP Lounge — Full Season",
    body_ar:
      "تذاكر لجميع مباريات الموسم في القاعة الكبيرة. تشمل ضيافة كاملة قبل وبعد المباراة، موقف سيارات حصري، وشاشات HD خاصة.",
    body_en:
      "Tickets to every league match in the VIP Lounge. Includes full pre-match and post-match hospitality, private parking, and HD lounge screens.",
    price_sar: 24000,
    capacity: 20,
    fixture_filter: "season",
    display_order: 1,
  },
  {
    name_ar: "صندوق الديربي",
    name_en: "Derby Box",
    body_ar:
      "صندوق خاص لمباراة الديربي الكبرى. يستوعب حتى 8 ضيوف. ضيافة فاخرة وإطلالة كاملة على الملعب.",
    body_en:
      "Private box for the season's biggest derby fixture. Seats up to 8 guests. Premium hospitality and full pitch view.",
    price_sar: 12000,
    capacity: 8,
    fixture_filter: "specific",
    display_order: 2,
  },
];
for (const p of packages) {
  await c.query(
    `insert into public.hospitality_packages (org_id, name_ar, name_en, body_ar, body_en, price_sar, capacity, fixture_filter, display_order, active)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
     on conflict do nothing`,
    [
      orgId,
      p.name_ar,
      p.name_en,
      p.body_ar,
      p.body_en,
      p.price_sar,
      p.capacity,
      p.fixture_filter,
      p.display_order,
    ],
  );
}
console.log("seeded", packages.length, "hospitality packages");

await c.end();
