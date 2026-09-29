import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AgentIdCard, SAMPLE_AGENT } from "@/components/AgentIdCard";
import { joinWaitlist } from "@/lib/waitlist.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Infinity — Signed mandates for AI agents" },
      {
        name: "description",
        content:
          "Signed mandates and proof of possession for AI agents from any platform. Businesses verify credentials free, without an account or API key.",
      },
      { property: "og:title", content: "Infinity — The passport for AI agents" },
      {
        property: "og:description",
        content:
          "Give your agent a signed mandate it can prove. Any business can check it for free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const layers = [
  {
    name: "Identity",
    desc: "A signed Agent ID and mandate tied to an accountable owner.",
    phase: "Now",
  },
  { name: "Email", desc: "Its own inbox. Every message signed.", phase: "Phase 2" },
  {
    name: "Phone",
    desc: "Numbers for calls and SMS, marked as a verified agent.",
    phase: "Phase 3",
  },
  { name: "Wallet", desc: "Virtual cards with owner limits and approvals.", phase: "Phase 4" },
  { name: "Insurance", desc: "Covered when an agent gets it wrong.", phase: "Phase 5" },
];

const steps = [
  {
    n: "01",
    t: "Add your agent",
    d: "Claude Code, OpenAI, Instinct, or your own. Get an Agent ID and a signing key.",
  },
  {
    n: "02",
    t: "Set its limits",
    d: "What it may do, spend and sign, when to ask you first, and when it expires.",
  },
  {
    n: "03",
    t: "Checked independently",
    d: "A business verifies the signed mandate, challenges the agent key, and checks its live status for free.",
  },
];

function Index() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "joined" | "error">("idle");

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("sending");
    try {
      const result = await joinWaitlist({ data: { email, source: "home" } });
      setStatus(result.ok ? "joined" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-serif text-2xl">
          Infinity
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
          <Link
            to="/verify/$agentId"
            params={{ agentId: SAMPLE_AGENT.id }}
            className="hover:text-foreground"
          >
            Verify an agent
          </Link>
          <Link
            to="/agents"
            className="rounded-md bg-primary px-3.5 py-1.5 text-primary-foreground"
          >
            Owner console
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-16 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-seal">
            The trust layer for AI agents
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.05] md:text-7xl">
            Give your agent a mandate it can <em>prove.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            So legitimate agents stop getting blocked. Infinity binds an agent to an accountable
            owner and signed limits that any business can check for free.
          </p>
          <div className="mt-10 max-w-md">
            {status === "joined" ? (
              <p className="py-3 text-sm text-verified" role="status">
                You're on the list. We'll be in touch.
              </p>
            ) : (
              <form className="flex gap-2" onSubmit={requestAccess}>
                <label htmlFor="waitlist-email" className="sr-only">
                  Work email
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 rounded-md border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {status === "sending" ? "Adding…" : "Request access"}
                </button>
              </form>
            )}
            {status === "error" && (
              <p className="mt-3 text-sm text-seal" role="alert">
                We couldn't save that just now, so you are <em>not</em> on the list. Please try
                again.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <AgentIdCard agent={SAMPLE_AGENT} />
        </div>
      </section>

      <section id="how" className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <p className="font-mono text-xs text-muted-foreground">{s.n}</p>
              <h3 className="mt-3 font-serif text-3xl">{s.t}</h3>
              <p className="mt-3 text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-seal">
              Verifier integration
            </p>
            <h2 className="mt-3 font-serif text-4xl">Four checks. Only one calls us.</h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Verify the signed credential, its validity window, and the agent's possession proof
              locally. Call Infinity only to learn whether the owner has switched it off.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <a
                href="/api/public/sandbox"
                className="rounded-md bg-primary px-4 py-2.5 text-primary-foreground"
              >
                Test the full handshake
              </a>
              <a href="/openapi.json" className="rounded-md border border-border px-4 py-2.5">
                Open API contract
              </a>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-6 font-mono text-sm leading-relaxed">
            {`1  credential signature    offline
2  validity window         offline
3  proof of possession     offline
4  current status          one free call

No account. No API key. No paywall.`}
          </pre>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-serif text-4xl">Everything a person has. Built for agents.</h2>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {layers.map((l) => (
              <div
                key={l.name}
                className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-5 md:grid-cols-[200px_1fr_auto]"
              >
                <h3 className="font-serif text-2xl">{l.name}</h3>
                <p className="hidden text-muted-foreground md:block">{l.desc}</p>
                <span
                  className={`font-mono text-xs uppercase tracking-widest ${l.phase === "Now" ? "text-seal" : "text-muted-foreground"}`}
                >
                  {l.phase}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl justify-between px-6 py-8 text-sm text-muted-foreground">
          <span className="font-serif text-lg text-foreground">Infinity</span>
          <span>Neutral by design.</span>
        </div>
      </footer>
    </div>
  );
}
