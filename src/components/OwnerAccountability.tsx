import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  getOwnerIdentityState,
  startOwnerIdentityCheck,
  type OwnerIdentityState,
} from "@/lib/identity.functions";

export function OwnerAccountability() {
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const identity = useQuery({
    queryKey: ["owner-identity"],
    queryFn: () => getOwnerIdentityState(),
    refetchInterval: (query) =>
      query.state.data?.state === "in_progress" || query.state.data?.state === "starting"
        ? 3_000
        : false,
  });

  async function start() {
    setStarting(true);
    setStartError(null);
    try {
      const result = await startOwnerIdentityCheck();
      if (!result.ok) {
        setStartError(result.detail);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["owner-identity"] });
      window.location.assign(result.redirectUrl);
    } catch {
      setStartError(
        "The accountability check could not be started. Please sign in again and retry.",
      );
    } finally {
      setStarting(false);
    }
  }

  if (identity.isLoading) return <AccountabilitySkeleton />;

  if (identity.isError || !identity.data) {
    return (
      <section className="mt-8 rounded-xl border border-seal/30 bg-card p-6" role="alert">
        <Eyebrow>Accountable owner</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl">Accountability evidence is unavailable.</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Until this loads, new credentials will correctly say that the owner's identity has not
          been checked.
        </p>
        <button
          type="button"
          onClick={() => void identity.refetch()}
          className="mt-5 min-h-11 rounded-md border border-border px-4 text-sm hover:bg-accent"
        >
          Retry
        </button>
      </section>
    );
  }

  const evidence = identity.data;
  const verified = evidence.state === "verified";
  const pending = evidence.state === "in_progress" || evidence.state === "starting";

  return (
    <section
      className={`mt-8 overflow-hidden rounded-xl border bg-card ${
        verified ? "border-verified/40" : "border-border"
      }`}
    >
      <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>Accountable owner</Eyebrow>
            <Status state={evidence.state} />
          </div>
          <h2 className="mt-4 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
            {headline(evidence.state)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description(evidence)}
          </p>

          {verified && (
            <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3">
              <Evidence label="Checked by" value={providerName(evidence.provider)} />
              <Evidence label="Method" value={methodName(evidence.method)} />
              <Evidence label="Assurance" value={evidence.assurance ?? "Not reported"} />
            </dl>
          )}

          {!verified && !pending && (
            <button
              type="button"
              onClick={() => void start()}
              disabled={starting || !evidence.providerConfigured}
              className="mt-6 min-h-12 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting
                ? "Opening secure check…"
                : evidence.providerConfigured
                  ? "Check accountable owner"
                  : "Identity checks not configured"}
            </button>
          )}

          {pending && (
            <button
              type="button"
              onClick={() => void identity.refetch()}
              className="mt-6 min-h-11 rounded-md border border-border px-4 text-sm hover:bg-accent"
            >
              Refresh result
            </button>
          )}

          {startError && (
            <p className="mt-4 text-sm text-seal" role="alert">
              {startError}
            </p>
          )}
        </div>

        <div className="border-t border-border bg-muted/35 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            What enters the credential
          </p>
          <ul className="mt-5 space-y-4 text-sm">
            <BoundaryItem
              title="Provider and method"
              detail="Who checked what, not the document."
            />
            <BoundaryItem
              title="Assurance and date"
              detail="So each verifier chooses its own bar."
            />
            <BoundaryItem
              title="Operator asserted"
              detail="Infinity says so; it is not an offline proof."
            />
          </ul>
          <p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
            Didit hosts the check. Infinity does not store document images, extracted personal
            fields, or the raw provider webhook.
          </p>
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
      {children}
    </span>
  );
}

function Status({ state }: { state: OwnerIdentityState["state"] }) {
  const verified = state === "verified";
  const pending = state === "in_progress" || state === "starting";
  const label = verified
    ? "Attested"
    : pending
      ? "Check in progress"
      : state === "declined"
        ? "Not approved"
        : "Not checked";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${
        verified
          ? "border-verified/40 text-verified"
          : pending
            ? "border-border text-foreground"
            : "border-seal/30 text-seal"
      }`}
    >
      {label}
    </span>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 capitalize">{value.replaceAll("_", " ")}</dd>
    </div>
  );
}

function BoundaryItem({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[9px]">
        ✓
      </span>
      <span>
        <strong className="block font-medium">{title}</strong>
        <span className="text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

function AccountabilitySkeleton() {
  return (
    <section className="mt-8 animate-pulse rounded-xl border border-border bg-card p-8">
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="mt-5 h-9 max-w-xl rounded bg-muted" />
      <div className="mt-4 h-4 max-w-2xl rounded bg-muted" />
    </section>
  );
}

function headline(state: OwnerIdentityState["state"]): string {
  switch (state) {
    case "verified":
      return "The account behind these agents has completed an identity check.";
    case "in_progress":
    case "starting":
      return "The accountable-owner check is in progress.";
    case "declined":
      return "The owner check did not establish accountability.";
    case "failed":
    case "expired":
      return "The owner check needs to be completed again.";
    default:
      return "Give every agent a real accountable party.";
  }
}

function description(evidence: OwnerIdentityState): string {
  if (evidence.state === "verified") {
    const checked = evidence.verifiedAt ? formatDate(evidence.verifiedAt) : "an unrecorded date";
    const expires = evidence.expiresAt ? formatDate(evidence.expiresAt) : "an unrecorded date";
    return `${providerName(evidence.provider)} checked ${methodName(evidence.method)} on ${checked}. Infinity carries that operator-asserted result in each agent credential until ${expires}; a verifier decides whether it is sufficient.`;
  }
  if (evidence.state === "in_progress" || evidence.state === "starting") {
    return "The hosted provider flow has started. This page will update when the signed provider result is bound to your account.";
  }
  if (evidence.state === "declined") {
    return "No attestation was issued. Agent credentials remain usable but clearly state that the accountable owner's identity has not been checked.";
  }
  if (!evidence.providerConfigured) {
    return "This deployment has no identity provider configured. Credentials remain honest and report that owner identity is unchecked.";
  }
  return "Complete one hosted identity check. The result becomes an operator-asserted accountability field in every agent credential you issue.";
}

function providerName(provider: string | null): string {
  return provider === "didit" ? "Didit" : "Identity provider";
}

function methodName(method: string | null): string {
  if (method === "government_id_and_liveness") return "government ID with liveness";
  if (method === "government_id") return "government ID";
  if (method === "business_registry") return "business registry";
  return "identity evidence";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
