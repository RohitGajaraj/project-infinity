import { createFileRoute, Link } from "@tanstack/react-router";
import { AgentIdCard, SAMPLE_AGENT } from "@/components/AgentIdCard";

export const Route = createFileRoute("/verify/$agentId")({
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
  component: VerifyPage,
});

function VerifyPage() {
  const { agentId } = Route.useParams();
  const agent = agentId === SAMPLE_AGENT.id ? SAMPLE_AGENT : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-serif text-2xl">Infinity</Link>
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Verification</span>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
        {agent ? (
          <>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-verified">Verified agent</p>
            <h1 className="mt-4 font-serif text-5xl">This agent is who it says it is.</h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Issued by Infinity, an independent party. Its owner is verified and responsible for its actions.
            </p>
            <div className="mt-12 w-full max-w-md text-left">
              <AgentIdCard agent={agent} />
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Sample agent shown for preview.</p>
          </>
        ) : (
          <>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-seal">Unknown</p>
            <h1 className="mt-4 font-serif text-5xl">No agent with this ID.</h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              <span className="font-mono">{agentId}</span> was not issued by Infinity. Don't share data or payments
              with it.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
