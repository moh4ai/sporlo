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
  "fans",
] as const;

export type ModuleKey = (typeof MODULES)[number];
