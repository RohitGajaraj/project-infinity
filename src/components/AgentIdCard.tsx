export type AgentCard = {
  id: string;
  name: string;
  source: string;
  owner: string;
  status: "valid" | "frozen" | "expired";
  mandateVersion?: number;
  issued: string;
  expires: string;
  limits: string[];
};

export const SAMPLE_AGENT: AgentCard = {
  id: "inf_7Q2K-9XRM-4LTB",
  name: "Atlas",
  source: "Claude Code",
  owner: "Rohit S. · self-declared sample label",
  status: "valid",
  issued: "29 Sep 2026",
  expires: "29 Mar 2027",
  limits: ["Send email", "Book appointments", "Spend up to $200 / month", "Ask owner above $50"],
};

export function AgentIdCard({ agent }: { agent: AgentCard }) {
  const valid = agent.status === "valid";
  const seal = valid ? "Valid" : agent.status === "expired" ? "Expired" : "Frozen";
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-7 text-card-foreground">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Infinity · Agent passport
            {agent.mandateVersion ? ` · Mandate v${agent.mandateVersion}` : ""}
          </p>
          <h3 className="mt-3 font-serif text-4xl leading-none">{agent.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">via {agent.source}</p>
        </div>
        <div
          className={`flex h-16 w-16 rotate-[-8deg] items-center justify-center rounded-full border-2 text-center font-mono text-[9px] font-medium uppercase leading-tight tracking-widest ${
            valid ? "border-verified text-verified" : "border-seal text-seal"
          }`}
        >
          {seal}
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Owner</dt>
          <dd className="mt-0.5">{agent.owner}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Issued / expires</dt>
          <dd className="mt-0.5">
            {agent.issued} – {agent.expires}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Permitted</dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {agent.limits.map((l) => (
              <span key={l} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                {l}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      <p className="mt-6 border-t border-dashed border-border pt-4 font-mono text-xs tracking-wider text-muted-foreground">
        {agent.id}
      </p>
    </div>
  );
}
