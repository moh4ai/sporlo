import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

interface Node {
  id: string;
  name: string;
  title: string | null;
  department: string | null;
  manager_id: string | null;
  children: Node[];
}

export default async function OrgChartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "hr.orgChart" });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("staff_profiles")
    .select(
      "id, full_name_ar, full_name_en, job_title_ar, job_title_en, department, manager_id",
    )
    .eq("active", true);

  const flat: Node[] = (data ?? []).map((s) => ({
    id: s.id,
    name: locale === "ar" ? s.full_name_ar : s.full_name_en ?? s.full_name_ar,
    title:
      locale === "ar" ? s.job_title_ar : s.job_title_en ?? s.job_title_ar ?? null,
    department: s.department,
    manager_id: s.manager_id,
    children: [],
  }));

  // Build tree.
  const byId = new Map(flat.map((n) => [n.id, n]));
  const roots: Node[] = [];
  for (const n of flat) {
    if (n.manager_id && byId.has(n.manager_id)) {
      byId.get(n.manager_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  // Sort children by name for stable display.
  function sortChildren(node: Node) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortChildren);
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  roots.forEach(sortChildren);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-spo-ink">{t("title")}</h2>
        <p className="text-sm text-spo-muted">{t("subtitle")}</p>
      </header>

      {flat.length === 0 ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("empty")}</p>
        </Card>
      ) : (
        <Card>
          <ul className="space-y-2">
            {roots.map((node) => (
              <NodeView key={node.id} node={node} depth={0} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function NodeView({ node, depth }: { node: Node; depth: number }) {
  return (
    <li>
      <div
        className="flex items-start gap-2 rounded-md bg-spo-paper px-3 py-2"
        style={{ marginInlineStart: `${depth * 24}px` }}
      >
        <div className="flex-1">
          <div className="font-medium text-spo-ink">{node.name}</div>
          {(node.title || node.department) && (
            <div className="text-xs text-spo-muted">
              {[node.title, node.department].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <NodeView key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
