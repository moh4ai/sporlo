export const MODULES = [
  "governance",
  "team",
  "memberships",
  "finance",
  "facilities",
  "academy",
  "events",
  "store",
  "media",
  "hr",
  "account",
  "users",
  "settings",
  "integrations",
] as const;

export type ModuleKey = (typeof MODULES)[number];
