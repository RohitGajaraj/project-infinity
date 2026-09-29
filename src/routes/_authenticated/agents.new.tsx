import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/ConsoleShell";
import { generateAgentKeys, PERMISSIONS, SOURCES } from "@/lib/keys";

export const Route = createFileRoute("/_authenticated/agents/new")({
  head: () => ({
    meta: [
      { title: "Add an agent — Infinity" },
      { name: "description", content: "Issue a verified Agent ID to an AI agent from any platform." },
      { property: "og:title", content: "Add an agent — Infinity" },
      { property: "og:description", content: "Issue a verified Agent ID to an AI agent from any platform." },
    ],
  }),
  component: NewAgent,
});

function NewAgent() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [source, setSource] = useState(SOURCES[0]);
  const [perms, setPerms] = useState<string[]>(["Send email"]);
  const [spend, setSpend] = useState(200);
  const [approve, setApprove] = useState(50);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ id: string; publicId: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const keys = await generateAgentKeys();
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("agents")
        .insert({
          owner_id: u.user!.id,
          name,
          source,
          public_key: keys.publicKey,
          permissions: perms,
          monthly_spend_limit: spend,
          approval_above: approve,
        })
        .select("id, public_id")
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["agents"] });
      setIssued({ id: data.id, publicId: data.public_id, secret: keys.secretKey });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  const field = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground";

  if (issued) {
    return (
      <ConsoleShell>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-verified">Agent ID issued</p>
        <h1 className="mt-3 font-serif text-5xl">{name} is now verified.</h1>
        <div className="mt-10 max-w-2xl space-y-6">
          <div>
            <p className="text-xs text-muted-foreground">Agent ID (public)</p>
            <p className="mt-1 font-mono text-lg">{issued.publicId}</p>
          </div>
          <div className="rounded-lg border border-seal/40 p-5">
            <p className="text-sm font-medium">Secret key — shown once</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Give this to your agent. We only keep the matching public key, so we can't show it again.
            </p>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-3 font-mono text-xs">{issued.secret}</pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(issued.secret);
                setCopied(true);
              }}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              {copied ? "Copied" : "Copy secret key"}
            </button>
          </div>
          <Link to="/agents/$id" params={{ id: issued.id }} className="inline-block rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            I've saved it — open agent
          </Link>
        </div>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">New Agent ID</p>
      <h1 className="mt-3 font-serif text-5xl">Add an agent</h1>
      <form onSubmit={submit} className="mt-10 max-w-xl space-y-8">
        <div className="space-y-2">
          <label className="text-sm">Name</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Atlas" required maxLength={60} />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Where does it run?</label>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button type="button" key={s} onClick={() => setSource(s)}
                className={`rounded-full border px-3 py-1 text-sm ${source === s ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm">What may it do?</label>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={perms.includes(p)} onChange={(e) => setPerms(e.target.checked ? [...perms, p] : perms.filter((x) => x !== p))} />
                {p}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm">Monthly spend limit ($)</label>
            <input type="number" min={0} className={field} value={spend} onChange={(e) => setSpend(+e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Ask me above ($)</label>
            <input type="number" min={0} className={field} value={approve} onChange={(e) => setApprove(+e.target.value)} />
          </div>
        </div>
        {err && <p className="text-sm text-seal">{err}</p>}
        <button disabled={busy} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy ? "Issuing…" : "Issue Agent ID"}
        </button>
      </form>
    </ConsoleShell>
  );
}
