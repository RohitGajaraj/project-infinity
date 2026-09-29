import { createFileRoute, Link } from "@tanstack/react-router";

import { AgentIdCard, SAMPLE_AGENT, type AgentCard } from "@/components/AgentIdCard";
import { CredentialCheck } from "@/components/CredentialCheck";
import { verifyAgent } from "@/lib/verify.functions";
import { fmtDate, formatLimits } from "@/lib/keys";

type Verdict = "valid" | "frozen" | "expired" | "unknown" | "sample";

export const Route = createFileRoute("/verify/$agentId")({
  loader: async ({ params }) => {
    if (params.agentId === SAMPLE_AGENT.id) {
      return { verdict: "sample" as Verdict, agent: SAMPLE_AGENT, publicKey: null, logHead: null };
    }

    const a = await verifyAgent({ data: { publicId: params.agentId } });
    if (!a) return { verdict: "unknown" as Verdict, agent: null, publicKey: null, logHead: null };

    const expired = new Date(a.expires_at).getTime() <= Date.now();
    const verdict: Verdict = expired ? "expired" : a.status === "valid" ? "valid" : "frozen";

    const card: AgentCard = {
      id: a.public_id,
      name: a.name,
      source: a.source,
      owner: `${a.owner_name ?? "Owner"}${a.owner_verified ? " · identity verified" : " · identity not yet checked"}`,
      status: verdict === "valid" ? "valid" : "frozen",
      issued: fmtDate(a.created_at),
      expires: fmtDate(a.expires_at),
      limits: formatLimits(a),
    };

    return { verdict, agent: card, publicKey: a.public_key, logHead: a.last_hash };
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
    label: "Verified agent",
    headline: "This agent is who it says it is.",
    body: "Issued by Infinity, an independent party. Its owner is accountable for what it does.",
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
    headline: "This is what a verified agent looks like.",
    body: "A fixed example so you can see the page before issuing anything. It carries no credential and proves nothing.",
  },
};

function VerifyPage() {
  const { agentId } = Route.useParams();
  const { verdict, agent, publicKey, logHead } = Route.useLoaderData();
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
            <CredentialCheck agentId={agent.id} />
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
            {`# 1. the signed credential
curl -s /api/public/credential/${agentId}

# 2. the keys that signed it
curl -s /.well-known/jwks.json

# 3. current status (the only call you can't skip)
curl -s /api/public/status/${agentId}`}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Steps 1 and 2 are enough to prove what was issued, offline and forever. Step 3 is the
            only thing that needs us, because only the owner's off switch can change it.
          </p>
        </details>
      )}
    </Shell>
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
