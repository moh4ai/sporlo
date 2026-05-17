import type { IntegrationCategory, IntegrationKind } from "./index";

// Canonical catalog entries. Persisted into public.integration_catalog by
// migration 0020; mirrored here so the UI can render before the DB row
// loads (and so Phase 5 work can branch on entry.slug without round-tripping).

export interface CatalogEntry {
  slug: string;
  name_ar: string;
  name_en: string;
  category: IntegrationCategory;
  /** Path under /public/integrations/<file>. SVG preferred. */
  logo_path: string;
  short_description_ar: string;
  short_description_en: string;
  kinds: ReadonlyArray<IntegrationKind>;
  /**
   * "available" — real provider exists and is wired this phase.
   * "coming_soon" — listed in the catalog but not buildable yet.
   * Phase 1.4 ships every entry as coming_soon; Phase 3 flips WhatsApp.
   */
  availability: "available" | "coming_soon";
}

export const CATALOG: ReadonlyArray<CatalogEntry> = [
  // ─── Communications ─────────────────────────────
  {
    slug: "slack",
    name_ar: "سلاك",
    name_en: "Slack",
    category: "communications",
    logo_path: "/integrations/slack.svg",
    short_description_ar:
      "أرسل إشعارات سبورلو إلى قناة فريق العمل عبر Slack.",
    short_description_en:
      "Pipe Sporlo notifications into a Slack channel for the staff team.",
    kinds: ["send_message"],
    availability: "coming_soon",
  },
  {
    slug: "microsoft-teams",
    name_ar: "Microsoft Teams",
    name_en: "Microsoft Teams",
    category: "communications",
    logo_path: "/integrations/microsoft-teams.svg",
    short_description_ar: "تنبيهات سبورلو داخل قناة Microsoft Teams.",
    short_description_en: "Surface Sporlo alerts inside a Microsoft Teams channel.",
    kinds: ["send_message"],
    availability: "coming_soon",
  },
  {
    slug: "whatsapp-railway",
    name_ar: "واتساب (Railway)",
    name_en: "WhatsApp (Railway)",
    category: "communications",
    logo_path: "/integrations/whatsapp.svg",
    short_description_ar:
      "أرسل رموز التحقق وتنبيهات الأعضاء عبر حساب واتساب شخصي مُستضاف على Railway.",
    short_description_en:
      "Deliver OTPs and member alerts via a self-hosted WhatsApp client on Railway.",
    kinds: ["send_message"],
    availability: "coming_soon",
  },
  {
    slug: "whatsapp-meta",
    name_ar: "WhatsApp Business (Meta Cloud)",
    name_en: "WhatsApp Business (Meta Cloud)",
    category: "communications",
    logo_path: "/integrations/whatsapp.svg",
    short_description_ar:
      "واجهة Meta Cloud API الرسمية للأندية ذات الحجم الأكبر.",
    short_description_en:
      "Meta's official Cloud API — for clubs that need higher throughput.",
    kinds: ["send_message"],
    availability: "coming_soon",
  },
  {
    slug: "unifonic",
    name_ar: "Unifonic",
    name_en: "Unifonic",
    category: "communications",
    logo_path: "/integrations/unifonic.svg",
    short_description_ar:
      "مزوّد رسائل نصية محلي معتمد في السعودية لإشعارات الأعضاء.",
    short_description_en:
      "Saudi-licensed SMS provider for member notifications.",
    kinds: ["send_message"],
    availability: "coming_soon",
  },

  // ─── Productivity ───────────────────────────────
  {
    slug: "google-calendar",
    name_ar: "تقويم Google",
    name_en: "Google Calendar",
    category: "productivity",
    logo_path: "/integrations/google-calendar.svg",
    short_description_ar:
      "مزامنة المباريات والحصص التدريبية مع تقويم النادي على Google.",
    short_description_en:
      "Sync fixtures and academy sessions into your team's Google Calendar.",
    kinds: ["sync_calendar"],
    availability: "coming_soon",
  },
  {
    slug: "outlook",
    name_ar: "Outlook",
    name_en: "Microsoft Outlook",
    category: "productivity",
    logo_path: "/integrations/outlook.svg",
    short_description_ar: "نفس مزامنة التقويم لمستخدمي Microsoft 365.",
    short_description_en: "Same calendar sync for Microsoft 365 shops.",
    kinds: ["sync_calendar"],
    availability: "coming_soon",
  },
  {
    slug: "notion",
    name_ar: "Notion",
    name_en: "Notion",
    category: "productivity",
    logo_path: "/integrations/notion.svg",
    short_description_ar:
      "ادفع تقارير الحوكمة والاجتماعات إلى مساحة عمل Notion.",
    short_description_en:
      "Push governance reports and meeting minutes into a Notion workspace.",
    kinds: ["sync_contacts"],
    availability: "coming_soon",
  },

  // ─── Marketing ──────────────────────────────────
  {
    slug: "mailchimp",
    name_ar: "Mailchimp",
    name_en: "Mailchimp",
    category: "marketing",
    logo_path: "/integrations/mailchimp.svg",
    short_description_ar:
      "زامن قاعدة الأعضاء كجمهور Mailchimp وأطلق الحملات من سبورلو.",
    short_description_en:
      "Sync members as a Mailchimp audience and launch campaigns from Sporlo.",
    kinds: ["sync_contacts", "send_email"],
    availability: "coming_soon",
  },
  {
    slug: "resend",
    name_ar: "Resend",
    name_en: "Resend",
    category: "marketing",
    logo_path: "/integrations/resend.svg",
    short_description_ar:
      "بريد transactional لرسائل بوابة الأعضاء والدعوات.",
    short_description_en:
      "Transactional email for portal links and teammate invites.",
    kinds: ["send_email"],
    availability: "available",
  },
  {
    slug: "sendgrid",
    name_ar: "SendGrid",
    name_en: "SendGrid",
    category: "marketing",
    logo_path: "/integrations/sendgrid.svg",
    short_description_ar: "بديل بريد transactional تستخدمه فرق المؤسسات.",
    short_description_en: "Enterprise-style transactional email alternative.",
    kinds: ["send_email"],
    availability: "coming_soon",
  },

  // ─── Analytics ──────────────────────────────────
  {
    slug: "google-analytics",
    name_ar: "Google Analytics",
    name_en: "Google Analytics",
    category: "analytics",
    logo_path: "/integrations/google-analytics.svg",
    short_description_ar: "تتبّع زيارات الموقع العام للنادي وبوابة الأعضاء.",
    short_description_en:
      "Track public club site + member portal page views.",
    kinds: ["track_event"],
    availability: "coming_soon",
  },
  {
    slug: "mixpanel",
    name_ar: "Mixpanel",
    name_en: "Mixpanel",
    category: "analytics",
    logo_path: "/integrations/mixpanel.svg",
    short_description_ar:
      "أرسل أحداث سبورلو الرئيسية (اشتراك، شراء تذكرة) إلى Mixpanel.",
    short_description_en:
      "Pipe key Sporlo events (subscribe, ticket buy) into Mixpanel.",
    kinds: ["track_event"],
    availability: "coming_soon",
  },

  // ─── Payments ───────────────────────────────────
  {
    slug: "moyasar",
    name_ar: "ميسر",
    name_en: "Moyasar",
    category: "payments",
    logo_path: "/integrations/moyasar.svg",
    short_description_ar:
      "بوابة الدفع الرئيسية للاشتراكات والتذاكر ومنتجات المتجر.",
    short_description_en:
      "Primary payment gateway for memberships, tickets, and store orders.",
    kinds: ["receive_payment"],
    availability: "available",
  },
  {
    slug: "tap",
    name_ar: "Tap",
    name_en: "Tap Payments",
    category: "payments",
    logo_path: "/integrations/tap.svg",
    short_description_ar: "بوابة دفع بديلة للأندية ذات الاشتراكات الإقليمية.",
    short_description_en:
      "Alternate gateway for clubs with regional billing requirements.",
    kinds: ["receive_payment"],
    availability: "coming_soon",
  },
];

export const CATEGORY_ORDER: ReadonlyArray<IntegrationCategory> = [
  "communications",
  "productivity",
  "marketing",
  "analytics",
  "payments",
];
