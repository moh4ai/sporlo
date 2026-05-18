// @sporlo/integrations — pluggable provider interface.
//
// Phase 1.4 ships the *interface* only. Phase 3 wires the first real provider
// (WhatsApp via Railway personal client). Phase 5 fills out Slack, Google
// Calendar, Mailchimp, etc.
//
// A provider is a self-contained module that knows how to set itself up
// against an external service and ship messages or events from Sporlo to
// that service. Providers register their declaration here; the runtime
// loads them via `getProvider(slug)`.

export type IntegrationCategory =
  | "communications"
  | "productivity"
  | "marketing"
  | "analytics"
  | "payments"
  | "sports"
  | "social"
  | "support"
  | "automation";

// What this provider can DO. Drives the UI affordance ("Send broadcast",
// "Sync calendar") and lets us scope permissions per-capability later.
export type IntegrationKind =
  | "send_message"     // Slack post, WhatsApp text, SMS
  | "send_email"       // Mailchimp campaign, transactional email
  | "sync_calendar"    // Push fixtures + sessions to Google/Outlook
  | "sync_contacts"    // Push members as audience / files
  | "track_event"      // Send analytics events
  | "receive_payment"  // Payment intent → Sporlo webhook
  | "analyze_video"    // Hudl, Veo, Wyscout-style video tools
  | "manage_team"      // Spond, TeamSnap-style roster + attendance tools
  | "social_post"      // Facebook / Instagram / X / TikTok publishing
  | "customer_support" // Zendesk / Intercom-style ticketing + chat
  | "automate";        // Zapier / Make-style cross-app automation

export interface ProviderSetupContext {
  org_id: string;
  installed_by: string;
  /** Existing config from org_integrations.config_jsonb, or empty on first install. */
  config: Record<string, unknown>;
}

export interface ProviderSendContext {
  org_id: string;
  config: Record<string, unknown>;
}

export interface IntegrationProvider {
  slug: string;
  category: IntegrationCategory;
  kinds: ReadonlyArray<IntegrationKind>;
  /**
   * Validate + persist setup config. Throws on validation failure. The
   * caller writes the returned config_jsonb back to org_integrations.
   */
  setup: (
    ctx: ProviderSetupContext,
  ) => Promise<{ config: Record<string, unknown> }>;
  /**
   * Single-shot dispatch. Channel + payload shape is provider-specific —
   * callers narrow via the kinds advertised above.
   */
  send: (
    ctx: ProviderSendContext,
    kind: IntegrationKind,
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Best-effort teardown — revoke API tokens, delete webhooks, etc. Errors
   * are non-fatal; the caller still marks the row uninstalled.
   */
  disconnect: (ctx: ProviderSendContext) => Promise<void>;
}

const providers = new Map<string, IntegrationProvider>();

export function registerProvider(provider: IntegrationProvider): void {
  providers.set(provider.slug, provider);
}

export function getProvider(slug: string): IntegrationProvider | undefined {
  return providers.get(slug);
}

export function listProviders(): IntegrationProvider[] {
  return Array.from(providers.values());
}
