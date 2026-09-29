import { createFileRoute, Link } from "@tanstack/react-router";
import { AgentIdCard, SAMPLE_AGENT, type AgentCard } from "@/components/AgentIdCard";
import { verifyAgent } from "@/lib/verify.functions";
import { fmtDate, formatLimits } from "@/lib/keys";

export const Route = createFileRoute("/verify/$agentId")({
  loader: async ({ params }) => {
    if (params.agentId === SAMPLE_AGENT.id) return { agent: SAMPLE_AGENT, sample: true, key: null as string | null, head: null as string | null };
    const a = await verifyAgent({ data: { publicId: params.agentId } });
    if (!a) return { agent: null, sample: false, key: null, head: null };
    const card: AgentCard = {
      id: a.public_id,
      name: a.name,
      source: a.source,
      owner: `${a.owner_name ?? "Owner"}${a.owner_verified ? " · verified" : " · identity check pending"}`,
      status: a.status === "valid" ? "valid" : "frozen",
      issued: fmtDate(a.created_at),
      expires: fmtDate(a.expires_at),
      limits: formatLimits(a),
    };
    return { agent: card, sample: false, key: a.public_key, head: a.last_hash };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Verify agent ${params.agentId} — Infinity` },
      { name: "description", content: "Check whether an AI agent is verified, who it acts for, and what it may do." },
      { property: "og:title", content: `Verify agent ${params.agentId} — Infinity` },
      { property: "og:description", content: "Independent verification of AI agents from any platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => <div className="p-10 text-center">Verification is temporarily unavailable.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found.</div>,
  component: VerifyPage,
});

function VerifyPage() {
  const { agentId } = Route.useParams();
  const { agent, sample, key, head } = Route.useLoaderData();
  const frozen = agent?.status === "frozen";

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-serif text-2xl">Infinity</Link>
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Verification</span>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
        {agent ? (
          <>
            <p className={`font-mono text-xs uppercase tracking-[0.25em] ${frozen ? "text-seal" : "text-verified"}`}>
              {frozen ? "Frozen by owner" : "Verified agent"}
            </p>
            <h1 className="mt-4 font-serif text-5xl">
              {frozen ? "Don't trust this agent right now." : "This agent is who it says it is."}
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              {frozen
                ? "Its owner has switched it off. Don't share data or payments with it."
                : "Issued by Infinity, an independent party. Its owner is responsible for its actions."}
            </p>
            <div className="mt-12 w-full max-w-md text-left">
              <AgentIdCard agent={agent} />
            </div>
            {sample && <p className="mt-6 text-xs text-muted-foreground">Sample agent shown for preview.</p>}
            {key && (
              <div className="mt-8 w-full max-w-md text-left text-xs text-muted-foreground">
                <p>Public key</p>
                <p className="mt-1 break-all font-mono">{key}</p>
                {head && (
                  <>
                    <p className="mt-3">Latest log entry</p>
                    <p className="mt-1 break-all font-mono">{head}</p>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-seal">Unknown</p>
            <h1 className="mt-4 font-serif text-5xl">No agent with this ID.</h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              <span className="font-mono">{agentId}</span> was not issued by Infinity. Don't share data or payments with it.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
