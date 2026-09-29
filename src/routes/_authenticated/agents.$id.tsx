import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/ConsoleShell";
import { AgentIdCard } from "@/components/AgentIdCard";
import { fmtDate, formatLimits } from "@/lib/keys";

export const Route = createFileRoute("/_authenticated/agents/$id")({
  head: () => ({
    meta: [
      { title: "Agent — Infinity" },
      { name: "description", content: "Agent ID, limits, signed activity log and off switch." },
      { property: "og:title", content: "Agent — Infinity" },
      { property: "og:description", content: "Agent ID, limits, signed activity log and off switch." },
    ],
  }),
  component: AgentDetail,
});

function AgentDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
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
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });
  const events = useQuery({
    queryKey: ["events", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_events").select("*").eq("agent_id", id).order("id", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function toggle() {
    if (!agent.data) return;
    const next = agent.data.status === "valid" ? "frozen" : "valid";
    await supabase.from("agents").update({ status: next }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["agent", id] });
    qc.invalidateQueries({ queryKey: ["events", id] });
    qc.invalidateQueries({ queryKey: ["agents"] });
  }

  if (agent.isLoading) return <ConsoleShell><p className="text-sm text-muted-foreground">Loading…</p></ConsoleShell>;
  const a = agent.data;
  if (!a) return <ConsoleShell><p className="font-serif text-3xl">Agent not found.</p></ConsoleShell>;
  const valid = a.status === "valid";

  return (
    <ConsoleShell>
      <Link to="/agents" className="text-sm text-muted-foreground hover:text-foreground">← All agents</Link>
      <div className="mt-6 grid gap-12 md:grid-cols-[1fr_1fr]">
        <div>
          <AgentIdCard
            agent={{
              id: a.public_id,
              name: a.name,
              source: a.source,
              owner: `${profile.data?.display_name ?? "You"}${profile.data?.identity_verified ? " · verified" : ""}`,
              status: valid ? "valid" : "frozen",
              issued: fmtDate(a.created_at),
              expires: fmtDate(a.expires_at),
              limits: formatLimits(a),
            }}
          />
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link to="/verify/$agentId" params={{ agentId: a.public_id }} className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">
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
                ? "Freezing instantly makes every business that checks this ID see it as frozen."
                : "This agent is frozen. Businesses checking its ID are told not to trust it."}
            </p>
            <button onClick={toggle}
              className={`mt-5 w-full rounded-md py-3 text-sm font-medium ${valid ? "bg-seal text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
              {valid ? "Freeze agent" : "Unfreeze agent"}
            </button>
          </div>

          <h2 className="mt-10 font-serif text-3xl">Signed activity log</h2>
          <p className="mt-1 text-xs text-muted-foreground">Each entry is chained to the one before it — any tampering breaks the chain.</p>
          <ol className="mt-5 border-t border-border">
            {events.data?.map((e) => (
              <li key={e.id} className="border-b border-border py-3">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{e.kind}</span>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">sha256 {e.hash}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ConsoleShell>
  );
}
