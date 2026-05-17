import type { ModuleKey } from "@sporlo/auth";
import {
  Building2,
  CalendarDays,
  GraduationCap,
  LineChart,
  Megaphone,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingBag,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavSectionKey =
  | "operations"
  | "programs"
  | "insights"
  | "site"
  | "configuration";

export interface NavModule {
  key: ModuleKey;
  icon: LucideIcon;
  section: NavSectionKey;
}

// Ordered within each section. Sections are grouped in the sidebar in this
// exact order so the most-used surfaces sit at the top.
export const NAV_MODULES: NavModule[] = [
  { key: "memberships", icon: Users, section: "operations" },
  { key: "finance", icon: Wallet, section: "operations" },
  { key: "store", icon: ShoppingBag, section: "operations" },

  { key: "events", icon: CalendarDays, section: "programs" },
  { key: "facilities", icon: Building2, section: "programs" },
  { key: "team", icon: ShieldCheck, section: "programs" },
  { key: "academy", icon: GraduationCap, section: "programs" },
  { key: "hr", icon: UserCog, section: "programs" },

  { key: "governance", icon: LineChart, section: "insights" },

  { key: "media", icon: Megaphone, section: "site" },

  { key: "account", icon: SettingsIcon, section: "configuration" },
];

export const SECTION_ORDER: NavSectionKey[] = [
  "operations",
  "programs",
  "insights",
  "site",
  "configuration",
];
