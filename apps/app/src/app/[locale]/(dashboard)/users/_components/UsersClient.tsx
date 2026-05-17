"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Button,
  ConfirmModal,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  archiveUser,
  inviteUser,
  restoreUser,
  revokeInvitation,
  updateUser,
} from "../actions";

type Role = "club_admin" | "dept_manager" | "staff" | "coach" | "auditor";
type Department =
  | "finance"
  | "hr"
  | "marketing"
  | "sports"
  | "legal"
  | "it"
  | "academy"
  | "events"
  | "csr"
  | "governance";

export type UserRow = {
  id: string;
  email: string | null;
  full_name_ar: string | null;
  full_name_en: string | null;
  role: Role | "super_admin" | "member";
  department: Department | null;
  active: boolean;
  last_sign_in_at: string | null;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: Role;
  department: Department | null;
  token: string;
  expires_at: string;
};

const ROLES: ReadonlyArray<Role> = [
  "club_admin",
  "dept_manager",
  "staff",
  "coach",
  "auditor",
];

const DEPARTMENTS: ReadonlyArray<Department> = [
  "finance",
  "hr",
  "marketing",
  "sports",
  "legal",
  "it",
  "academy",
  "events",
  "csr",
  "governance",
];

function formatDate(iso: string | null, locale: "ar" | "en"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function UsersClient({
  users,
  invitations,
  currentUserId,
  canManageUsers,
  canArchiveUsers,
  canInvite,
  locale,
}: {
  users: UserRow[];
  invitations: InvitationRow[];
  currentUserId: string;
  canManageUsers: boolean;
  canArchiveUsers: boolean;
  canInvite: boolean;
  locale: "ar" | "en";
}) {
  const t = useTranslations("users");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<UserRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<UserRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<InvitationRow | null>(null);

  function displayName(u: UserRow): string {
    if (locale === "ar") return u.full_name_ar ?? u.full_name_en ?? u.email ?? "—";
    return u.full_name_en ?? u.full_name_ar ?? u.email ?? "—";
  }

  async function onArchive() {
    if (!archiveTarget) return;
    const res = await archiveUser({ id: archiveTarget.id });
    setArchiveTarget(null);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.archived") });
      startTransition(() => router.refresh());
    } else {
      const msg = res.error === "self-archive" ? t("edit.cantArchiveSelf") : res.error;
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: msg });
    }
  }

  async function onRestore() {
    if (!restoreTarget) return;
    const res = await restoreUser({ id: restoreTarget.id });
    setRestoreTarget(null);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.restored") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function onRevoke() {
    if (!revokeTarget) return;
    const res = await revokeInvitation({ id: revokeTarget.id });
    setRevokeTarget(null);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.revoked") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function copyLink(token: string) {
    const baseUrl =
      typeof window !== "undefined" ? `${window.location.origin}` : "";
    const url = `${baseUrl}/${locale}/accept-invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.push({ tone: "success", title: t("toast.linkCopied") });
    } catch {
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)}>{t("actions.invite")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("headers.name")}</TH>
            <TH>{t("headers.email")}</TH>
            <TH>{t("headers.role")}</TH>
            <TH>{t("headers.department")}</TH>
            <TH>{t("headers.status")}</TH>
            <TH>{t("headers.lastSeen")}</TH>
            <TH>{t("headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {users.length === 0 && invitations.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("empty")}</EmptyTableRow>
          ) : (
            <>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">{displayName(u)}</TD>
                  <TD dir="ltr">{u.email ?? "—"}</TD>
                  <TD>{roleLabel(u.role, t)}</TD>
                  <TD>{u.department ? t(`departments.${u.department}`) : t("departments.none")}</TD>
                  <TD>
                    {u.active ? (
                      <Badge tone="green">{t("status.active")}</Badge>
                    ) : (
                      <Badge tone="neutral">{t("status.archived")}</Badge>
                    )}
                  </TD>
                  <TD>
                    {u.last_sign_in_at
                      ? formatDate(u.last_sign_in_at, locale)
                      : t("status.neverSignedIn")}
                  </TD>
                  <TD className="space-x-2 rtl:space-x-reverse">
                    {canManageUsers && u.active && u.role !== "super_admin" && (
                      <button
                        type="button"
                        onClick={() => setEditing(u)}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("edit.submit")}
                      </button>
                    )}
                    {canArchiveUsers && u.active && u.id !== currentUserId && u.role !== "super_admin" && (
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(u)}
                        className="text-sm text-spo-muted hover:text-spo-ink-2"
                      >
                        {t("edit.archive")}
                      </button>
                    )}
                    {canManageUsers && !u.active && (
                      <button
                        type="button"
                        onClick={() => setRestoreTarget(u)}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("edit.restore")}
                      </button>
                    )}
                  </TD>
                </TR>
              ))}
              {invitations.map((inv) => (
                <TR key={inv.id}>
                  <TD className="text-spo-muted">—</TD>
                  <TD dir="ltr">{inv.email}</TD>
                  <TD>{roleLabel(inv.role, t)}</TD>
                  <TD>{inv.department ? t(`departments.${inv.department}`) : t("departments.none")}</TD>
                  <TD>
                    <Badge tone="amber">{t("status.pending")}</Badge>
                  </TD>
                  <TD className="text-xs text-spo-muted">
                    {t("invitation.expiresIn", { when: formatDate(inv.expires_at, locale) })}
                  </TD>
                  <TD className="space-x-2 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => copyLink(inv.token)}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("invitation.copyLink")}
                    </button>
                    {canInvite && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(inv)}
                        className="text-sm text-spo-muted hover:text-spo-ink-2"
                      >
                        {t("invitation.revoke")}
                      </button>
                    )}
                  </TD>
                </TR>
              ))}
            </>
          )}
        </TBody>
      </Table>

      <InviteDrawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSaved={() => {
          setInviteOpen(false);
          startTransition(() => router.refresh());
        }}
      />

      <EditUserDrawer
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          startTransition(() => router.refresh());
        }}
      />

      <ConfirmModal
        open={archiveTarget !== null}
        title={t("edit.archiveTitle")}
        description={t("edit.archiveBody")}
        confirmLabel={t("edit.archive")}
        cancelLabel={t("confirm.cancel")}
        intent="danger"
        onConfirm={onArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmModal
        open={restoreTarget !== null}
        title={t("edit.restoreTitle")}
        description={t("edit.restoreBody")}
        confirmLabel={t("edit.restore")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={onRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      <ConfirmModal
        open={revokeTarget !== null}
        title={t("invitation.revokeTitle")}
        description={t("invitation.revokeBody")}
        confirmLabel={t("invitation.revoke")}
        cancelLabel={t("confirm.cancel")}
        intent="danger"
        onConfirm={onRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}

function roleLabel(role: string, t: ReturnType<typeof useTranslations>) {
  switch (role) {
    case "super_admin":
      return t("roles.club_admin"); // surface to club_admin as the same label
    case "club_admin":
    case "dept_manager":
    case "staff":
    case "coach":
    case "auditor":
    case "member":
      return t(`roles.${role}`);
    default:
      return role;
  }
}

// ─────────────────────────────────────────────
// Invite drawer
// ─────────────────────────────────────────────

function InviteDrawer({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("users");
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [department, setDepartment] = useState<Department | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setRole("staff");
    setDepartment("");
    setErr(null);
    setCreatedLink(null);
    setCopied(false);
  }

  async function onCopy() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const res = await inviteUser({
      email: email.trim(),
      role,
      department: department || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      if (res.data.emailed) {
        toast.push({ tone: "success", title: t("toast.invited") });
        onSaved();
        reset();
      } else {
        // Resend not configured — surface the link for manual copy.
        toast.push({ tone: "success", title: t("toast.inviteCreatedNoEmail") });
        setCreatedLink(res.data.url);
      }
    } else {
      const message =
        res.error === "already-member"
          ? t("invite.errors.alreadyMember")
          : res.error === "already-invited"
            ? t("invite.errors.alreadyInvited")
            : res.error;
      setErr(message);
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: message });
    }
  }

  function close() {
    onClose();
    reset();
  }

  return (
    <Drawer open={open} onClose={close} title={t("invite.title")}>
      {createdLink ? (
        <div className="space-y-4">
          <p className="text-sm text-spo-ink-2">{t("invite.linkReady")}</p>
          <div className="break-all rounded-card border border-spo-line bg-spo-paper p-3 text-xs">
            {createdLink}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={close}>
              {t("confirm.cancel")}
            </Button>
            <Button onClick={onCopy}>
              {copied ? t("invite.copied") : t("invite.copy")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-spo-muted">{t("invite.subtitle")}</p>

          <FormGroup label={t("invite.email")} required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              required
              autoComplete="off"
            />
          </FormGroup>

          <FormGroup label={t("invite.role")} required>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup label={t("invite.department")}>
            <Select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department | "")}
            >
              <option value="">{t("departments.none")}</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {t(`departments.${d}`)}
                </option>
              ))}
            </Select>
          </FormGroup>

          {err && <p className="text-sm text-spo-danger">{err}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
              {t("confirm.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("invite.submitting") : t("invite.submit")}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}

// ─────────────────────────────────────────────
// Edit user drawer
// ─────────────────────────────────────────────

function EditUserDrawer({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("users");
  const toast = useToast();
  const isOpen = user !== null;

  const [role, setRole] = useState<Role>("staff");
  const [department, setDepartment] = useState<Department | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Hydrate the form whenever the target user changes.
  useEffect(() => {
    if (!user) return;
    const nextRole = (ROLES as readonly string[]).includes(user.role)
      ? (user.role as Role)
      : "staff";
    setRole(nextRole);
    setDepartment(user.department ?? "");
    setErr(null);
  }, [user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setErr(null);
    const res = await updateUser({
      id: user.id,
      role,
      department: department || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.updated") });
      onSaved();
    } else {
      setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  if (!user) return null;

  return (
    <Drawer open={isOpen} onClose={onClose} title={t("edit.title")}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-spo-muted">{t("edit.subtitle")}</p>

        <FormGroup label={t("invite.email")}>
          <Input value={user.email ?? ""} dir="ltr" disabled />
        </FormGroup>

        <FormGroup label={t("invite.role")} required>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup label={t("invite.department")}>
          <Select
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department | "")}
          >
            <option value="">{t("departments.none")}</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {t(`departments.${d}`)}
              </option>
            ))}
          </Select>
        </FormGroup>

        {err && <p className="text-sm text-spo-danger">{err}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("confirm.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("edit.submitting") : t("edit.submit")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
