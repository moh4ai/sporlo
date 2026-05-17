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
] as const;

export type ModuleKey = (typeof MODULES)[number];
