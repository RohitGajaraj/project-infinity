import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { ConsoleShell } from "@/components/ConsoleShell";
import { supabase } from "@/integrations/supabase/client";
import { generateAgentKeys, PERMISSIONS, SOURCES } from "@/lib/keys";

export const Route = createFileRoute("/_authenticated/agents/new")({
  head: () => ({
    meta: [
      { title: "Issue an agent credential — Infinity" },
      {
        name: "description",
        content: "Issue a signed mandate and an Agent ID to an AI agent from any platform.",
      },
      { property: "og:title", content: "Issue an agent credential — Infinity" },
      {
        property: "og:description",
        content: "Issue a signed mandate and an Agent ID to an AI agent from any platform.",
      },
    ],
  }),
  component: NewAgent,
});

const defaultExpiry = new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10);
const field =
  "w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none transition focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring";

type Issued = { id: string; publicId: string; secret: string };

function NewAgent() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [source, setSource] = useState<string>(SOURCES[0]!);
  const [perms, setPerms] = useState<string[]>(["Send email"]);
  const [spend, setSpend] = useState(200);
  const [approve, setApprove] = useState(50);
  const [expires, setExpires] = useState(defaultExpiry);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState<"secret" | "id" | "verify" | null>(null);
  const [stored, setStored] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const keysRef = useRef<Awaited<ReturnType<typeof generateAgentKeys>> | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (perms.length === 0) {
      setErr("Grant at least one permitted action so the mandate is meaningful.");
      return;
    }
    if (!Number.isInteger(spend) || spend < 0 || !Number.isInteger(approve) || approve < 0) {
      setErr("Spend limits must be whole-dollar amounts of zero or more.");
      return;
    }
    if (approve > spend) {
      setErr("The approval threshold cannot be higher than the monthly ceiling.");
      return;
    }
    const expiry = new Date(`${expires}T23:59:59.000Z`);
    if (!expires || Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      setErr("Choose an expiry date in the future.");
      return;
    }

    setBusy(true);
    try {
      const keys = keysRef.current ?? (await generateAgentKeys());
      keysRef.current = keys;
      const client = supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>,
        ) => Promise<{
          data: Array<{ id: string; public_id: string; mandate_version: number }> | null;
          error: { message: string } | null;
        }>;
      };
      const { data, error } = await client.rpc("issue_agent", {
        _name: name.trim(),
        _source: source,
        _public_key: keys.publicKey,
        _permissions: perms,
        _monthly_spend_limit: spend,
        _approval_above: approve,
        _expires_at: expiry.toISOString(),
        _request_id: requestId,
      });
      if (error) throw new Error(error.message);
      const issuedAgent = data?.[0];
      if (!issuedAgent) throw new Error("The credential was not returned after issuance.");

      void qc.invalidateQueries({ queryKey: ["agents"] });
      setIssued({
        id: issuedAgent.id,
        publicId: issuedAgent.public_id,
        secret: keys.secretKey,
      });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "The credential could not be issued.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, target: "secret" | "id" | "verify") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
    } catch {
      setErr("Clipboard access was blocked. Select and copy the value manually.");
    }
  }

  if (issued) {
    const verifyPath = `/verify/${issued.publicId}`;
    return (
      <ConsoleShell>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-verified">
          Credential issued
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight">
          Now hand the key to {name}.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Infinity signed the mandate and the ID is live. The agent is not fully identified in an
          interaction until it proves possession of this private key.
        </p>

        <div className="mt-10 grid max-w-3xl gap-8 lg:grid-cols-[1fr_1.15fr]">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Activation state
            </h2>
            <ol className="mt-4 space-y-4 text-sm">
              <ActivationStep
                n="01"
                title="Credential issued"
                detail="Signed mandate is live"
                done
              />
              <ActivationStep
                n="02"
                title="Private key handed off"
                detail={stored ? "You confirmed it is stored" : "Store it in the agent runtime"}
                done={stored}
              />
              <ActivationStep
                n="03"
                title="Presenter proves possession"
                detail="A verifier sends a fresh challenge"
                done={false}
              />
            </ol>
          </section>

          <div className="space-y-6">
            <section className="rounded-xl border border-seal/40 bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium">Private agent key — shown once</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Store this only in the agent's secret manager. Never send it as a bearer token
                    or paste it into a public configuration.
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-seal">
                  Secret
                </span>
              </div>
              <pre className="mt-4 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
                {issued.secret}
              </pre>
              <button
                type="button"
                onClick={() => void copy(issued.secret, "secret")}
                className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copied === "secret" ? "Secret copied" : "Copy secret key"}
              </button>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 text-sm">
              <h2 className="font-medium">Public handoff</h2>
              <p className="mt-1 text-muted-foreground">
                Share these freely. Verifiers never need an account, API key, or access to the
                private key.
              </p>
              <dl className="mt-4 space-y-4">
                <PublicValue
                  label="Agent ID"
                  value={issued.publicId}
                  copied={copied === "id"}
                  onCopy={() => void copy(issued.publicId, "id")}
                />
                <PublicValue
                  label="Verify page"
                  value={verifyPath}
                  copied={copied === "verify"}
                  onCopy={() => void copy(`${window.location.origin}${verifyPath}`, "verify")}
                />
              </dl>
              <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
                <a
                  href={verifyPath}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-11 rounded-md border border-border px-4 py-2.5 hover:bg-accent"
                >
                  Preview public evidence
                </a>
                <a
                  href="/api/public/sandbox"
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-11 rounded-md border border-border px-4 py-2.5 hover:bg-accent"
                >
                  Open verifier test vector
                </a>
              </div>
            </section>
          </div>
        </div>

        {err && (
          <p className="mt-5 max-w-3xl text-sm text-seal" role="alert">
            {err}
          </p>
        )}
        <label className="mt-8 flex max-w-3xl items-start gap-3 rounded-lg border border-border p-4 text-sm">
          <input
            type="checkbox"
            checked={stored}
            onChange={(e) => setStored(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I stored the private key in the agent runtime. Infinity cannot recover it if it is lost.
          </span>
        </label>
        <Link
          to="/agents/$id"
          params={{ id: issued.id }}
          aria-disabled={!stored}
          onClick={(e) => {
            if (!stored) e.preventDefault();
          }}
          className={`mt-5 inline-block rounded-md px-5 py-3 text-sm font-medium ${
            stored
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "cursor-not-allowed bg-muted text-muted-foreground"
          }`}
        >
          Open agent controls
        </Link>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
        New signed mandate
      </p>
      <h1 className="mt-3 font-serif text-5xl">Issue an agent credential</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Define exactly what this agent may do. The mandate is signed into its credential and can be
        checked without trusting the agent's maker.
      </p>

      <form onSubmit={submit} className="mt-10 max-w-2xl space-y-8" noValidate>
        <div className="space-y-2">
          <label htmlFor="agent-name" className="text-sm font-medium">
            Agent name
          </label>
          <input
            id="agent-name"
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Atlas"
            required
            maxLength={60}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Where does it run?</legend>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={source === item}
                onClick={() => setSource(item)}
                className={`min-h-11 rounded-full border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  source === item
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-accent"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Permitted actions</legend>
          <p className="text-xs text-muted-foreground">
            Anything not selected is outside the signed mandate.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PERMISSIONS.map((permission) => (
              <label
                key={permission}
                className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={perms.includes(permission)}
                  onChange={(e) =>
                    setPerms(
                      e.target.checked
                        ? [...perms, permission]
                        : perms.filter((item) => item !== permission),
                    )
                  }
                />
                {permission}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="monthly-limit" className="text-sm font-medium">
              Monthly ceiling (USD)
            </label>
            <input
              id="monthly-limit"
              type="number"
              min={0}
              step="1"
              className={field}
              value={spend}
              onChange={(e) => setSpend(e.target.valueAsNumber)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="approval-above" className="text-sm font-medium">
              Ask owner above (USD)
            </label>
            <input
              id="approval-above"
              type="number"
              min={0}
              max={Number.isFinite(spend) ? spend : undefined}
              step="1"
              className={field}
              value={approve}
              onChange={(e) => setApprove(e.target.valueAsNumber)}
              required
            />
            <p className="text-xs text-muted-foreground">$0 means every spend needs approval.</p>
          </div>
        </div>

        <div className="space-y-2 sm:max-w-[calc(50%-0.625rem)]">
          <label htmlFor="expires" className="text-sm font-medium">
            Mandate expires
          </label>
          <input
            id="expires"
            type="date"
            min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
            className={field}
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            The credential stops being usable after this date even if it is not frozen.
          </p>
        </div>

        {err && (
          <p
            className="rounded-md border border-seal/30 bg-card px-4 py-3 text-sm text-seal"
            role="alert"
          >
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="min-h-12 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Generating keys and signing…" : "Issue signed credential"}
        </button>
      </form>
    </ConsoleShell>
  );
}

function ActivationStep({
  n,
  title,
  detail,
  done,
}: {
  n: string;
  title: string;
  detail: string;
  done: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] ${
          done ? "border-verified text-verified" : "border-border text-muted-foreground"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

function PublicValue({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-start justify-between gap-4">
        <code className="break-all font-mono text-xs">{value}</code>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 text-xs underline underline-offset-2 hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </dd>
    </div>
  );
}
