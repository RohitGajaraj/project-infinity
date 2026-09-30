import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  changeAgentKey,
  getAgentKeyHistory,
} from "@/lib/key-lifecycle.functions";
import {
  agentKeyFingerprint,
  keyChangeProofParts,
  signKeyChangeProof,
  type KeyChangeMode,
  type KeyDisposition,
} from "@/lib/key-lifecycle";
import { generateAgentKeys, importAgentSecret } from "@/lib/keys";

export type CurrentAgentKey = {
  agentId: string;
  publicId: string;
  version: number;
  publicKey: string;
  recoveryHold: boolean;
};

type PreparedKey = {
  publicKey: string;
  secretKey: string;
  fingerprint: string;
  requestId: string;
  proofExpiresAt: string;
};

const METHOD_LABEL: Record<
  "initial" | "legacy_import" | "old_key_proof" | "owner_recovery",
  string
> = {
  initial: "Initial key",
  legacy_import: "Imported at lifecycle cutover",
  old_key_proof: "Rotated with old-key continuity",
  owner_recovery: "Owner recovery — continuity not proven",
};

export function AgentKeyLifecycle({ current }: { current: CurrentAgentKey }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<KeyChangeMode>("rotate");
  const [disposition, setDisposition] = useState<KeyDisposition>("routine");
  const [reason, setReason] = useState("");
  const [currentSecret, setCurrentSecret] = useState("");
  const [prepared, setPrepared] = useState<PreparedKey | null>(null);
  const [stored, setStored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const history = useQuery({
    queryKey: ["key-history", current.agentId],
    queryFn: () => getAgentKeyHistory({ data: { agentId: current.agentId } }),
  });
  const activeKey = history.data?.find((key) => key.version === current.version);

  function clearDraft() {
    setEditing(false);
    setCurrentSecret("");
    setPrepared(null);
    setStored(false);
    setCopied(false);
    setReason("");
    setMode("rotate");
    setDisposition("routine");
  }

  async function prepare(nextMode: KeyChangeMode) {
    setMessage(null);
    setMode(nextMode);
    setDisposition(nextMode === "rotate" ? "routine" : "lost");
    setCurrentSecret("");
    setStored(false);
    setCopied(false);
    const keys = await generateAgentKeys();
    const next: PreparedKey = {
      publicKey: keys.publicKey,
      secretKey: keys.secretKey,
      fingerprint: await agentKeyFingerprint(keys.publicKey),
      requestId: crypto.randomUUID(),
      proofExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
    setPrepared(next);
    setEditing(true);
  }

  async function copySecret() {
    if (!prepared) return;
    try {
      await navigator.clipboard.writeText(prepared.secretKey);
      setCopied(true);
    } catch {
      setMessage({
        tone: "error",
        text: "Clipboard access was blocked. Select and copy the new key manually.",
      });
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!prepared || !stored) {
      setMessage({ tone: "error", text: "Store the new private key before activating it." });
      return;
    }
    if (!activeKey) {
      setMessage({ tone: "error", text: "Current key history is unavailable. Reload before changing it." });
      return;
    }
    if (reason.trim().length < 3) {
      setMessage({ tone: "error", text: "Add a short reason for the immutable key history." });
      return;
    }
    if (Date.parse(prepared.proofExpiresAt) <= Date.now()) {
      setMessage({
        tone: "error",
        text: "This prepared transition expired. Cancel and generate a fresh key.",
      });
      return;
    }
    if (mode === "rotate" && !currentSecret.trim()) {
      setMessage({
        tone: "error",
        text: "Routine rotation needs the current private key to prove continuity.",
      });
      return;
    }

    setBusy(true);
    try {
      const parts = await keyChangeProofParts({
        requestId: prepared.requestId,
        agentId: current.publicId,
        expectedVersion: current.version,
        expectedFingerprint: activeKey.fingerprint,
        newFingerprint: prepared.fingerprint,
        mode,
        disposition,
        reason: reason.trim(),
        expiresAt: prepared.proofExpiresAt,
      });
      const newPrivateKey = await importAgentSecret(prepared.secretKey);
      const newSignature = await signKeyChangeProof(newPrivateKey, "possession", parts);
      let oldSignature: string | undefined;
      if (mode === "rotate") {
        const oldPrivateKey = await importAgentSecret(currentSecret.trim());
        oldSignature = await signKeyChangeProof(oldPrivateKey, "continuity", parts);
      }

      // Clear the old secret before any network request. The strict server schema
      // accepts signatures and public material only.
      setCurrentSecret("");
      const outcome = await changeAgentKey({
        data: {
          agentId: current.agentId,
          expectedVersion: current.version,
          expectedFingerprint: activeKey.fingerprint,
          newPublicKey: prepared.publicKey,
          requestId: prepared.requestId,
          mode,
          disposition,
          changeReason: reason.trim(),
          proofExpiresAt: prepared.proofExpiresAt,
          ...(oldSignature ? { oldSignature } : {}),
          newSignature,
        },
      });
      if (!outcome.ok) throw new Error(outcome.reason);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agent", current.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["key-history", current.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["events", current.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["approvals", current.agentId] }),
      ]);
      setEditing(false);
      setMessage({
        tone: "success",
        text:
          mode === "recover"
            ? `Key v${outcome.keyVersion} replaced the lost/compromised key. The agent is frozen behind a recovery hold until that key proves possession again.`
            : `Key v${outcome.keyVersion} is active. The Agent ID and mandate did not change; older credentials are superseded.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "The key could not be changed.";
      setMessage({
        tone: "error",
        text: /agent_key_(rotation|recovery)_not_enabled/.test(text)
          ? "Key lifecycle is installed but not activated yet. No key was changed."
          : /recent_authentication_required/.test(text)
            ? "Recovery needs a fresh sign-in. Sign out, sign back in, then prepare a new recovery key within ten minutes."
            : /old_key_proof_invalid/.test(text)
              ? "The current private key did not match key continuity evidence. Nothing changed."
              : /new_key_proof_invalid/.test(text)
                ? "The new key could not prove possession. Cancel and generate it again."
                : /key_version_conflict/.test(text)
                  ? "The key changed in another session. Reload before trying again."
                  : text,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Agent authenticator
          </p>
          <h2 className="mt-2 font-serif text-3xl">Key v{current.version}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            The Agent ID and mandate stay stable when this authenticator changes. Old credentials
            remain signed history, but live status marks them superseded.
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void prepare("rotate")}
              className="min-h-11 rounded-md border border-border px-4 text-sm hover:bg-accent"
            >
              Rotate key
            </button>
            <button
              type="button"
              onClick={() => void prepare("recover")}
              className="min-h-11 rounded-md border border-seal/40 px-4 text-sm text-seal hover:bg-accent"
            >
              Recover key
            </button>
          </div>
        )}
      </div>

      <dl className="mt-5 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Fingerprint</dt>
          <dd className="mt-1 break-all font-mono text-xs">
            {activeKey ? `sha256:${activeKey.fingerprint}` : "Loading…"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Activated</dt>
          <dd className="mt-1">
            {activeKey ? new Date(activeKey.activated_at).toLocaleString() : "Loading…"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Method</dt>
          <dd className="mt-1">
            {activeKey ? METHOD_LABEL[activeKey.authorization_method] : "Loading…"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Evidence</dt>
          <dd className="mt-1">
            {activeKey?.continuity_proven
              ? "Prior-key continuity and new-key possession"
              : activeKey?.possession_proven
                ? "New-key possession; continuity not proven"
                : "Legacy/initial key; runtime possession is checked per interaction"}
          </dd>
        </div>
      </dl>

      {current.recoveryHold && (
        <div className="mt-5 rounded-md border border-seal/40 bg-card px-4 py-3 text-sm text-seal">
          Recovery hold active. Ordinary unfreeze is blocked until the current key answers a fresh
          service-controlled challenge. Clearing the hold does not itself unfreeze the agent.
        </div>
      )}

      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-5 rounded-md border px-4 py-3 text-sm ${
            message.tone === "error"
              ? "border-seal/30 text-seal"
              : "border-verified/30 text-verified"
          }`}
        >
          {message.text}
        </p>
      )}

      {editing && prepared && (
        <form onSubmit={submit} className="mt-6 space-y-5 border-t border-border pt-6">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">
              {mode === "rotate" ? "Routine rotation" : "Owner recovery"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "rotate"
                ? "The current key signs the transition, and the new key proves possession. This preserves cryptographic continuity."
                : "Use only when the current key is lost or compromised. Recovery does not claim continuity and forces a durable freeze hold."}
            </p>
          </div>

          {mode === "recover" && (
            <fieldset>
              <legend className="text-sm font-medium">What happened to the previous key?</legend>
              <div className="mt-2 flex gap-2">
                {(["lost", "compromised"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={disposition === value}
                    onClick={() => setDisposition(value)}
                    className={`min-h-11 rounded-full border px-4 text-sm ${
                      disposition === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {value === "lost" ? "Lost / unavailable" : "Possibly compromised"}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="rounded-lg border border-seal/40 bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">New private key — shown once</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Store it in the target runtime. Infinity receives only signatures and the public
                  key. Copying may leave it in clipboard history.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-seal">Secret</span>
            </div>
            <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
              {prepared.secretKey}
            </pre>
            <button
              type="button"
              onClick={() => void copySecret()}
              className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm hover:bg-accent"
            >
              {copied ? "New key copied" : "Copy new private key"}
            </button>
            <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">
              New fingerprint: sha256:{prepared.fingerprint}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border p-4 text-sm">
            <input
              type="checkbox"
              checked={stored}
              onChange={(event) => setStored(event.target.checked)}
              className="mt-0.5"
            />
            <span>I stored the new private key. Losing it after activation requires recovery.</span>
          </label>

          {mode === "rotate" && (
            <div>
              <label htmlFor="current-agent-key" className="text-sm font-medium">
                Current private key
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Used only in this browser to sign continuity. The strict server request rejects
                private-key fields.
              </p>
              <input
                id="current-agent-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={currentSecret}
                onChange={(event) => setCurrentSecret(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 font-mono text-xs"
                placeholder="infsk_…"
              />
            </div>
          )}

          <div>
            <label htmlFor="key-change-reason" className="text-sm font-medium">
              Reason recorded in immutable history
            </label>
            <input
              id="key-change-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={240}
              className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder={mode === "rotate" ? "Scheduled credential hygiene" : "Runtime key was lost"}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || !stored}
              className="min-h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy
                ? "Verifying both sides…"
                : mode === "rotate"
                  ? `Activate key v${current.version + 1}`
                  : `Recover as key v${current.version + 1}`}
            </button>
            <button
              type="button"
              onClick={clearDraft}
              disabled={busy}
              className="min-h-11 rounded-md border border-border px-5 text-sm hover:bg-accent disabled:opacity-50"
            >
              Cancel and discard draft
            </button>
          </div>
        </form>
      )}

      <div className="mt-7 border-t border-border pt-5">
        <h3 className="text-sm font-medium">Key history</h3>
        {history.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading key history…</p>
        ) : history.data && history.data.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {history.data.map((key) => (
              <li key={key.version} className="rounded-md border border-border px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    Key v{key.version}
                    {key.version === current.version ? " · Current" : " · Superseded"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(key.activated_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{key.change_reason}</p>
                <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
                  sha256:{key.fingerprint}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Key history is unavailable until the lifecycle migration is applied.
          </p>
        )}
      </div>
    </section>
  );
}
