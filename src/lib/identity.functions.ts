import { getRequest } from "@tanstack/react-start/server";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OwnerIdentityState = {
  state:
    | "not_started"
    | "starting"
    | "in_progress"
    | "verified"
    | "declined"
    | "failed"
    | "expired"
    | "unavailable";
  provider: string | null;
  method: string | null;
  assurance: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  providerConfigured: boolean;
};

export type StartOwnerIdentityResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: "not_configured" | "in_progress" | "failed"; detail: string };

type RpcResult = { data: unknown; error: { message: string; code?: string } | null };
type RpcClient = { rpc: (name: string, params?: Record<string, unknown>) => Promise<RpcResult> };

/** Begin one hosted check for the authenticated owner. No owner ID is accepted. */
export const startOwnerIdentityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StartOwnerIdentityResult> => {
    const { identityProvider } = await import("./identity-provider.server");
    const provider = identityProvider();
    if (!provider) {
      return {
        ok: false,
        reason: "not_configured",
        detail: "Owner checks are not configured on this deployment yet.",
      };
    }

    const client = context.supabase as unknown as RpcClient;
    const begun = await client.rpc("begin_owner_identity_session", { _issuer: provider.issuer });
    if (begun.error) {
      console.error("[identity] could not begin owner session", {
        code: begun.error.code,
        message: begun.error.message,
      });
      return { ok: false, reason: "failed", detail: "The identity check could not be started." };
    }

    const attempt = readAttempt(begun.data);
    if (!attempt) {
      return { ok: false, reason: "failed", detail: "The identity check could not be started." };
    }
    if (!attempt.canStart) {
      return {
        ok: false,
        reason: "in_progress",
        detail: "An owner check is already in progress. Finish it or wait for it to expire.",
      };
    }
    const attemptId = attempt.id;

    const { issuerOrigin } = await import("./issuer.server");
    const callbackUrl = new URL(
      "/agents?identity=returned",
      issuerOrigin(getRequest().url),
    ).toString();
    const started = await provider.start({ attemptId, callbackUrl });
    if (!started.ok) {
      await client.rpc("abandon_owner_identity_session", { _attempt_id: attemptId });
      return started;
    }

    const bound = await client.rpc("bind_owner_identity_session", {
      _attempt_id: attemptId,
      _provider_reference: started.reference,
    });
    if (bound.error || bound.data !== true) {
      // On a transport/database error the commit outcome is unknown; do not mark
      // the attempt failed because a successful bind may already exist. Exact
      // bind retries are idempotent at the database boundary.
      if (!bound.error) {
        await client.rpc("abandon_owner_identity_session", { _attempt_id: attemptId });
      }
      console.error("[identity] could not bind provider session", {
        code: bound.error?.code,
        message: bound.error?.message,
      });
      return {
        ok: false,
        reason: "failed",
        detail: "The hosted check was created but could not be linked safely. Please try again.",
      };
    }

    return { ok: true, redirectUrl: started.redirectUrl };
  });

/** Current accountability evidence for the authenticated owner. */
export const getOwnerIdentityState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerIdentityState> => {
    const [{ identityProvider }, client] = await Promise.all([
      import("./identity-provider.server"),
      Promise.resolve(context.supabase as unknown as RpcClient),
    ]);
    const result = await client.rpc("owner_identity_status");
    if (result.error) throw new Error(result.error.message);

    const row = readStatusRow(result.data);
    return {
      state: row?.state ?? "not_started",
      provider: row?.issuer ?? null,
      method: row?.method ?? null,
      assurance: row?.assurance ?? null,
      verifiedAt: row?.verified_at ?? null,
      expiresAt: row?.attestation_expires_at ?? null,
      updatedAt: row?.updated_at ?? null,
      providerConfigured: identityProvider() !== null,
    };
  });

function readAttempt(data: unknown): { id: string; canStart: boolean } | null {
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = value["attempt_id"];
  const canStart = value["can_start"];
  return typeof id === "string" && typeof canStart === "boolean" ? { id, canStart } : null;
}

type StatusRow = {
  state: OwnerIdentityState["state"];
  issuer: string | null;
  method: string | null;
  assurance: string | null;
  verified_at: string | null;
  attestation_expires_at: string | null;
  updated_at: string | null;
};

function readStatusRow(data: unknown): StatusRow | null {
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const allowed = new Set<OwnerIdentityState["state"]>([
    "not_started",
    "starting",
    "in_progress",
    "verified",
    "declined",
    "failed",
    "expired",
  ]);
  const state = value["state"];
  if (typeof state !== "string" || !allowed.has(state as OwnerIdentityState["state"])) return null;

  const nullable = (key: string) => (typeof value[key] === "string" ? value[key] : null);
  return {
    state: state as OwnerIdentityState["state"],
    issuer: nullable("issuer"),
    method: nullable("method"),
    assurance: nullable("assurance"),
    verified_at: nullable("verified_at"),
    attestation_expires_at: nullable("attestation_expires_at"),
    updated_at: nullable("updated_at"),
  };
}
