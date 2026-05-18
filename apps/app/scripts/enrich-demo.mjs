#!/usr/bin/env node
// Adds Saudi-flavoured "lived-in" data to the demo-club tenant so the
// dashboard, public site, and member portal feel busier in screenshots /
// Loom. Idempotent-ish: re-running creates duplicates rather than no-ops —
// run reseed-demo.mjs first if you want a clean slate.
//
// USAGE
//   node apps/app/scripts/enrich-demo.mjs
//
// Requires SUPABASE_DB_URL in apps/app/.env.local (same one reseed uses).

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, "..");

config({ path: join(APP_ROOT, ".env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("❌ Set SUPABASE_DB_URL in apps/app/.env.local");
  process.exit(1);
}

// ─────────────────────────────────────────────
// Name + content pools
// ─────────────────────────────────────────────

const SAUDI_FIRST_NAMES_AR = [
  "عبدالله", "محمد", "خالد", "فيصل", "عمر", "ياسر", "ماجد", "سعد",
  "نواف", "تركي", "أحمد", "صالح", "سلطان", "فهد", "بدر", "عبدالعزيز",
  "إبراهيم", "علي", "حسن", "يوسف", "ناصر", "بندر", "عبدالرحمن", "مشاري",
];
const SAUDI_FIRST_NAMES_EN = [
  "Abdullah", "Mohammed", "Khaled", "Faisal", "Omar", "Yasser", "Majed", "Saad",
  "Nawaf", "Turki", "Ahmed", "Saleh", "Sultan", "Fahd", "Bader", "Abdulaziz",
  "Ibrahim", "Ali", "Hassan", "Yousef", "Nasser", "Bandar", "Abdulrahman", "Mishari",
];

const SAUDI_FAMILIES_AR = [
  "الفهد", "العتيبي", "الزهراني", "الحربي", "الشمري", "القحطاني", "العمري",
  "الدوسري", "الغامدي", "الشهري", "الرشيد", "المالكي", "السبيعي", "الخالدي", "البريدي",
];
const SAUDI_FAMILIES_EN = [
  "Alfahd", "Alotaibi", "Alzahrani", "Alharbi", "Alshammari", "Alqahtani", "Alomari",
  "Aldossary", "Alghamdi", "Alshehri", "Alrasheed", "Almalki", "Alsubaie", "Alkhalidi", "Alburaidi",
];

const SAUDI_CLUBS = [
  { ar: "الهلال", en: "Al Hilal" },
  { ar: "النصر", en: "Al Nassr" },
  { ar: "الاتحاد", en: "Al Ittihad" },
  { ar: "الأهلي", en: "Al Ahli" },
  { ar: "الشباب", en: "Al Shabab" },
  { ar: "الفتح", en: "Al Fateh" },
  { ar: "الاتفاق", en: "Al Ettifaq" },
  { ar: "الخليج", en: "Al Khaleej" },
  { ar: "الفيصلي", en: "Al Faisaly" },
  { ar: "ضمك", en: "Damac" },
  { ar: "التعاون", en: "Al Taawoun" },
  { ar: "الفيحاء", en: "Al Feiha" },
  { ar: "الباطن", en: "Al Batin" },
  { ar: "الوحدة", en: "Al Wehda" },
  { ar: "الرائد", en: "Al Raed" },
  { ar: "الطائي", en: "Al Taee" },
];

const VENUES = [
  "ملعب الأمير محمد بن فهد", "ملعب الجوهرة المشعة", "ملعب الإنماء بمدينة الملك سعود الرياضية",
  "ملعب الأمير سلطان بن عبدالعزيز", "ملعب المدينة الجامعية", "ملعب نادي الفيصلي",
];

const NEWS = [
  {
    title_ar: "النادي يفوز بكأس البطولة الإقليمية",
    title_en: "Club wins regional championship cup",
    excerpt_ar: "فاز الفريق الأول مساء أمس على فريق ضمك بنتيجة 3-1 ليتوّج بكأس البطولة.",
    excerpt_en: "The first team beat Damac 3-1 last night to lift the regional cup.",
  },
  {
    title_ar: "افتتاح مرافق التدريب الجديدة",
    title_en: "New training facilities opened",
    excerpt_ar: "افتتح المدير العام مرافق التدريب الجديدة بحضور وفد من وزارة الرياضة.",
    excerpt_en: "The new training facilities were opened in the presence of a Ministry of Sport delegation.",
  },
  {
    title_ar: "تعاقد جديد مع لاعب أكاديمي واعد",
    title_en: "Promising academy signing announced",
    excerpt_ar: "أعلن النادي عن تعاقده مع موهبة محلية من أبناء المدينة لرفد فريق تحت 21.",
    excerpt_en: "The club announced the signing of a local talent to bolster the under-21 squad.",
  },
  {
    title_ar: "النادي يدشّن برنامج المسؤولية المجتمعية الجديد",
    title_en: "Club launches new community engagement programme",
    excerpt_ar: "ضمن جهود النادي في خدمة المجتمع، أطلق برنامجاً شاملاً للأطفال ذوي الإعاقة.",
    excerpt_en: "As part of its CSR efforts, the club launched a programme for children with disabilities.",
  },
  {
    title_ar: "بطولة ودية مع نادي صديق",
    title_en: "Friendly tournament with partner club",
    excerpt_ar: "يستضيف ناديكم بطولة ودية مع عدة أندية محلية مطلع الشهر القادم.",
    excerpt_en: "The club will host a friendly tournament with several local clubs early next month.",
  },
  {
    title_ar: "تحديث برنامج اشتراكات الأعضاء",
    title_en: "Member subscription tiers refreshed",
    excerpt_ar: "أعلن النادي عن باقات اشتراك جديدة تتضمن مزايا حصرية لحضور المباريات.",
    excerpt_en: "The club announced new subscription tiers with exclusive match-day perks.",
  },
  {
    title_ar: "زيارة وفد طلابي للنادي",
    title_en: "Student delegation visits the club",
    excerpt_ar: "استقبل النادي وفداً من طلاب الجامعات في إطار التعاون الأكاديمي.",
    excerpt_en: "The club hosted a delegation of university students as part of an academic partnership.",
  },
  {
    title_ar: "إطلاق المتجر الإلكتروني للنادي",
    title_en: "Online store launched",
    excerpt_ar: "بإمكان المشجعين الآن شراء قمصان النادي والمنتجات الرسمية أونلاين.",
    excerpt_en: "Fans can now buy official jerseys and merchandise online.",
  },
  {
    title_ar: "ندوة عن الإدارة الرياضية",
    title_en: "Symposium on sports management",
    excerpt_ar: "نظّم النادي ندوة متخصصة بحضور خبراء من الاتحاد السعودي لكرة القدم.",
    excerpt_en: "The club hosted a specialised symposium with experts from the Saudi Football Federation.",
  },
  {
    title_ar: "افتتاح موسم الأكاديمية",
    title_en: "Academy season opens",
    excerpt_ar: "بدأت الحصص التدريبية للموسم الجديد بمشاركة أكثر من 150 ناشئاً.",
    excerpt_en: "Training for the new academy season started with over 150 young athletes.",
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isoOffsetDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function saudiPhone() {
  return "05" + String(randInt(0, 99999999)).padStart(8, "0");
}

function saudiNationalId() {
  // 10 digits starting with 1 or 2.
  return (randInt(1, 2).toString() + String(randInt(0, 999999999)).padStart(9, "0"));
}

function arabicSlug(prefix, n) {
  return `${prefix}-${Date.now()}-${n}`;
}

function pickName() {
  const i = randInt(0, SAUDI_FIRST_NAMES_AR.length - 1);
  const j = randInt(0, SAUDI_FAMILIES_AR.length - 1);
  return {
    ar: `${SAUDI_FIRST_NAMES_AR[i]} ${SAUDI_FAMILIES_AR[j]}`,
    en: `${SAUDI_FIRST_NAMES_EN[i]} ${SAUDI_FAMILIES_EN[j]}`,
  };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("🔌 Connected");

  // Find demo-club + reference data.
  const { rows: orgRows } = await client.query(
    "SELECT id FROM public.organizations WHERE slug = 'demo-club'",
  );
  if (!orgRows[0]) {
    console.error("❌ demo-club org not found. Run reseed-demo.mjs first.");
    process.exit(1);
  }
  const orgId = orgRows[0].id;

  const { rows: branchRows } = await client.query(
    "SELECT id FROM public.branches WHERE org_id = $1 LIMIT 1",
    [orgId],
  );
  const branchId = branchRows[0]?.id ?? null;

  const { rows: plans } = await client.query(
    "SELECT id, price_sar FROM public.plans WHERE org_id = $1",
    [orgId],
  );
  if (plans.length === 0) {
    console.error("❌ No plans found for demo-club. Run reseed-demo.mjs first.");
    process.exit(1);
  }

  const { rows: squads } = await client.query(
    "SELECT id FROM public.squads WHERE org_id = $1",
    [orgId],
  );

  const { rows: staffRows } = await client.query(
    "SELECT id FROM public.staff_profiles WHERE org_id = $1",
    [orgId],
  );

  const { rows: criteria } = await client.query(
    "SELECT code, category FROM public.kpi_categories",
  );

  // ─────────────────────────────────────────────
  // 50 new members
  // ─────────────────────────────────────────────
  console.log("👥 Adding 50 members…");
  const newMemberIds = [];
  for (let i = 0; i < 50; i++) {
    const name = pickName();
    const id = randomUUID();
    newMemberIds.push(id);
    await client.query(
      `INSERT INTO public.members
        (id, org_id, branch_id, full_name_ar, full_name_en, email, phone, national_id, status, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)`,
      [
        id,
        orgId,
        branchId,
        name.ar,
        name.en,
        `member${Date.now()}_${i}@example.com`,
        saudiPhone(),
        saudiNationalId(),
        isoOffsetDays(-randInt(30, 540)),
      ],
    );
  }

  // ─────────────────────────────────────────────
  // 50 subscriptions + payments
  // ─────────────────────────────────────────────
  console.log("💳 Adding 50 subscriptions + payments…");
  for (let i = 0; i < 50; i++) {
    const memberId = newMemberIds[i];
    const plan = pick(plans);
    const subId = randomUUID();
    const start = isoOffsetDays(-randInt(0, 240));
    const end = new Date(start);
    end.setMonth(end.getMonth() + 6);

    await client.query(
      `INSERT INTO public.subscriptions
        (id, org_id, member_id, plan_id, status, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)`,
      [subId, orgId, memberId, plan.id, start, end.toISOString()],
    );

    await client.query(
      `INSERT INTO public.payments
        (id, org_id, member_id, subscription_id, amount_sar, currency, status, provider, paid_at)
       VALUES ($1, $2, $3, $4, $5, 'SAR', 'paid', 'moyasar', $6)`,
      [randomUUID(), orgId, memberId, subId, plan.price_sar, start],
    );
  }

  // ─────────────────────────────────────────────
  // 15 fixtures (mix past + future)
  // ─────────────────────────────────────────────
  console.log("🏆 Adding 15 fixtures…");
  for (let i = 0; i < 15; i++) {
    const opp = pick(SAUDI_CLUBS);
    const offset = i < 8 ? -randInt(10, 180) : randInt(7, 90);
    const isPast = offset < 0;
    await client.query(
      `INSERT INTO public.fixtures
        (id, org_id, branch_id, opponent_ar, opponent_en, kickoff_at, venue, sport_type, status, home_score, away_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'football', $8, $9, $10)`,
      [
        randomUUID(),
        orgId,
        branchId,
        opp.ar,
        opp.en,
        isoOffsetDays(offset),
        pick(VENUES),
        isPast ? "completed" : "scheduled",
        isPast ? randInt(0, 4) : null,
        isPast ? randInt(0, 3) : null,
      ],
    );
  }

  // ─────────────────────────────────────────────
  // 10 news articles
  // ─────────────────────────────────────────────
  console.log("📰 Adding 10 news articles…");
  for (let i = 0; i < NEWS.length; i++) {
    const n = NEWS[i];
    await client.query(
      `INSERT INTO public.news_articles
        (id, org_id, slug, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        orgId,
        arabicSlug("article", i),
        n.title_ar,
        n.title_en,
        n.excerpt_ar,
        n.excerpt_en,
        n.excerpt_ar + "\n\n" + n.excerpt_ar,
        n.excerpt_en + "\n\n" + n.excerpt_en,
        isoOffsetDays(-randInt(1, 120)),
      ],
    );
  }

  // ─────────────────────────────────────────────
  // 25 academy sessions
  // ─────────────────────────────────────────────
  const { rows: coachRows } = await client.query(
    "SELECT id FROM public.coaches WHERE org_id = $1",
    [orgId],
  );
  if (coachRows.length > 0) {
    console.log("🏃 Adding 25 academy sessions…");
    for (let i = 0; i < 25; i++) {
      const coach = pick(coachRows);
      const offset = -randInt(0, 90);
      await client.query(
        `INSERT INTO public.academy_sessions
          (id, org_id, coach_id, title_ar, title_en, scheduled_at, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          orgId,
          coach.id,
          `حصة تدريبية رقم ${i + 6}`,
          `Training session ${i + 6}`,
          isoOffsetDays(offset),
          90,
        ],
      );
    }
  }

  // ─────────────────────────────────────────────
  // 8 staff certifications
  // ─────────────────────────────────────────────
  if (staffRows.length > 0) {
    console.log("📜 Adding 8 staff certifications…");
    const certNames = [
      "AFC Coaching License B", "FIFA Anti-Doping Certificate", "First Aid Certified",
      "Sports Nutrition Diploma", "Strength & Conditioning Cert", "Goalkeeper Coach License",
      "Match Analysis Certificate", "Talent Identification Diploma",
    ];
    for (let i = 0; i < 8; i++) {
      const staff = pick(staffRows);
      await client.query(
        `INSERT INTO public.certifications
          (id, org_id, staff_profile_id, name, issuer, issued_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          orgId,
          staff.id,
          certNames[i],
          pick(["AFC", "FIFA", "Saudi Federation", "World Football Academy"]),
          isoOffsetDays(-randInt(180, 720)),
          isoOffsetDays(randInt(60, 540)),
        ],
      );
    }
  }

  // ─────────────────────────────────────────────
  // 200 KPI events spread across modules
  // ─────────────────────────────────────────────
  if (criteria.length > 0) {
    console.log("📊 Adding 200 KPI events…");
    const eventTypes = [
      "member_added", "subscription_started", "subscription_renewed",
      "ticket_sold", "revenue_recorded", "academy_session_held",
      "training_held", "merch_revenue", "facility_booked",
      "staff_certified", "event_held", "attendance_recorded",
    ];
    for (let i = 0; i < 200; i++) {
      const crit = pick(criteria);
      await client.query(
        `INSERT INTO public.kpi_events
          (id, org_id, branch_id, category, criterion_code, event_type, quantitative_value, source_module, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          randomUUID(),
          orgId,
          branchId,
          crit.category,
          crit.code,
          pick(eventTypes),
          randInt(1, 100),
          pick(["memberships", "events", "academy", "facilities", "finance", "store", "hr"]),
          isoOffsetDays(-randInt(0, 270)),
        ],
      );
    }
  }

  // ─────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────
  console.log("\n✅ Enrichment complete.");
  console.log("   Members:           +50");
  console.log("   Subscriptions:     +50");
  console.log("   Payments:          +50");
  console.log("   Fixtures:          +15");
  console.log("   News articles:     +10");
  console.log("   Academy sessions:  +25");
  console.log("   Certifications:    +8");
  console.log("   KPI events:        +200");
} catch (err) {
  console.error(`\n❌ Enrichment failed: ${err.message}`);
  if (err.code) console.error(`   code: ${err.code}`);
  if (err.detail) console.error(`   detail: ${err.detail}`);
  process.exit(1);
} finally {
  await client.end();
}
