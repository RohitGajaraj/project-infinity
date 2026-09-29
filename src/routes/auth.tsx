import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Infinity" },
      { name: "description", content: "Sign in to issue verified IDs to your AI agents." },
      { property: "og:title", content: "Sign in — Infinity" },
      { property: "og:description", content: "Issue verified IDs to your AI agents from any platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/agents" }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: "/agents" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/agents", data: { full_name: name } },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg(r.error.message);
  }

  const field = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto w-full max-w-5xl px-6 py-6">
        <Link to="/" className="font-serif text-2xl">Infinity</Link>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-seal">Owner console</p>
        <h1 className="mt-4 font-serif text-5xl">{mode === "in" ? "Welcome back." : "Become an owner."}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Owners are the verified people behind every agent. You're responsible for what your agents do.
        </p>

        <button onClick={google} className="mt-8 w-full rounded-md border border-border py-2.5 text-sm hover:bg-accent">
          Continue with Google
        </button>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && <input className={field} placeholder="Full legal name" value={name} onChange={(e) => setName(e.target.value)} required />}
          <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={field} type="password" placeholder="Password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "New here? Create an account" : "Already an owner? Sign in"}
        </button>
      </main>
    </div>
  );
}
