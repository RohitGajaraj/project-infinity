import { createFileRoute, Link } from "@tanstack/react-router";

import { AgentIdCard, SAMPLE_AGENT, type AgentCard } from "@/components/AgentIdCard";
import { CredentialCheck } from "@/components/CredentialCheck";
import { verifyAgent } from "@/lib/verify.functions";
import { attestationFromRow, describeAttestation, type OwnerAttestation } from "@/lib/identity";
import { fmtDate, formatLimits } from "@/lib/keys";

type Verdict = "valid" | "frozen" | "expired" | "unknown" | "sample";

export const Route = createFileRoute("/verify/$agentId")({
  loader: async ({ params }) => {
    if (params.agentId === SAMPLE_AGENT.id) {
      return {
        verdict: "sample" as Verdict,
        agent: SAMPLE_AGENT,
        publicKey: null,
        logHead: null,
        attestation: attestationFromRow({}),
      };
    }

    const a = await verifyAgent({ data: { publicId: params.agentId } });
    if (!a)
      return {
        verdict: "unknown" as Verdict,
        agent: null,
        publicKey: null,
        logHead: null,
        attestation: attestationFromRow({}),
      };

    const expired = new Date(a.expires_at).getTime() <= Date.now();
    const verdict: Verdict = expired ? "expired" : a.status === "valid" ? "valid" : "frozen";
    const attestation = attestationFromRow(a);

    const card: AgentCard = {
      id: a.public_id,
      name: a.name,
      source: a.source,
      owner: `${a.owner_name ?? "Unnamed owner"} · self-declared label`,
      status: verdict === "expired" ? "expired" : verdict === "valid" ? "valid" : "frozen",
      issued: fmtDate(a.created_at),
      expires: fmtDate(a.expires_at),
      limits: formatLimits(a),
    };

    return {
      verdict,
      agent: card,
      publicKey: a.public_key,
      logHead: a.last_hash,
      attestation,
    };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Verify agent ${params.agentId} — Infinity` },
      {
        name: "description",
        content:
          "Check whether an AI agent is verified, who it acts for, and what it is permitted to do.",
      },
      { property: "og:title", content: `Verify agent ${params.agentId} — Infinity` },
      {
        property: "og:description",
        content: "Independent verification of AI agents from any platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <Shell>
      <Verdict tone="muted" label="Unavailable" headline="We couldn't complete this check." />
      <p className="mt-4 max-w-md text-muted-foreground">
        Verification is temporarily unavailable. Until it succeeds, treat this agent as unverified.
      </p>
    </Shell>
  ),
  component: VerifyPage,
});

const COPY: Record<Verdict, { tone: Tone; label: string; headline: string; body: string }> = {
  valid: {
    tone: "verified",
    label: "Live Infinity record",
    headline: "This credential is live.",
    body: "Infinity currently recognizes this mandate. The independent signature check and the facts it does not prove are separated below.",
  },
  frozen: {
    tone: "seal",
    label: "Frozen by owner",
    headline: "Don't trust this agent right now.",
    body: "Its owner has switched it off. Don't accept data, instructions or payments from it.",
  },
  expired: {
    tone: "seal",
    label: "Expired",
    headline: "This agent's ID has expired.",
    body: "The mandate behind it has lapsed. Ask the owner to reissue before dealing with it.",
  },
  unknown: {
    tone: "seal",
    label: "Unknown",
    headline: "No agent with this ID.",
    body: "This ID was not issued by Infinity. Don't share data or payments with it.",
  },
  sample: {
    tone: "muted",
    label: "Sample — not a real agent",
    headline: "This is what an agent credential looks like.",
    body: "A fixed example so you can see the page before issuing anything. It carries no credential and proves nothing.",
  },
};

function VerifyPage() {
  const { agentId } = Route.useParams();
  const { verdict, agent, publicKey, logHead, attestation } = Route.useLoaderData();
  const copy = COPY[verdict];

  return (
    <Shell>
      <Verdict tone={copy.tone} label={copy.label} headline={copy.headline} />
      <p className="mt-4 max-w-md text-muted-foreground">{copy.body}</p>

      {verdict === "unknown" && (
        <p className="mt-6 break-all font-mono text-sm text-muted-foreground">{agentId}</p>
      )}

      {agent && (
        <div className="mt-12 flex w-full max-w-md flex-col items-center gap-6">
          <AgentIdCard agent={agent} />

          {verdict === "sample" ? (
            <p className="w-full rounded-xl border border-dashed border-border p-5 text-left text-sm text-muted-foreground">
              A real agent shows a cryptographic check here, run in your browser against Infinity's{" "}
              <a
                href="/.well-known/jwks.json"
                className="underline underline-offset-2 hover:text-foreground"
              >
                published keys
              </a>
              .
            </p>
          ) : (
            <>
              <EvidenceSummary verdict={verdict} attestation={attestation} />
              <CredentialCheck agentId={agent.id} />
            </>
          )}

          {publicKey && (
            <dl className="w-full space-y-3 border-t border-border pt-5 text-left text-xs text-muted-foreground">
              <div>
                <dt>Agent's own signing key</dt>
                <dd className="mt-1 break-all font-mono">{publicKey}</dd>
              </div>
              {logHead && (
                <div>
                  <dt>Latest activity-log entry</dt>
                  <dd className="mt-1 break-all font-mono">{logHead}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      {verdict !== "sample" && (
        <details className="mt-12 w-full max-w-md text-left">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Check this yourself, without our website
          </summary>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed">
            {`# Signed credential and issuer keys
curl -s "https://infinity.id/api/public/credential/${agentId}"
curl -s "https://infinity.id/.well-known/jwks.json"

# Current status — the only required live call
curl -s "https://infinity.id/api/public/status/${agentId}"

# Full credential + possession test vector
curl -s "https://infinity.id/api/public/sandbox"`}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            A credential signature proves what Infinity issued. A fresh nonce and agent signature
            prove who is presenting it. The sandbox lets you test both before meeting a real agent.
          </p>
        </details>
      )}
    </Shell>
  );
}

function EvidenceSummary({
  verdict,
  attestation,
}: {
  verdict: Verdict;
  attestation: OwnerAttestation;
}) {
  const live = verdict === "valid";
  const ownerChecked = attestation.assurance !== "none";
  return (
    <section className="w-full rounded-xl border border-border bg-card p-5 text-left">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        What this page establishes
      </h2>
      <dl className="mt-4 divide-y divide-border text-sm">
        <EvidenceRow
          label="Current status"
          value={live ? "Live" : verdict === "expired" ? "Expired" : "Frozen"}
          tone={live ? "good" : "bad"}
        />
        <EvidenceRow
          label="Presenter holds agent key"
          value="Not checked on a shared page"
          tone="neutral"
        />
        <EvidenceRow
          label="Owner account identity"
          value={ownerChecked ? `${attestation.issuer} · ${attestation.assurance}` : "Not checked"}
          tone={ownerChecked ? "neutral" : "bad"}
        />
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        {describeAttestation(attestation)} A live interaction must separately challenge the
        presenter before agent identity is established.
      </p>
    </section>
  );
}

function EvidenceRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good" ? "text-verified" : tone === "bad" ? "text-seal" : "text-foreground";
  return (
    <div className="flex items-start justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium ${toneClass}`}>{value}</dd>
    </div>
  );
}

// ------------------------------------------------------------------ chrome

type Tone = "verified" | "seal" | "muted";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-serif text-2xl">
          Infinity
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Verification
        </span>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-10 text-center">
        {children}
      </main>
    </div>
  );
}

function Verdict({ tone, label, headline }: { tone: Tone; label: string; headline: string }) {
  const toneClass =
    tone === "verified" ? "text-verified" : tone === "seal" ? "text-seal" : "text-muted-foreground";
  return (
    <>
      <p className={`font-mono text-xs uppercase tracking-[0.25em] ${toneClass}`}>{label}</p>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl">{headline}</h1>
    </>
  );
}
