import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { reissueMandate } from "@/lib/mandate.functions";
import { PERMISSIONS } from "@/lib/keys";

export type CurrentMandate = {
  agentId: string;
  version: number;
  permissions: string[];
  monthlySpendLimit: number;
  approvalAbove: number | null;
  expiresAt: string;
};

type MandateVersion = {
  version: number;
  permissions: string[];
  monthly_spend_limit: number;
  approval_above: number | null;
  issued_at: string;
  expires_at: string;
  change_reason: string;
};

type Draft = {
  permissions: string[];
  monthlySpendLimit: number;
  approvalAbove: number | null;
  expiresAt: string;
  reason: string;
};

export function MandateLifecycle({ current }: { current: CurrentMandate }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => fromCurrent(current));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const requestId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!editing) setDraft(fromCurrent(current));
  }, [current, editing]);

  const history = useQuery({
    queryKey: ["mandate-history", current.agentId],
    queryFn: async () => {
      const client = supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (
              column: string,
              value: string,
            ) => {
              order: (
                column: string,
                options: { ascending: boolean },
              ) => Promise<{ data: MandateVersion[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data, error } = await client
        .from("agent_mandate_versions")
        .select(
          "version, permissions, monthly_spend_limit, approval_above, issued_at, expires_at, change_reason",
        )
        .eq("agent_id", current.agentId)
        .order("version", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const expansion = useMemo(() => expansionSummary(current, draft), [current, draft]);

  function beginEdit(source?: MandateVersion) {
    requestId.current = crypto.randomUUID();
    setMessage(null);
    setDraft(
      source
        ? {
            permissions: source.permissions,
            monthlySpendLimit: source.monthly_spend_limit,
            approvalAbove: source.approval_above,
            expiresAt: toDateInput(source.expires_at),
            reason: `Reissue based on mandate v${source.version}`,
          }
        : fromCurrent(current),
    );
    setEditing(true);
  }

  async function reissue(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (draft.permissions.length === 0) {
      setMessage({ tone: "error", text: "Keep at least one permitted action." });
      return;
    }
    if (
      !Number.isInteger(draft.monthlySpendLimit) ||
      draft.monthlySpendLimit < 0 ||
      (draft.approvalAbove !== null &&
        (!Number.isInteger(draft.approvalAbove) ||
          draft.approvalAbove < 0 ||
          draft.approvalAbove > draft.monthlySpendLimit))
    ) {
      setMessage({ tone: "error", text: "Limits must be valid whole-dollar amounts." });
      return;
    }
    const expiry = new Date(`${draft.expiresAt}T23:59:59.000Z`);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      setMessage({ tone: "error", text: "Choose a future expiry date." });
      return;
    }
    if (draft.reason.trim().length < 3) {
      setMessage({ tone: "error", text: "Add a short reason for the immutable history." });
      return;
    }

    setBusy(true);
    try {
      const outcome = await reissueMandate({
        data: {
          agentId: current.agentId,
          expectedVersion: current.version,
          permissions: draft.permissions,
          monthlySpendLimit: draft.monthlySpendLimit,
          approvalAbove: draft.approvalAbove,
          expiresAt: expiry.toISOString(),
          requestId: requestId.current,
          changeReason: draft.reason.trim(),
        },
      });
      if (!outcome.ok) throw new Error(outcome.reason);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agent", current.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["mandate-history", current.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["events", current.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["approvals", current.agentId] }),
      ]);
      setEditing(false);
      setMessage({
        tone: "success",
        text:
          outcome.result === "no_change"
            ? "Nothing changed; the current mandate remains active."
            : `Mandate v${outcome.mandateVersion} is now active. Older credentials are superseded.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "The mandate could not be reissued.";
      setMessage({
        tone: "error",
        text: /mandate_reissue_not_enabled/.test(text)
          ? "Versioning is installed but not activated yet. Try again after the production status probe."
          : /mandate_version_conflict/.test(text)
            ? "The mandate changed in another session. Reload and review the new current version."
            : text,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Mandate lifecycle
          </p>
          <h2 className="mt-2 font-serif text-3xl">Mandate v{current.version}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reissuing creates an immutable new version. It never resets spend or redisplays the
            agent key.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => beginEdit()}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            Edit and reissue
          </button>
        )}
      </div>

      {message && (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            message.tone === "error"
              ? "border-seal/30 text-seal"
              : "border-verified/30 text-verified"
          }`}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}

      {editing && (
        <form onSubmit={reissue} className="mt-6 space-y-6 border-t border-border pt-6">
          <fieldset>
            <legend className="text-sm font-medium">Permitted actions</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.permissions.includes(permission)}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        permissions: event.target.checked
                          ? [...value.permissions, permission]
                          : value.permissions.filter((item) => item !== permission),
                      }))
                    }
                  />
                  {permission}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Monthly ceiling (USD)"
              value={draft.monthlySpendLimit}
              onChange={(value) =>
                setDraft((current) => ({ ...current, monthlySpendLimit: value }))
              }
            />
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.approvalAbove === null}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      approvalAbove: event.target.checked ? null : 0,
                    }))
                  }
                />
                No approval gate
              </label>
              {draft.approvalAbove !== null && (
                <NumberField
                  label="Ask owner above (USD)"
                  value={draft.approvalAbove}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, approvalAbove: value }))
                  }
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block font-medium">Expires</span>
              <input
                type="date"
                value={draft.expiresAt}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, expiresAt: event.target.value }))
                }
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5"
              />
            </label>
            <label className="text-sm">
              <span className="block font-medium">Reason for this version</span>
              <input
                value={draft.reason}
                maxLength={240}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, reason: event.target.value }))
                }
                placeholder="e.g. Reduced purchase authority"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5"
              />
            </label>
          </div>

          {expansion.length > 0 && (
            <div className="rounded-lg border border-seal/30 p-4 text-sm">
              <p className="font-medium text-seal">This expands the agent's authority</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {expansion.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Reissuing…" : `Activate mandate v${current.version + 1}`}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-7 border-t border-border pt-5">
        <h3 className="text-sm font-medium">Version history</h3>
        {history.isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">Loading history…</p>
        )}
        {history.isError && (
          <p className="mt-3 text-sm text-seal" role="alert">
            Mandate history could not be loaded.
          </p>
        )}
        <ol className="mt-3 divide-y divide-border">
          {history.data?.map((version) => (
            <li
              key={version.version}
              className="flex items-start justify-between gap-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  v{version.version}{" "}
                  {version.version === current.version ? "· Active" : "· Superseded"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {version.change_reason} · issued {formatDate(version.issued_at)} · expires{" "}
                  {formatDate(version.expires_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => beginEdit(version)}
                className="shrink-0 text-xs underline underline-offset-2 hover:text-foreground"
              >
                Use as draft
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm">
      <span className="block font-medium">{label}</span>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5"
      />
    </label>
  );
}

function fromCurrent(current: CurrentMandate): Draft {
  return {
    permissions: [...current.permissions],
    monthlySpendLimit: current.monthlySpendLimit,
    approvalAbove: current.approvalAbove,
    expiresAt: toDateInput(current.expiresAt),
    reason: "",
  };
}

function toDateInput(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function expansionSummary(current: CurrentMandate, draft: Draft): string[] {
  const changes: string[] = [];
  const addedPermissions = draft.permissions.filter(
    (permission) => !current.permissions.includes(permission),
  );
  if (addedPermissions.length > 0) changes.push(`Adds: ${addedPermissions.join(", ")}`);
  if (draft.monthlySpendLimit > current.monthlySpendLimit) {
    changes.push(
      `Raises monthly ceiling from $${current.monthlySpendLimit} to $${draft.monthlySpendLimit}`,
    );
  }
  const oldThreshold = current.approvalAbove;
  const newThreshold = draft.approvalAbove;
  if (newThreshold === null && oldThreshold !== null) {
    changes.push("Removes the owner approval gate");
  } else if (newThreshold !== null && oldThreshold !== null && newThreshold > oldThreshold) {
    changes.push(`Raises approval threshold from $${oldThreshold} to $${newThreshold}`);
  }
  if (new Date(draft.expiresAt).getTime() > new Date(current.expiresAt).getTime()) {
    changes.push("Extends the mandate expiry");
  }
  return changes;
}
