import { useEffect, useState } from "react";

import { FAILURE_TEXT, verifyAgentCredential, type CredentialFailure } from "@/lib/credential";
import type { Jwks } from "@/lib/jws";

/**
 * Runs the credential signature check **in the visitor's browser**, against the
 * key set we publish, using the same pure module a third party would vendor.
 *
 * Doing it client-side is the point. If our server asserted "signature valid",
 * a verifier would still be trusting us — the exact posture we say makes a
 * maker-issued ID worthless. Here the visitor's own device does the maths.
 */

type State =
  | { kind: "checking" }
  | {
      kind: "verified";
      kid: string;
      issuer: string;
      expires: string;
      provisional: boolean;
      warning?: string;
    }
  | { kind: "failed"; reason: CredentialFailure }
  | { kind: "unsigned" }
  | { kind: "error"; message: string };

export function CredentialCheck({ agentId }: { agentId: string }) {
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [credRes, jwksRes] = await Promise.all([
          fetch(`/api/public/credential/${encodeURIComponent(agentId)}`),
          fetch("/.well-known/jwks.json"),
        ]);

        if (!credRes.ok) {
          if (!cancelled)
            setState({ kind: "error", message: "No credential is published for this ID." });
          return;
        }
        if (!jwksRes.ok) {
          if (!cancelled)
            setState({ kind: "error", message: "The issuer key set could not be fetched." });
          return;
        }

        const {
          credential,
          provisional = false,
          warning,
        } = (await credRes.json()) as {
          credential: string;
          provisional?: boolean;
          warning?: string;
        };
        const jwks = (await jwksRes.json()) as Jwks;

        if (!jwks.keys?.length) {
          if (!cancelled) setState({ kind: "unsigned" });
          return;
        }

        const result = await verifyAgentCredential(credential, jwks);
        if (cancelled) return;

        if (result.valid) {
          setState({
            kind: "verified",
            kid: result.header.kid,
            issuer: result.payload.iss,
            expires: new Date(result.payload.exp * 1000).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            provisional,
            ...(warning ? { warning } : {}),
          });
        } else {
          setState({ kind: "failed", reason: result.reason });
        }
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "The signature check could not be completed in this browser.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  return (
    <section
      aria-live="polite"
      className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-left"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Cryptographic check
        </h2>
        <Indicator state={state} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{describe(state)}</p>

      {state.kind === "verified" && (
        <>
          {state.provisional && (
            <p className="mt-3 rounded-md border border-seal/40 px-3 py-2 text-xs text-seal">
              <strong className="font-medium">Development key.</strong>{" "}
              {state.warning ??
                "These credentials are not production-grade and must not be relied on."}
            </p>
          )}
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
            <Row label="Issuer" value={state.issuer} />
            <Row label="Signing key" value={state.kid} mono />
            <Row label="Credential expires" value={state.expires} />
          </dl>
        </>
      )}

      <p className="mt-4 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
        This check ran in your browser against{" "}
        <a
          href="/.well-known/jwks.json"
          className="underline underline-offset-2 hover:text-foreground"
        >
          our published keys
        </a>
        . You never had to take our word for it.
      </p>
    </section>
  );
}

function Indicator({ state }: { state: State }) {
  const map: Record<State["kind"], { text: string; className: string }> = {
    checking: { text: "Checking…", className: "text-muted-foreground" },
    verified:
      state.kind === "verified" && state.provisional
        ? { text: "Valid · dev key", className: "text-seal" }
        : { text: "Signature valid", className: "text-verified" },
    failed: { text: "Signature invalid", className: "text-seal" },
    unsigned: { text: "Not signed", className: "text-muted-foreground" },
    error: { text: "Unavailable", className: "text-muted-foreground" },
  };
  const { text, className } = map[state.kind];
  return (
    <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${className}`}>{text}</span>
  );
}

function describe(state: State): string {
  switch (state.kind) {
    case "checking":
      return "Fetching the credential and verifying its signature.";
    case "verified":
      return "The credential's contents were signed by Infinity and have not been altered. Its current status is shown above and is the only part that needs a live call.";
    case "failed":
      return FAILURE_TEXT[state.reason];
    case "unsigned":
      return "This deployment has no issuing key configured, so it cannot produce a signed credential. Treat the details above as unverified.";
    case "error":
      return state.message;
  }
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`truncate text-right ${mono ? "font-mono" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
