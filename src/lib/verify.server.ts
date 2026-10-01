import { publicClient } from "./supabase-public.server";
import type { Database } from "@/integrations/supabase/types";

export type VerifiedAgent = Database["public"]["Functions"]["verify_agent"]["Returns"][number] & {
  owner_attestation_expires_at?: string | null;
  mandate_version?: number;
  mandate_issued_at?: string;
  credential_revision?: string;
  key_version?: number;
  key_activated_at?: string;
  key_fingerprint?: string;
  key_authorization_method?: string;
  key_continuity_proven?: boolean;
  key_possession_proven?: boolean;
  credential_state_issued_at?: string;
  key_recovery_hold_version?: number | null;
};

/**
 * The single read path for public verification.
 *
 * Goes through the security-definer `verify_agent` function rather than the
 * tables, so anonymous callers can learn an agent's status without any table
 * being readable by `anon`.
 */
export async function lookupAgent(publicId: string): Promise<VerifiedAgent | null> {
  const { data, error } = await publicClient().rpc("verify_agent", { _public_id: publicId });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export function mandateLifecycle(agent: VerifiedAgent): {
  version: number;
  issuedAt: string;
  revision: string;
} | null {
  if (
    !Number.isInteger(agent.mandate_version) ||
    (agent.mandate_version ?? 0) < 1 ||
    typeof agent.mandate_issued_at !== "string" ||
    !Number.isFinite(Date.parse(agent.mandate_issued_at)) ||
    typeof agent.credential_revision !== "string" ||
    !/^[0-9a-f]{64}$/.test(agent.credential_revision)
  ) {
    return null;
  }
  return {
    version: agent.mandate_version!,
    issuedAt: agent.mandate_issued_at,
    revision: agent.credential_revision,
  };
}

export type AgentKeyLifecycle = {
  version: number;
  activatedAt: string;
  fingerprint: string;
  authorizationMethod: "initial" | "legacy_import" | "old_key_proof" | "owner_recovery";
  continuityProven: boolean;
  possessionProven: boolean;
  stateIssuedAt: string;
  recoveryHoldVersion: number | null;
};

export function keyLifecycle(agent: VerifiedAgent): AgentKeyLifecycle | null {
  const method = agent.key_authorization_method;
  if (
    !Number.isInteger(agent.key_version) ||
    (agent.key_version ?? 0) < 1 ||
    typeof agent.key_activated_at !== "string" ||
    !Number.isFinite(Date.parse(agent.key_activated_at)) ||
    typeof agent.key_fingerprint !== "string" ||
    !/^[0-9a-f]{64}$/.test(agent.key_fingerprint) ||
    !["initial", "legacy_import", "old_key_proof", "owner_recovery"].includes(method ?? "") ||
    typeof agent.key_continuity_proven !== "boolean" ||
    typeof agent.key_possession_proven !== "boolean" ||
    typeof agent.credential_state_issued_at !== "string" ||
    !Number.isFinite(Date.parse(agent.credential_state_issued_at))
  ) {
    return null;
  }
  return {
    version: agent.key_version!,
    activatedAt: agent.key_activated_at,
    fingerprint: agent.key_fingerprint,
    authorizationMethod: method as AgentKeyLifecycle["authorizationMethod"],
    continuityProven: agent.key_continuity_proven,
    possessionProven: agent.key_possession_proven,
    stateIssuedAt: agent.credential_state_issued_at,
    recoveryHoldVersion:
      Number.isInteger(agent.key_recovery_hold_version) &&
      (agent.key_recovery_hold_version ?? 0) > 0
        ? agent.key_recovery_hold_version!
        : null,
  };
}
