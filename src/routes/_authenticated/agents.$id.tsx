import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/ConsoleShell";
import { AgentIdCard } from "@/components/AgentIdCard";
import { AgentKeyLifecycle } from "@/components/AgentKeyLifecycle";
import { MandateLifecycle } from "@/components/MandateLifecycle";
import { fmtDate, formatLimits } from "@/lib/keys";

export const Route = createFileRoute("/_authenticated/agents/$id")({
  head: () => ({
    meta: [
      { title: "Agent — Infinity" },
      { name: "description", content: "Agent ID, limits, signed activity log and off switch." },
      { property: "og:title", content: "Agent — Infinity" },
      {
        property: "og:description",
        content: "Agent ID, limits, signed activity log and off switch.",
      },
    ],
  }),
  component: AgentDetail,
});

type ApprovalRow = {
  id: number;
  action: string;
  amount_usd: number | string;
  status: string;
  reference: string;
  requested_at: string;
  expires_at: string;
  consumed_at: string | null;
  mandate_version?: number | null;
  key_version?: number | null;
};

function AgentDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [decideError, setDecideError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const agent = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () =>
      (await supabase.from("profiles").select("display_name").maybeSingle()).data,
  });
  const events = useQuery({
    queryKey: ["events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_events")
        .select("*")
        .eq("agent_id", id)
        .order("id", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Approval requests the agent has raised. Without a way to decide these, an
  // agent that hits its threshold is stuck forever, so this is the other half of
  // the mandate rather than a reporting nicety.
  const approvals = useQuery({
    queryKey: ["approvals", id],
    queryFn: async () => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              col: string,
              val: string,
            ) => {
              order: (
                col: string,
                o: { ascending: boolean },
              ) => Promise<{ data: ApprovalRow[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data, error } = await client
        .from("approval_requests")
        .select(
          "id, action, amount_usd, status, reference, requested_at, expires_at, consumed_at, mandate_version, key_version",
        )
        .eq("agent_id", id)
        .order("requested_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Spend against the cap, so the owner sees what the limit actually permitted.
  const allowance = useQuery({
    queryKey: ["allowance", agent.data?.public_id],
    enabled: !!agent.data?.public_id,
    queryFn: async () => {
      const res = await fetch(`/api/public/allowance/${agent.data!.public_id}`);
      if (!res.ok) return null;
      return (await res.json()) as {
        monthly_limit_usd: number;
        spent_this_month_usd: number;
        remaining_usd: number;
      };
    },
  });

  async function decide(reference: string, approve: boolean) {
    const client = supabase as unknown as {
      rpc: (
        n: string,
        p: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = await client.rpc("decide_approval", {
      _reference: reference,
      _approve: approve,
    });
    if (error) {
      setDecideError(error.message);
      return;
    }
    setDecideError(null);
    qc.invalidateQueries({ queryKey: ["approvals", id] });
    qc.invalidateQueries({ queryKey: ["events", id] });
  }

  async function toggle() {
    if (!agent.data || toggling) return;
    const next = agent.data.status === "valid" ? "frozen" : "valid";
    setToggling(true);
    setToggleError(null);
    try {
      const client = supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>;
      };
      const { error } = await client.rpc("set_agent_status", {
        _agent_id: id,
        _expected_status: agent.data.status,
        _new_status: next,
      });
      if (error) throw new Error(error.message);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["agent", id] }),
        qc.invalidateQueries({ queryKey: ["events", id] }),
        qc.invalidateQueries({ queryKey: ["agents"] }),
        qc.invalidateQueries({ queryKey: ["allowance", agent.data.public_id] }),
      ]);
    } catch (error) {
      setToggleError(error instanceof Error ? error.message : "Status could not be changed.");
    } finally {
      setToggling(false);
    }
  }

  if (agent.isLoading)
    return (
      <ConsoleShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </ConsoleShell>
    );
  const a = agent.data;
  if (!a)
    return (
      <ConsoleShell>
        <p className="font-serif text-3xl">Agent not found.</p>
      </ConsoleShell>
    );
  const valid = a.status === "valid";
  const authority = a as typeof a & {
    current_mandate_version?: number;
    current_key_version?: number;
    key_recovery_hold_version?: number | null;
  };
  const mandateVersionValue = authority.current_mandate_version;
  const keyVersionValue = authority.current_key_version;
  if (
    !Number.isInteger(mandateVersionValue) ||
    mandateVersionValue! < 1 ||
    !Number.isInteger(keyVersionValue) ||
    keyVersionValue! < 1
  ) {
    return (
      <ConsoleShell>
        <p className="font-serif text-3xl">Authority lifecycle is unavailable.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This agent is not safe to edit until mandate and key versioning are live.
        </p>
      </ConsoleShell>
    );
  }
  const mandateVersion = mandateVersionValue as number;
  const keyVersion = keyVersionValue as number;
  const recoveryHold = authority.key_recovery_hold_version === keyVersion;

  return (
    <ConsoleShell>
      <Link to="/agents" className="text-sm text-muted-foreground hover:text-foreground">
        ← All agents
      </Link>
      <div className="mt-6 grid gap-12 md:grid-cols-[1fr_1fr]">
        <div>
          <AgentIdCard
            agent={{
              id: a.public_id,
              name: a.name,
              source: a.source,
              owner: profile.data?.display_name ?? "You",
              status: valid ? "valid" : "frozen",
              mandateVersion: mandateVersion,
              issued: fmtDate(a.created_at),
              expires: fmtDate(a.expires_at),
              limits: formatLimits(a),
            }}
          />
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              to="/verify/$agentId"
              params={{ agentId: a.public_id }}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
            >
              Open public Verify page
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Public key</p>
          <p className="mt-1 break-all font-mono text-xs">{a.public_key}</p>
        </div>

        <div>
          <div className={`rounded-xl border p-6 ${valid ? "border-border" : "border-seal/50"}`}>
            <p className="text-sm font-medium">Off switch</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {valid
                ? "Freezing makes the live status endpoint refuse this agent on the next uncached check."
                : recoveryHold
                  ? "This recovered agent is frozen. Its current key must prove fresh possession before ordinary unfreeze is available."
                  : "This agent is frozen. Businesses checking its ID are told not to trust it."}
            </p>
            {toggleError && (
              <p className="mt-3 text-sm text-seal" role="alert">
                {toggleError}
              </p>
            )}
            <button
              onClick={() => void toggle()}
              disabled={toggling || recoveryHold}
              className={`mt-5 w-full rounded-md py-3 text-sm font-medium disabled:opacity-50 ${valid ? "bg-seal text-primary-foreground" : "bg-primary text-primary-foreground"}`}
            >
              {toggling
                ? "Updating…"
                : recoveryHold
                  ? "Recovery proof required"
                  : valid
                    ? "Freeze agent"
                    : "Unfreeze agent"}
            </button>
          </div>

          <AgentKeyLifecycle
            current={{
              agentId: a.id,
              publicId: a.public_id,
              version: keyVersion,
              publicKey: a.public_key,
              recoveryHold,
            }}
          />

          <MandateLifecycle
            current={{
              agentId: a.id,
              version: mandateVersion,
              permissions: a.permissions,
              monthlySpendLimit: a.monthly_spend_limit,
              approvalAbove: a.approval_above,
              expiresAt: a.expires_at,
            }}
          />

          {allowance.data && (
            <div className="mt-8 rounded-xl border border-border p-6">
              <p className="text-sm font-medium">This month's spending</p>
              <p className="mt-3 font-serif text-3xl">
                ${allowance.data.spent_this_month_usd}
                <span className="text-base text-muted-foreground">
                  {" "}
                  of ${allowance.data.monthly_limit_usd}
                </span>
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground"
                  style={{
                    width: `${Math.min(100, allowance.data.monthly_limit_usd > 0 ? (allowance.data.spent_this_month_usd / allowance.data.monthly_limit_usd) * 100 : 0)}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                ${allowance.data.remaining_usd} left. Infinity refuses ledger reservations above
                this cap; an external payment rail must still require that authorization.
              </p>
            </div>
          )}

          <h2 className="mt-10 font-serif text-3xl">Approvals</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Requests this agent raised because they exceeded the amount you pre-authorised. Until
            you decide, Infinity will not authorize the corresponding reservation.
          </p>
          {decideError && (
            <p className="mt-3 text-sm text-seal" role="alert">
              {decideError}
            </p>
          )}
          {approvals.data && approvals.data.length > 0 ? (
            <ol className="mt-5 border-t border-border">
              {approvals.data.map((r) => {
                const expired = new Date(r.expires_at).getTime() <= Date.now();
                const superseded =
                  r.mandate_version === null ||
                  (r.mandate_version !== undefined && r.mandate_version !== mandateVersion) ||
                  (r.key_version === null
                    ? keyVersion > 1
                    : r.key_version !== undefined && r.key_version !== keyVersion);
                const pending = r.status === "pending" && !expired && !superseded;
                return (
                  <li key={r.id} className="border-b border-border py-4">
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span>{r.action}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        ${Number(r.amount_usd)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {superseded
                        ? `Superseded with mandate v${mandateVersion}`
                        : pending
                          ? `Waiting on you — expires ${new Date(r.expires_at).toLocaleString()}`
                          : r.status === "pending" && expired
                            ? "Expired before you answered"
                            : `${r.status[0]!.toUpperCase()}${r.status.slice(1)}${r.consumed_at ? " · already used" : ""}`}
                    </p>
                    {pending && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => decide(r.reference, true)}
                          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decide(r.reference, false)}
                          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Nothing to decide. Requests appear here when the agent wants to spend more than $
              {a.approval_above}.
            </p>
          )}

          <h2 className="mt-10 font-serif text-3xl">Activity evidence</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Entries are hash-chained to expose sequence edits. “Proof checked” means Infinity
            verified agent key possession when ingesting the request; this row does not retain the
            full canonical request needed for independent signature replay.
          </p>
          <ol className="mt-5 border-t border-border">
            {events.data?.map((e) => (
              <li key={e.id} className="border-b border-border py-3">
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between">
                  <span className="capitalize">
                    {e.kind}
                    <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {e.signer === "agent" ? "proof checked" : (e.signer ?? "system")}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                  sha256 {e.hash}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ConsoleShell>
  );
}
