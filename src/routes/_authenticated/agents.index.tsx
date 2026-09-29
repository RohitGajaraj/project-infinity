import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/ConsoleShell";
import { OwnerAccountability } from "@/components/OwnerAccountability";
import { fmtDate } from "@/lib/keys";

export const Route = createFileRoute("/_authenticated/agents/")({
  head: () => ({
    meta: [
      { title: "Your agents — Infinity" },
      {
        name: "description",
        content: "Manage the signed credentials for agents acting on your behalf.",
      },
      { property: "og:title", content: "Your agents — Infinity" },
      {
        property: "og:description",
        content: "Manage the signed credentials for agents acting on your behalf.",
      },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("display_name").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <ConsoleShell>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {profile.data?.display_name || "Owner"} · credential console
          </p>
          <h1 className="mt-3 font-serif text-5xl">Your agents</h1>
        </div>
        <Link
          to="/agents/new"
          className="min-h-11 self-start rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground sm:self-auto"
        >
          Add agent
        </Link>
      </div>

      <OwnerAccountability />

      <div className="mt-10 border-t border-border">
        {agents.isLoading && <p className="py-10 text-sm text-muted-foreground">Loading…</p>}
        {agents.data?.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-serif text-3xl">No agents yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Bring one in from Claude Code, ChatGPT, Instinct or anywhere else.
            </p>
          </div>
        )}
        {agents.data?.map((a) => (
          <Link
            key={a.id}
            to="/agents/$id"
            params={{ id: a.id }}
            className="flex items-center justify-between border-b border-border py-5 hover:bg-accent/40"
          >
            <div>
              <p className="font-serif text-2xl">{a.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                via {a.source} · issued {fmtDate(a.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                {a.public_id}
              </span>
              <span
                className={`font-mono text-xs uppercase tracking-widest ${a.status === "valid" ? "text-verified" : "text-seal"}`}
              >
                {a.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </ConsoleShell>
  );
}
