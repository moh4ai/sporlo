// Verify the most recent audit_logs row for impersonation attempts.

import { createServiceRoleClient } from "../src/client.ts";

const admin = createServiceRoleClient();

const { data, error } = await admin
  .from("audit_logs")
  .select("*")
  .eq("action", "impersonate_club_admin_attempt")
  .order("created_at", { ascending: false })
  .limit(3);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Found ${data?.length ?? 0} impersonation audit row(s):`);
for (const row of data ?? []) {
  console.log(JSON.stringify(row, null, 2));
}
