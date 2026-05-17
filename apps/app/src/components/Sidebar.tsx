import Image from "next/image";

import type { Principal } from "@sporlo/auth";

import { SidebarNav } from "./SidebarNav";

/**
 * Desktop sidebar. Hidden on mobile — the mobile burger in TopBar opens
 * MobileNavDrawer which renders the same SidebarNav contents.
 */
export function Sidebar({ principal }: { principal: Principal }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-spo-line bg-white md:flex">
      <div className="flex items-center gap-2 border-b border-spo-line px-5 py-4">
        <Image
          src="/brand/sporlo-logo-green.png"
          alt="Sporlo"
          width={28}
          height={28}
          priority
        />
        <span
          className="text-xl text-spo-green-deep"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sporlo
        </span>
      </div>
      <SidebarNav principal={principal} />
    </aside>
  );
}
